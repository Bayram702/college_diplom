BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

UPDATE users
SET
  phone = CASE
    WHEN phone IS NULL OR phone = '' THEN NULL
    WHEN regexp_replace(phone, '\D', '', 'g') ~ '^8[0-9]{10}$'
      THEN '+7' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
    WHEN regexp_replace(phone, '\D', '', 'g') ~ '^7[0-9]{10}$'
      THEN '+' || regexp_replace(phone, '\D', '', 'g')
    WHEN regexp_replace(phone, '\D', '', 'g') ~ '^[0-9]{10}$'
      THEN '+7' || regexp_replace(phone, '\D', '', 'g')
    ELSE phone
  END,
  passport_series = CASE
    WHEN passport_series IS NULL THEN NULL
    ELSE substring(regexp_replace(passport_series, '\D', '', 'g') from 1 for 4)
  END,
  passport_number = CASE
    WHEN passport_number IS NULL THEN NULL
    ELSE substring(regexp_replace(passport_number, '\D', '', 'g') from 1 for 6)
  END,
  avg_score = CASE WHEN avg_score IS NULL THEN NULL ELSE ROUND(avg_score::numeric, 2) END,
  last_activity_at = COALESCE(last_activity_at, last_login_at, updated_at, created_at);

UPDATE users u
SET college_id = NULL
FROM roles r
WHERE r.id = u.role_id
  AND r.name = 'applicant'
  AND u.college_id IS NOT NULL;

UPDATE applications
SET
  phone = CASE
    WHEN regexp_replace(phone, '\D', '', 'g') ~ '^8[0-9]{10}$'
      THEN '+7' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
    WHEN regexp_replace(phone, '\D', '', 'g') ~ '^7[0-9]{10}$'
      THEN '+' || regexp_replace(phone, '\D', '', 'g')
    WHEN regexp_replace(phone, '\D', '', 'g') ~ '^[0-9]{10}$'
      THEN '+7' || regexp_replace(phone, '\D', '', 'g')
    ELSE phone
  END,
  passport_series = CASE
    WHEN passport_series IS NULL THEN NULL
    ELSE substring(regexp_replace(passport_series, '\D', '', 'g') from 1 for 4)
  END,
  passport_number = CASE
    WHEN passport_number IS NULL THEN NULL
    ELSE substring(regexp_replace(passport_number, '\D', '', 'g') from 1 for 6)
  END,
  avg_score = ROUND(avg_score::numeric, 2);

UPDATE colleges
SET
  avg_score = CASE WHEN avg_score IS NULL THEN NULL ELSE ROUND(avg_score::numeric, 2) END,
  min_score = CASE WHEN min_score IS NULL THEN NULL ELSE ROUND(min_score::numeric, 2) END;

UPDATE specialties
SET avg_score_last_year = ROUND(avg_score_last_year::numeric, 2)
WHERE avg_score_last_year IS NOT NULL;

UPDATE college_specialties
SET avg_score = ROUND(avg_score::numeric, 2)
WHERE avg_score IS NOT NULL;

COMMIT;
