-- Bill work assignments (separate from formal bill submission / approval flow)
-- Execs create assignments; assignees (members with bills permission) complete with doc/PDF links.

CREATE TABLE public.bill_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  additional_info TEXT,
  assignee_member_id UUID NOT NULL REFERENCES public.members (member_id) ON DELETE CASCADE,
  assigned_by_member_id UUID NOT NULL REFERENCES public.members (member_id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started',
      'in_progress',
      'completed',
      'in_review',
      'approved'
    )),
  deliverable_doc_link TEXT,
  deliverable_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bill_assignments_assignee ON public.bill_assignments (assignee_member_id);
CREATE INDEX idx_bill_assignments_status ON public.bill_assignments (status);
CREATE INDEX idx_bill_assignments_created ON public.bill_assignments (created_at DESC);

COMMENT ON TABLE public.bill_assignments IS 'Exec-assigned research/work items; not the same as bills under review.';
COMMENT ON COLUMN public.bill_assignments.deliverable_pdf_url IS 'URL to proposal PDF (e.g. Drive link); optional with deliverable_doc_link.';

ALTER TABLE public.bill_assignments ENABLE ROW LEVEL SECURITY;

-- Executives (all four permissions): full access
CREATE POLICY "bill_assignments_exec_all"
  ON public.bill_assignments
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

-- Assignee: read own rows
CREATE POLICY "bill_assignments_assignee_select"
  ON public.bill_assignments
  FOR SELECT
  TO authenticated
  USING (
    assignee_member_id IN (
      SELECT member_id FROM public.members WHERE user_id = auth.uid()
    )
  );

-- Assignee: update own rows (deliverables + member-side status)
CREATE POLICY "bill_assignments_assignee_update"
  ON public.bill_assignments
  FOR UPDATE
  TO authenticated
  USING (
    assignee_member_id IN (
      SELECT member_id FROM public.members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    assignee_member_id IN (
      SELECT member_id FROM public.members WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.bill_assignments_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bill_assignments_updated_at
  BEFORE UPDATE ON public.bill_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.bill_assignments_set_updated_at();
