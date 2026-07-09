-- Annual member school-grade advancement (May 31 each year).
-- Standard ladder: Freshman → Sophomore → Junior → Senior → Collegiate/Graduate.
-- Custom / empty grades are left unchanged. Idempotent per calendar school_year.

CREATE TABLE IF NOT EXISTS public.member_grade_advance_runs (
  school_year INTEGER PRIMARY KEY,
  members_updated INTEGER NOT NULL DEFAULT 0,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.member_grade_advance_runs IS
  'One row per calendar year when advance_member_school_grades ran (May 31 rollover).';

ALTER TABLE public.member_grade_advance_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_grade_advance_runs_exec_select" ON public.member_grade_advance_runs;
CREATE POLICY "member_grade_advance_runs_exec_select"
  ON public.member_grade_advance_runs
  FOR SELECT
  TO authenticated
  USING (public.auth_is_policy_exec());

CREATE OR REPLACE FUNCTION public.advance_member_school_grades(
  p_school_year INTEGER DEFAULT NULL,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_year INTEGER;
  v_updated INTEGER;
BEGIN
  v_year := COALESCE(p_school_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  IF EXISTS (
    SELECT 1 FROM public.member_grade_advance_runs r WHERE r.school_year = v_year
  ) AND NOT COALESCE(p_force, false) THEN
    RETURN jsonb_build_object(
      'school_year', v_year,
      'updated', 0,
      'already_ran', true
    );
  END IF;

  UPDATE public.members
  SET grade = CASE btrim(grade)
    WHEN 'HS Freshman' THEN 'HS Sophomore'
    WHEN 'HS Sophomore' THEN 'HS Junior'
    WHEN 'HS Junior' THEN 'HS Senior'
    WHEN 'HS Senior' THEN 'Collegiate/Graduate'
    ELSE grade
  END
  WHERE grade IS NOT NULL
    AND btrim(grade) IN (
      'HS Freshman',
      'HS Sophomore',
      'HS Junior',
      'HS Senior'
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  INSERT INTO public.member_grade_advance_runs (school_year, members_updated, ran_at)
  VALUES (v_year, v_updated, now())
  ON CONFLICT (school_year) DO UPDATE
    SET members_updated = EXCLUDED.members_updated,
        ran_at = EXCLUDED.ran_at;

  RETURN jsonb_build_object(
    'school_year', v_year,
    'updated', v_updated,
    'already_ran', false
  );
END;
$$;

COMMENT ON FUNCTION public.advance_member_school_grades(integer, boolean) IS
  'Bump standard HS member grades one step. Runs once per school_year unless p_force. Collegiate/Graduate and custom grades unchanged.';

REVOKE ALL ON FUNCTION public.advance_member_school_grades(integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_member_school_grades(integer, boolean) TO service_role;

-- One-time: advance everyone for the 2026 school-year rollover (Joel request).
SELECT public.advance_member_school_grades(2026, false);

-- Schedule yearly on May 31 at 12:00 UTC (requires pg_cron on the Supabase project).
DO $cron$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance-member-grades-may-31') THEN
      PERFORM cron.unschedule(
        (SELECT jobid FROM cron.job WHERE jobname = 'advance-member-grades-may-31' LIMIT 1)
      );
    END IF;

    PERFORM cron.schedule(
      'advance-member-grades-may-31',
      '0 12 31 5 *',
      $job$SELECT public.advance_member_school_grades();$job$
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR undefined_object OR invalid_schema_name THEN
    RAISE NOTICE 'pg_cron not available; schedule advance_member_school_grades manually each May 31 or enable pg_cron in Supabase.';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END;
$cron$;
