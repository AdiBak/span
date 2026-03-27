-- Many assignees per bill assignment (shared task state). Replaces assignee_member_id.
-- Must run after bill_assignments_open_pool.sql (nullable assignee + available status).
-- Safe to re-run (idempotent).

CREATE TABLE IF NOT EXISTS public.bill_assignment_assignees (
  assignment_id UUID NOT NULL REFERENCES public.bill_assignments (assignment_id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members (member_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_assignment_assignees_member ON public.bill_assignment_assignees (member_id);

COMMENT ON TABLE public.bill_assignment_assignees IS
  'Members assigned to a task; all see the same bill_assignments row (deliverables, status).';

-- Pool claim INSERT policy must NOT reference bill_assignments or bill_assignment_assignees directly:
-- bill_assignments RLS policies subquery bill_assignment_assignees → mutual recursion (42P17).
-- Single SECURITY DEFINER check with row_security off reads both tables without re-entering RLS.
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

DROP FUNCTION IF EXISTS public.bill_assignment_assignees_is_empty(uuid);

-- Backfill from legacy column only if it still exists (first successful run drops it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bill_assignments'
      AND column_name = 'assignee_member_id'
  ) THEN
    INSERT INTO public.bill_assignment_assignees (assignment_id, member_id)
    SELECT assignment_id, assignee_member_id
    FROM public.bill_assignments
    WHERE assignee_member_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

DROP POLICY IF EXISTS "bill_assignments_assignee_select" ON public.bill_assignments;
DROP POLICY IF EXISTS "bill_assignments_assignee_update" ON public.bill_assignments;
DROP POLICY IF EXISTS "bill_assignments_bills_member_see_available" ON public.bill_assignments;
DROP POLICY IF EXISTS "bill_assignments_claim_update" ON public.bill_assignments;

ALTER TABLE public.bill_assignments DROP CONSTRAINT IF EXISTS bill_assignments_pool_ck;

DROP INDEX IF EXISTS idx_bill_assignments_assignee;

ALTER TABLE public.bill_assignments DROP COLUMN IF EXISTS assignee_member_id;

CREATE POLICY "bill_assignments_assignee_select"
  ON public.bill_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bill_assignment_assignees baa
      WHERE baa.assignment_id = bill_assignments.assignment_id
        AND baa.member_id IN (SELECT member_id FROM public.members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "bill_assignments_assignee_update"
  ON public.bill_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bill_assignment_assignees baa
      WHERE baa.assignment_id = bill_assignments.assignment_id
        AND baa.member_id IN (SELECT member_id FROM public.members WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bill_assignment_assignees baa
      WHERE baa.assignment_id = bill_assignments.assignment_id
        AND baa.member_id IN (SELECT member_id FROM public.members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "bill_assignments_bills_member_see_available"
  ON public.bill_assignments
  FOR SELECT
  TO authenticated
  USING (
    status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM public.bill_assignment_assignees baa WHERE baa.assignment_id = bill_assignments.assignment_id
    )
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.bills = true OR m.bills = 'true')
    )
  );

CREATE POLICY "bill_assignments_claim_update"
  ON public.bill_assignments
  FOR UPDATE
  TO authenticated
  USING (
    status = 'available'
    AND EXISTS (
      SELECT 1 FROM public.bill_assignment_assignees baa
      WHERE baa.assignment_id = bill_assignments.assignment_id
        AND baa.member_id IN (SELECT member_id FROM public.members WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    status = 'not_started'
  );

ALTER TABLE public.bill_assignment_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bill_assignment_assignees_exec_all" ON public.bill_assignment_assignees;
DROP POLICY IF EXISTS "bill_assignment_assignees_member_select" ON public.bill_assignment_assignees;
DROP POLICY IF EXISTS "bill_assignment_assignees_claim_insert" ON public.bill_assignment_assignees;

CREATE POLICY "bill_assignment_assignees_exec_all"
  ON public.bill_assignment_assignees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

-- Own rows only — do not subquery bill_assignment_assignees here (causes 42P17 recursion).
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
