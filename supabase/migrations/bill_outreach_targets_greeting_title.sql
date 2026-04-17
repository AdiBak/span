-- Honorific for email salutation (Senator / Representative) when known from Open States person or committee chamber.

ALTER TABLE public.bill_outreach_targets
  ADD COLUMN IF NOT EXISTS greeting_title TEXT;

COMMENT ON COLUMN public.bill_outreach_targets.greeting_title IS
  'Senator or Representative for formal greetings; from Open States roles or committee chamber on import.';
