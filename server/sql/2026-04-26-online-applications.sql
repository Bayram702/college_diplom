BEGIN;

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
  applicant_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL CHECK (phone ~ '^\+7[0-9]{10}$'),
  email VARCHAR(255) NOT NULL,
  avg_score NUMERIC(3,2) NOT NULL CHECK (avg_score >= 2.00 AND avg_score <= 5.00 AND avg_score = ROUND(avg_score, 2)),
  needs_dormitory BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  decided_at TIMESTAMP,
  decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant_id
  ON applications (applicant_id);

CREATE INDEX IF NOT EXISTS idx_applications_college_status
  ON applications (college_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_college_specialty
  ON applications (college_id, specialty_id);

CREATE OR REPLACE FUNCTION enforce_applications_constraints()
RETURNS trigger AS $$
DECLARE
  application_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO application_count
  FROM applications
  WHERE applicant_id = NEW.applicant_id;

  IF application_count >= 5 THEN
    RAISE EXCEPTION 'Превышен лимит: максимум 5 заявок на одного абитуриента';
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

DROP TRIGGER IF EXISTS trg_applications_constraints ON applications;

CREATE TRIGGER trg_applications_constraints
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_applications_constraints();

CREATE OR REPLACE FUNCTION applications_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION applications_set_updated_at();

COMMIT;
