-- Fix 42P17 on bill_assignment_assignees: nested RLS between claim_insert ↔ bill_assignments policies.
-- (is_empty + EXISTS on bill_assignments both re-entered RLS.) Apply after bill_assignments_open_pool_multi_assignees.sql.

CREATE OR REPLACE FUNCTION public.bill_assignment_assignees_can_claim_pool_insert(p_assignment_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid() AND m.member_id = p_member_id
    )
    AND EXISTS (
      SELECT 1 FROM public.bill_assignments ba
      WHERE ba.assignment_id = p_assignment_id AND ba.status = 'available'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.bill_assignment_assignees baa
      WHERE baa.assignment_id = p_assignment_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.bill_assignment_assignees_can_claim_pool_insert(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "bill_assignment_assignees_member_select" ON public.bill_assignment_assignees;
DROP POLICY IF EXISTS "bill_assignment_assignees_claim_insert" ON public.bill_assignment_assignees;

CREATE POLICY "bill_assignment_assignees_member_select"
  ON public.bill_assignment_assignees
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT member_id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "bill_assignment_assignees_claim_insert"
  ON public.bill_assignment_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.bill_assignment_assignees_can_claim_pool_insert(assignment_id, member_id)
  );

DROP FUNCTION IF EXISTS public.bill_assignment_assignees_is_empty(uuid);
