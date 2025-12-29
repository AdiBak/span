-- Confirm all existing members' emails in auth.users
-- This sets email_confirmed_at to the current timestamp for all auth users
-- whose email matches a member in the members table

-- Update auth.users to confirm emails for all members
-- Only update if email_confirmed_at is NULL (not already confirmed)
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE 
  email IN (SELECT email FROM public.members WHERE email IS NOT NULL)
  AND email_confirmed_at IS NULL;

-- Log how many users were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % user(s) to have confirmed emails', updated_count;
END $$;

