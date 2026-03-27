-- Idempotent cleanup: older DBs may still have bill_assignment_assignees_is_empty from before claim policy was redesigned.
DROP FUNCTION IF EXISTS public.bill_assignment_assignees_is_empty(uuid);
