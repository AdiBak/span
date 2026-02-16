-- Change bill position 'Proposed' to 'Propose' (if already applied)

UPDATE public.bills SET position = 'Propose' WHERE position = 'Proposed';

ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_position_check;

ALTER TABLE public.bills
ADD CONSTRAINT bills_position_check
CHECK (position IN ('Support', 'Oppose', 'Support If Amended', 'Propose'));
