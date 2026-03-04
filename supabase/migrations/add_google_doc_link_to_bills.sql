-- Add optional Google Doc (or similar) link for bill proposals so submitters can share an editable doc.
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS google_doc_link text;

COMMENT ON COLUMN public.bills.google_doc_link IS 'Link to proposal document (e.g. Google Doc) for editing; either this or a proposal PDF is required.';
