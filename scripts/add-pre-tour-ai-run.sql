-- Adds persistent AI run tracking for Pre-Tour generation and revision flows.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/add-pre-tour-ai-run.sql

CREATE TABLE IF NOT EXISTS pre_tour_ai_run (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  code text NOT NULL,
  mode text NOT NULL DEFAULT 'CREATE',
  source_plan_id text REFERENCES pre_tour_plan(id) ON DELETE SET NULL,
  resulting_plan_id text REFERENCES pre_tour_plan(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  travel_start_date timestamp NOT NULL,
  travel_end_date timestamp NOT NULL,
  model text NOT NULL,
  request_snapshot jsonb NOT NULL,
  draft_snapshot jsonb NOT NULL,
  validation_snapshot jsonb NOT NULL,
  draft_title text NOT NULL,
  draft_day_count integer NOT NULL DEFAULT 0,
  overall_accuracy text NOT NULL DEFAULT 'low',
  master_coverage_percent integer NOT NULL DEFAULT 0,
  resolved_reference_count integer NOT NULL DEFAULT 0,
  unresolved_reference_count integer NOT NULL DEFAULT 0,
  blocking_issue_count integer NOT NULL DEFAULT 0,
  medium_issue_count integer NOT NULL DEFAULT 0,
  low_issue_count integer NOT NULL DEFAULT 0,
  can_apply boolean NOT NULL DEFAULT false,
  review_status text NOT NULL DEFAULT 'PENDING',
  review_score integer,
  review_notes text,
  created_by_user_id text,
  created_by_name text,
  applied_at timestamp,
  applied_by_user_id text,
  applied_by_name text,
  reviewed_at timestamp,
  reviewed_by_user_id text,
  reviewed_by_name text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pre_tour_ai_run_company_code
  ON pre_tour_ai_run(company_id, code);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_company
  ON pre_tour_ai_run(company_id);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_company_created
  ON pre_tour_ai_run(company_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_mode
  ON pre_tour_ai_run(mode);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_accuracy
  ON pre_tour_ai_run(overall_accuracy);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_can_apply
  ON pre_tour_ai_run(can_apply);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_review_status
  ON pre_tour_ai_run(review_status);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_source_plan
  ON pre_tour_ai_run(source_plan_id);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_result_plan
  ON pre_tour_ai_run(resulting_plan_id);

CREATE INDEX IF NOT EXISTS idx_pre_tour_ai_run_applied_at
  ON pre_tour_ai_run(applied_at);
