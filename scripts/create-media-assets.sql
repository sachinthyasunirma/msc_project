CREATE TABLE IF NOT EXISTS media_asset (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  storage_key text NOT NULL,
  original_file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  alt_text text,
  caption text,
  is_primary boolean NOT NULL DEFAULT false,
  source_type text NOT NULL DEFAULT 'OWNED',
  copyright_owner text,
  creator_name text,
  source_url text,
  license_code text,
  license_url text,
  attribution_text text,
  commercial_use_allowed boolean,
  derivatives_allowed boolean,
  review_status text NOT NULL DEFAULT 'PENDING',
  review_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_by text REFERENCES "user"(id) ON DELETE SET NULL,
  removed_by text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at timestamp,
  removed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_asset_storage_key ON media_asset(storage_key);
CREATE INDEX IF NOT EXISTS idx_media_asset_company ON media_asset(company_id);
CREATE INDEX IF NOT EXISTS idx_media_asset_entity ON media_asset(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_asset_primary ON media_asset(entity_type, entity_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_media_asset_review ON media_asset(review_status);
