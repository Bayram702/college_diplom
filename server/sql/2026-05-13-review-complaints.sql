BEGIN;

ALTER TABLE college_reviews
  DROP CONSTRAINT IF EXISTS college_reviews_status_check;

ALTER TABLE college_reviews
  ADD CONSTRAINT college_reviews_status_check
  CHECK (status IN ('published', 'rejected', 'hidden_by_complaint'));

CREATE TABLE IF NOT EXISTS review_complaints (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES college_reviews(id) ON DELETE CASCADE,
  reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(30) NOT NULL,
  comment TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT review_complaints_reason_check
    CHECK (reason IN ('spam', 'offensive', 'false_info', 'personal_data', 'other')),
  CONSTRAINT review_complaints_status_check
    CHECK (status IN ('pending', 'resolved_hidden', 'resolved_rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_complaints_active
  ON review_complaints (review_id, reporter_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_review_complaints_status_created
  ON review_complaints (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_complaints_review_id
  ON review_complaints (review_id);

COMMIT;
