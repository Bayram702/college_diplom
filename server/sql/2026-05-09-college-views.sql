CREATE TABLE IF NOT EXISTS college_views (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  applicant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(64),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_college_views_college_id
  ON college_views (college_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_college_views_applicant_id
  ON college_views (applicant_id, viewed_at DESC);

ALTER TABLE college_views
  ALTER COLUMN applicant_id DROP NOT NULL;
