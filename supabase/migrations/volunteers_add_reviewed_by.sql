-- Who approved or declined volunteer hours (mirrors member_requests.reviewed_by pattern).

ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.members (member_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON COLUMN public.volunteers.reviewed_by IS 'Member (typically exec) who approved or denied this entry.';
COMMENT ON COLUMN public.volunteers.reviewed_at IS 'When the entry was approved or denied.';
