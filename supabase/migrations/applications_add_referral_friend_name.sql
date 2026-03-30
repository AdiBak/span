-- Optional name when applicant heard about SPAN from a friend or classmate.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS referral_friend_name text;

COMMENT ON COLUMN public.applications.referral_friend_name IS 'When referral_source is friend/classmate, the referrer''s name (applicant-provided).';
