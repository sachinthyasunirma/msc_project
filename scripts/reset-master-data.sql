-- Remove existing master-data records before enforcing NOT NULL code fields.
-- Run this in your target PostgreSQL database.

BEGIN;

TRUNCATE TABLE
  hotel_image,
  availability,
  room_rate,
  room_rate_header,
  room_type,
  cancellation_policy,
  season,
  hotel
RESTART IDENTITY CASCADE;

COMMIT;
