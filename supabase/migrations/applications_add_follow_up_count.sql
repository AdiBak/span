-- Track interview-invitation follow-up emails sent to invited applicants.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS follow_up_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at timestamp with time zone;

COMMENT ON COLUMN public.applications.follow_up_count IS 'Number of interview-invitation follow-up emails sent (Invited stage).';
COMMENT ON COLUMN public.applications.last_follow_up_at IS 'Timestamp of the most recent invitation follow-up email.';
