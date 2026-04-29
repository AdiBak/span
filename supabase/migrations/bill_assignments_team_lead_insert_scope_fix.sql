-- Team leads: fix INSERT failures (403 / RLS) when creating bill_assignments.
--
-- 1) WITH CHECK mirrors exec policies: join policy_teams.lead_member_id to members.user_id = auth.uid().
-- 2) INSERT...RETURNING evaluates SELECT policies. bill_assignment_team_lead_access() runs an EXISTS
--    subquery on bill_assignments; the brand-new row may not be visible in that snapshot, so RETURNING
--    can fail even when INSERT is valid. Add a permissive SELECT for rows the lead created.

DROP POLICY IF EXISTS "bill_assignments_team_lead_insert" ON public.bill_assignments;

CREATE POLICY "bill_assignments_team_lead_insert"
  ON public.bill_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.policy_teams pt
      INNER JOIN public.members lead ON lead.member_id = pt.lead_member_id AND lead.user_id = auth.uid()
      WHERE COALESCE(pt.active, true)
    )
    AND assigned_by_member_id IN (SELECT m.member_id FROM public.members m WHERE m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "bill_assignments_team_lead_select_creator" ON public.bill_assignments;

CREATE POLICY "bill_assignments_team_lead_select_creator"
  ON public.bill_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.policy_teams pt
      INNER JOIN public.members lead ON lead.member_id = pt.lead_member_id AND lead.user_id = auth.uid()
      WHERE COALESCE(pt.active, true)
    )
    AND assigned_by_member_id IN (SELECT m.member_id FROM public.members m WHERE m.user_id = auth.uid())
  );
