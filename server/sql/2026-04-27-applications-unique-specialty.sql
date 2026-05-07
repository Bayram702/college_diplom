BEGIN;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY applicant_id, college_id, specialty_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM applications
)
DELETE FROM applications
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_applicant_college_specialty
  ON applications (applicant_id, college_id, specialty_id);

COMMIT;
