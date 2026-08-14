-- Optional contact info when HR report is about someone outside the directory.
ALTER TABLE public.hr_reports
  ADD COLUMN IF NOT EXISTS regarding_contact text;
