-- Adds pre_tour_plan.category_id safely for existing environments
-- and backfills values so the updated pre-tour code can run.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/add-pre-tour-category-id.sql

BEGIN;

ALTER TABLE pre_tour_plan
  ADD COLUMN IF NOT EXISTS category_id text;

-- 1) Backfill from existing pre-tour category mappings (earliest mapping per plan).
WITH mapped AS (
  SELECT DISTINCT ON (pc.plan_id)
    pc.plan_id,
    pc.category_id
  FROM pre_tour_plan_category pc
  WHERE pc.category_id IS NOT NULL
  ORDER BY pc.plan_id, pc.created_at ASC
)
UPDATE pre_tour_plan p
SET category_id = mapped.category_id
FROM mapped
WHERE p.id = mapped.plan_id
  AND p.category_id IS NULL;

-- 2) Fallback backfill: choose first active category in the same company.
UPDATE pre_tour_plan p
SET category_id = fallback.id
FROM LATERAL (
  SELECT c.id
  FROM tour_category c
  WHERE c.company_id = p.company_id
    AND c.is_active = true
  ORDER BY c.sort_order ASC, c.created_at ASC
  LIMIT 1
) AS fallback
WHERE p.category_id IS NULL;

-- 3) Add FK if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_pre_tour_plan_category_id'
  ) THEN
    ALTER TABLE pre_tour_plan
      ADD CONSTRAINT fk_pre_tour_plan_category_id
      FOREIGN KEY (category_id)
      REFERENCES tour_category(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_tour_plan_category
  ON pre_tour_plan(category_id);

-- 4) Apply NOT NULL only when data is complete.
DO $$
DECLARE missing_count bigint;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM pre_tour_plan
  WHERE category_id IS NULL;

  IF missing_count = 0 THEN
    ALTER TABLE pre_tour_plan
      ALTER COLUMN category_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'pre_tour_plan.category_id still has % NULL rows. NOT NULL not applied.', missing_count;
  END IF;
END $$;

COMMIT;

