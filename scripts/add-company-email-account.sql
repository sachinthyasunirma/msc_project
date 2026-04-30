CREATE TABLE IF NOT EXISTS company_email_account (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  code text NOT NULL,
  display_name text NOT NULL,
  email_address text NOT NULL,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 993,
  secure boolean NOT NULL DEFAULT true,
  mailbox text NOT NULL DEFAULT 'INBOX',
  is_active boolean NOT NULL DEFAULT true,
  is_available_for_pre_tour_ai boolean NOT NULL DEFAULT true,
  is_default_for_pre_tour_ai boolean NOT NULL DEFAULT false,
  last_connection_status text NOT NULL DEFAULT 'NEVER_TESTED',
  last_connection_error text,
  last_connected_at timestamp,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_by_name text,
  updated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_by_name text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_email_account_company_code
  ON company_email_account(company_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_email_account_company_email
  ON company_email_account(company_id, email_address);

CREATE INDEX IF NOT EXISTS idx_company_email_account_company
  ON company_email_account(company_id);

CREATE INDEX IF NOT EXISTS idx_company_email_account_company_active
  ON company_email_account(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_company_email_account_company_ai
  ON company_email_account(company_id, is_available_for_pre_tour_ai, is_default_for_pre_tour_ai);
