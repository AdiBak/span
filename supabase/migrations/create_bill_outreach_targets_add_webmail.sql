-- Outreach targets: optional webmail / contact form link (LegiScan shows this as "Webmail" on bill sponsor pages).
-- Filename sorts after create_bill_outreach_targets.sql

ALTER TABLE public.bill_outreach_targets
  ADD COLUMN IF NOT EXISTS contact_webmail_url TEXT;

COMMENT ON COLUMN public.bill_outreach_targets.contact_webmail_url IS 'Webmail/contact form URL (LegiScan sponsor contact link) when available, or entered by exec.';

