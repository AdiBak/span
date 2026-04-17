-- Remove test legislator rows from the removed "Add test legislator (dummy email)" dev helper.
DELETE FROM public.bill_outreach_targets
WHERE sponsor_key = 'test:dummy-aditya-direct-email';
