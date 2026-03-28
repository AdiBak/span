-- When a member finishes the registration form (registration_complete becomes true),
-- set start_date to "today" in US/Eastern if exec never set one.
-- Works regardless of how the row is updated (RPC or future paths).

CREATE OR REPLACE FUNCTION public.members_set_start_date_on_registration_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.registration_complete IS TRUE
     AND (OLD.registration_complete IS DISTINCT FROM TRUE)
     AND NEW.start_date IS NULL THEN
    NEW.start_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_start_date_on_registration ON public.members;

CREATE TRIGGER trg_members_start_date_on_registration
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.members_set_start_date_on_registration_complete();

COMMENT ON FUNCTION public.members_set_start_date_on_registration_complete() IS
  'Sets members.start_date on first transition to registration_complete when start_date was not set by an exec.';

-- Best-effort backfill: use last updated_at (Eastern calendar date) when we have no better signal.
UPDATE public.members
SET start_date = (updated_at AT TIME ZONE 'America/New_York')::date
WHERE registration_complete IS TRUE
  AND start_date IS NULL
  AND updated_at IS NOT NULL;
