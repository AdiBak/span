-- Persist public proposal PDF URL on bills so clients need not HEAD-probe Storage on every list load.
-- Reduces Supabase cached egress (CDN) from bills/home/dashboard traffic and crawlers.

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS proposal_pdf_url text;

COMMENT ON COLUMN public.bills.proposal_pdf_url IS
  'Public Storage URL for the proposal PDF (proposals/{state}/{name}.pdf). Set on upload; used instead of probing Storage on page load.';

DROP FUNCTION IF EXISTS public.get_bills_research();

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
  submitted_at timestamptz,
  proposal_pdf_url text
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
    b.submitted_at,
    b.proposal_pdf_url
  FROM public.bills b
  WHERE b.status IS DISTINCT FROM 'outreach_only'
  ORDER BY b.submitted_at DESC NULLS LAST, b.bill_date DESC NULLS LAST, b.bill_id DESC;
END;
$$;

COMMENT ON FUNCTION public.get_bills_research() IS
  'Returns non-internal bill fields for dashboard Research tab (excludes outreach_only stubs); requires members.bills permission.';

REVOKE ALL ON FUNCTION public.get_bills_research() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bills_research() TO authenticated;
