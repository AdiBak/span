-- Quick fix for Lauren Gonzalez-Perez's registration_complete status
-- Run this in Supabase SQL Editor to fix her account

UPDATE public.members
SET registration_complete = false
WHERE email = 'lauren.gonzalez-perez@spanationwide.org'
  OR email LIKE '%lauren%gonzalez%perez%';

-- Verify the fix:
SELECT 
  first_name,
  last_name,
  email,
  registration_complete,
  user_id,
  image
FROM public.members
WHERE email = 'lauren.gonzalez-perez@spanationwide.org'
  OR email LIKE '%lauren%gonzalez%perez%';

