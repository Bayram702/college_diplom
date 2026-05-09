BEGIN;

CREATE TABLE IF NOT EXISTS spo_specialty_catalog (
  specialty_code varchar(20) PRIMARY KEY,
  specialty_name text NOT NULL,
  sector_code varchar(20) NOT NULL,
  sector_name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spo_specialty_catalog_sector_code
  ON spo_specialty_catalog (sector_code);

COMMIT;
