BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS passport_series VARCHAR(4),
  ADD COLUMN IF NOT EXISTS passport_number VARCHAR(6),
  ADD COLUMN IF NOT EXISTS avg_score NUMERIC(3,2);

UPDATE users
SET avg_score = ROUND(avg_score::numeric, 2)
WHERE avg_score IS NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_passport_series_format,
  DROP CONSTRAINT IF EXISTS users_passport_number_format,
  DROP CONSTRAINT IF EXISTS users_avg_score_format;

ALTER TABLE users
  ADD CONSTRAINT users_passport_series_format
    CHECK (passport_series IS NULL OR passport_series ~ '^[0-9]{4}$'),
  ADD CONSTRAINT users_passport_number_format
    CHECK (passport_number IS NULL OR passport_number ~ '^[0-9]{6}$'),
  ADD CONSTRAINT users_avg_score_format
    CHECK (avg_score IS NULL OR (avg_score >= 2.00 AND avg_score <= 5.00 AND avg_score = ROUND(avg_score, 2)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_passport
  ON users (passport_series, passport_number)
  WHERE passport_series IS NOT NULL AND passport_number IS NOT NULL;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS passport_series VARCHAR(4),
  ADD COLUMN IF NOT EXISTS passport_number VARCHAR(6);

UPDATE applications a
SET
  avg_score = ROUND(a.avg_score::numeric, 2),
  applicant_name = COALESCE(NULLIF(a.applicant_name, ''), u.name),
  passport_series = COALESCE(a.passport_series, u.passport_series),
  passport_number = COALESCE(a.passport_number, u.passport_number)
FROM users u
WHERE u.id = a.applicant_id;

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_passport_series_format,
  DROP CONSTRAINT IF EXISTS applications_passport_number_format;

ALTER TABLE applications
  ADD CONSTRAINT applications_passport_series_format
    CHECK (passport_series IS NULL OR passport_series ~ '^[0-9]{4}$'),
  ADD CONSTRAINT applications_passport_number_format
    CHECK (passport_number IS NULL OR passport_number ~ '^[0-9]{6}$');

UPDATE colleges
SET
  avg_score = ROUND(avg_score::numeric, 2),
  min_score = ROUND(min_score::numeric, 2)
WHERE avg_score IS NOT NULL OR min_score IS NOT NULL;

UPDATE specialties
SET avg_score_last_year = ROUND(avg_score_last_year::numeric, 2)
WHERE avg_score_last_year IS NOT NULL;

UPDATE college_specialties
SET avg_score = ROUND(avg_score::numeric, 2)
WHERE avg_score IS NOT NULL;

COMMIT;
