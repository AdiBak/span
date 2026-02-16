-- Add 'Propose' as a valid bill position (bills that don't exist yet / not yet written)

ALTER TABLE public.bills
DROP CONSTRAINT IF EXISTS bills_position_check;

ALTER TABLE public.bills
ADD CONSTRAINT bills_position_check
CHECK (position IN ('Support', 'Oppose', 'Support If Amended', 'Propose'));

COMMENT ON COLUMN public.bills.position IS 'SPAN position: Support, Oppose, Support If Amended, or Propose (bill does not exist yet)';
