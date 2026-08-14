-- Lightweight bill rows for Outreach sponsor tracking only (not a proposal submission).
-- Excluded from public Bills page, Bill Management review queue, and Research tab.

ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_status_check;

ALTER TABLE public.bills
  ADD CONSTRAINT bills_status_check
  CHECK (
    status IS NULL
    OR status IN ('under_review', 'approved', 'modified', 'rejected', 'outreach_only')
  );

COMMENT ON COLUMN public.bills.status IS
  'under_review (pending approval), approved (live), modified, rejected, outreach_only (sponsor tracking stub — not a proposal).';

CREATE OR REPLACE FUNCTION public.get_bills_research()
RETURNS TABLE (
  bill_id integer,
  state text,
  name text,
  "position" text,
  description text,
  bill_date date,
  legiscan_link text,
  google_doc_link text,
  bill_collaborators jsonb,
  status text,
  hidden boolean,
  submitted_by uuid,
  submitted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND (m.bills = true OR m.bills = 'true')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    b.bill_id,
    b.state,
    b.name,
    b.position,
    b.description,
    b.bill_date,
    b.legiscan_link,
    b.google_doc_link,
    b.bill_collaborators,
    b.status,
    COALESCE(b.hidden, false),
    b.submitted_by,
    b.submitted_at
  FROM public.bills b
  WHERE b.status IS DISTINCT FROM 'outreach_only'
  ORDER BY b.submitted_at DESC NULLS LAST, b.bill_date DESC NULLS LAST, b.bill_id DESC;
END;
$$;

COMMENT ON FUNCTION public.get_bills_research() IS
  'Returns non-internal bill fields for dashboard Research tab (excludes outreach_only stubs); requires members.bills permission.';
