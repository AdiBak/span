-- Open pool: execs can post work with no assignee; members with Bill permission can claim (assignee set + status not_started).

ALTER TABLE public.bill_assignments DROP CONSTRAINT IF EXISTS bill_assignments_status_check;

ALTER TABLE public.bill_assignments
  ADD CONSTRAINT bill_assignments_status_check
  CHECK (
    status IN (
      'available',
      'not_started',
      'in_progress',
      'completed',
      'in_review',
      'approved'
    )
  );

ALTER TABLE public.bill_assignments ALTER COLUMN assignee_member_id DROP NOT NULL;

ALTER TABLE public.bill_assignments DROP CONSTRAINT IF EXISTS bill_assignments_pool_ck;

ALTER TABLE public.bill_assignments
  ADD CONSTRAINT bill_assignments_pool_ck
  CHECK (
    (status = 'available' AND assignee_member_id IS NULL)
    OR (status <> 'available' AND assignee_member_id IS NOT NULL)
  );

COMMENT ON COLUMN public.bill_assignments.status IS
  'available = open pool (no assignee); claimed rows use not_started..approved.';

-- Members with Bill permission can list open pool rows (read-only until claim).
CREATE POLICY "bill_assignments_bills_member_see_available"
  ON public.bill_assignments
  FOR SELECT
  TO authenticated
  USING (
    status = 'available'
    AND assignee_member_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.bills = true OR m.bills = 'true')
    )
  );

-- Claim: set self as assignee and move to not_started (single atomic update).
CREATE POLICY "bill_assignments_claim_update"
  ON public.bill_assignments
  FOR UPDATE
  TO authenticated
  USING (
    status = 'available'
    AND assignee_member_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.bills = true OR m.bills = 'true')
    )
  )
  WITH CHECK (
    status = 'not_started'
    AND assignee_member_id IN (
      SELECT member_id FROM public.members WHERE user_id = auth.uid()
    )
  );
