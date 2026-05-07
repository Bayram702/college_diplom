BEGIN;

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

DROP INDEX IF EXISTS uq_applications_applicant_college_specialty;

CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_applicant_college_specialty_active
  ON applications (applicant_id, college_id, specialty_id)
  WHERE status != 'cancelled';

CREATE OR REPLACE FUNCTION enforce_applications_constraints()
RETURNS trigger AS $$
DECLARE
  application_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO application_count
  FROM applications
  WHERE applicant_id = NEW.applicant_id
    AND status != 'cancelled';

  IF application_count >= 5 THEN
    RAISE EXCEPTION 'Превышен лимит: максимум 5 активных заявок на одного абитуриента';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = NEW.applicant_id
      AND r.name = 'applicant'
  ) THEN
    RAISE EXCEPTION 'Подача заявлений доступна только пользователям с ролью applicant';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM college_specialties cs
    JOIN specialties s ON s.id = cs.specialty_id
    JOIN colleges c ON c.id = cs.college_id
    WHERE cs.college_id = NEW.college_id
      AND cs.specialty_id = NEW.specialty_id
      AND cs.is_active = true
      AND s.status = 'active'
      AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Выбранная специальность не принадлежит колледжу или недоступна';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'password_change',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_active
  ON password_reset_codes (user_id, purpose, expires_at DESC)
  WHERE used_at IS NULL;

COMMIT;
