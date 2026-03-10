CREATE TABLE IF NOT EXISTS pre_tour_plan_guide_allocation (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  code text NOT NULL,
  plan_id text NOT NULL REFERENCES pre_tour_plan(id) ON DELETE CASCADE,
  service_id text,
  coverage_mode text NOT NULL DEFAULT 'FULL_TOUR',
  start_day_id text REFERENCES pre_tour_plan_day(id) ON DELETE SET NULL,
  end_day_id text REFERENCES pre_tour_plan_day(id) ON DELETE SET NULL,
  language text,
  guide_basis text,
  pax integer,
  units numeric(10,2),
  rate_id text,
  currency_code text NOT NULL,
  price_mode text NOT NULL DEFAULT 'EXCLUSIVE',
  base_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  pricing_snapshot jsonb,
  title text,
  notes text,
  status text NOT NULL DEFAULT 'PLANNED',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pre_tour_guide_allocation_company_code
  ON pre_tour_plan_guide_allocation(company_id, code);

CREATE INDEX IF NOT EXISTS idx_pre_tour_guide_allocation_company
  ON pre_tour_plan_guide_allocation(company_id);

CREATE INDEX IF NOT EXISTS idx_pre_tour_guide_allocation_plan
  ON pre_tour_plan_guide_allocation(plan_id);

CREATE INDEX IF NOT EXISTS idx_pre_tour_guide_allocation_service
  ON pre_tour_plan_guide_allocation(service_id);

CREATE INDEX IF NOT EXISTS idx_pre_tour_guide_allocation_coverage
  ON pre_tour_plan_guide_allocation(coverage_mode);

CREATE INDEX IF NOT EXISTS idx_pre_tour_guide_allocation_status
  ON pre_tour_plan_guide_allocation(status);
