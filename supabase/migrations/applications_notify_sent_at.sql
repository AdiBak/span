-- Track when leadership was emailed about a new application (idempotent notify).

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS notify_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.applications.notify_sent_at IS
  'Set when notify-new-application sends the leadership alert email.';
