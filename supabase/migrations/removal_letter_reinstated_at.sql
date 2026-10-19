-- When someone is reinstated after a removal/firing letter, keep the letter
-- row for audit but show directory status as Reinstated (not "Still listed").

ALTER TABLE public.member_removal_proposals
  ADD COLUMN IF NOT EXISTS reinstated_at timestamptz;

COMMENT ON COLUMN public.member_removal_proposals.reinstated_at IS
  'Set when the member is restored to the public directory after a removal letter; letter row remains for history.';

-- Ansh: keep under Removal / firing letters sent; directory status → Reinstated.
UPDATE public.member_removal_proposals p
SET reinstated_at = COALESCE(p.reinstated_at, NOW())
FROM public.members m
WHERE m.member_id = p.member_id
  AND p.status = 'removal_letter_sent'
  AND p.reinstated_at IS NULL
  AND lower(trim(m.first_name)) = 'ansh';

UPDATE public.members m
SET active = true
WHERE lower(trim(m.first_name)) = 'ansh'
  AND EXISTS (
    SELECT 1
    FROM public.member_removal_proposals p
    WHERE p.member_id = m.member_id
      AND p.status = 'removal_letter_sent'
      AND p.reinstated_at IS NOT NULL
  );
