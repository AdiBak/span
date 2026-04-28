-- Remove "completed" from resignation workflow; map existing rows to honorable_letter_sent.

UPDATE public.member_resignations
SET status = 'honorable_letter_sent', updated_at = NOW()
WHERE status = 'completed';

UPDATE public.member_resignations
SET status = 'requested', updated_at = NOW()
WHERE status = 'directors_contacted';

ALTER TABLE public.member_resignations DROP CONSTRAINT IF EXISTS member_resignations_status_check;

ALTER TABLE public.member_resignations ADD CONSTRAINT member_resignations_status_check CHECK (status IN (
  'requested',
  'meeting_scheduled',
  'met',
  'honorable_letter_sent',
  'withdrawn'
));
