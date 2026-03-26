-- Outreach targets: optional email / phone (LegiScan when present, or manual).
-- Filename sorts after create_bill_outreach_targets.sql

ALTER TABLE public.bill_outreach_targets
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

COMMENT ON COLUMN public.bill_outreach_targets.contact_email IS 'Office/public email from LegiScan when available, or entered by exec.';
COMMENT ON COLUMN public.bill_outreach_targets.contact_phone IS 'Capitol/office phone from LegiScan when available, or entered by exec.';
