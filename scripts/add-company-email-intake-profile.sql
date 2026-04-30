CREATE TABLE IF NOT EXISTS company_email_intake_profile (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  account_code text NOT NULL,
  account_display_name text NOT NULL,
  account_email_address text NOT NULL,
  email_addresses text[] NOT NULL,
  keywords text[] NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_by_name text,
  updated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_by_name text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_email_intake_profile_company_account
  ON company_email_intake_profile(company_id, account_id);

CREATE INDEX IF NOT EXISTS idx_company_email_intake_profile_company
  ON company_email_intake_profile(company_id);

CREATE INDEX IF NOT EXISTS idx_company_email_intake_profile_company_active
  ON company_email_intake_profile(company_id, is_active);
