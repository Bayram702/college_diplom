BEGIN;

WITH applicant_rows AS (
  SELECT
    u.id,
    ROW_NUMBER() OVER (ORDER BY u.id) AS rn
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'applicant'
    AND (u.passport_series IS NULL OR u.passport_number IS NULL)
)
UPDATE users u
SET
  passport_series = LPAD((4500 + ((applicant_rows.rn - 1) / 900000)::int)::text, 4, '0'),
  passport_number = LPAD((100000 + ((applicant_rows.rn - 1) % 900000))::text, 6, '0')
FROM applicant_rows
WHERE applicant_rows.id = u.id;

UPDATE applications a
SET
  passport_series = u.passport_series,
  passport_number = u.passport_number
FROM users u
WHERE u.id = a.applicant_id
  AND (a.passport_series IS NULL OR a.passport_number IS NULL);

COMMIT;
