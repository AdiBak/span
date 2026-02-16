-- Migration: Add bill submission and approval workflow
-- This allows non-exec members to submit bills for review, and execs/policy leads to approve them

-- Step 1: Add status and submitted_by fields to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Step 1b: Add CHECK constraint for status (allowing NULL for backwards compatibility)
ALTER TABLE public.bills
DROP CONSTRAINT IF EXISTS bills_status_check;

ALTER TABLE public.bills
ADD CONSTRAINT bills_status_check 
CHECK (status IS NULL OR status IN ('under_review', 'approved', 'modified', 'rejected'));

-- Step 2: Add comments to document the fields
COMMENT ON COLUMN public.bills.status IS 'Bill status: under_review (pending approval), approved (live), modified (approved with changes), rejected';
COMMENT ON COLUMN public.bills.submitted_by IS 'Member who submitted the bill (for non-exec submissions)';
COMMENT ON COLUMN public.bills.reviewed_by IS 'Executive director or policy lead who reviewed/approved the bill';

-- Step 3: Set existing bills to 'approved' status
UPDATE public.bills SET status = 'approved' WHERE status IS NULL;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_submitted_by ON public.bills(submitted_by);
CREATE INDEX IF NOT EXISTS idx_bills_reviewed_by ON public.bills(reviewed_by);
