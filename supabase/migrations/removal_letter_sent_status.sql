-- Track firing / removal notice emails; allow status after dual-confirm workflow.
ALTER TABLE public.member_removal_proposals
  DROP CONSTRAINT IF EXISTS member_removal_proposals_status_check;

ALTER TABLE public.member_removal_proposals
  ADD CONSTRAINT member_removal_proposals_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'awaiting_second'::text,
        'dual_confirmed'::text,
        'cancelled'::text,
        'removal_letter_sent'::text
      ]
    )
  );

ALTER TABLE public.member_removal_proposals
  ADD COLUMN IF NOT EXISTS letter_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS letter_sent_by uuid REFERENCES public.members(member_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.member_removal_proposals.letter_sent_at IS
  'When the membership-ended / firing notice email was sent.';
