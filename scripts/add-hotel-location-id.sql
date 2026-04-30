-- Adds a persistent master-location relation to hotels.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/add-hotel-location-id.sql

ALTER TABLE hotel
  ADD COLUMN IF NOT EXISTS location_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hotel_location_id_transport_location_id_fk'
  ) THEN
    ALTER TABLE hotel
      ADD CONSTRAINT hotel_location_id_transport_location_id_fk
      FOREIGN KEY (location_id)
      REFERENCES transport_location(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hotel_system_location
  ON hotel(location_id);
