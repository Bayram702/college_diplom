BEGIN;

CREATE TABLE IF NOT EXISTS college_reviews (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  moderation_reason VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE college_reviews
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';

ALTER TABLE college_reviews
  ADD COLUMN IF NOT EXISTS moderation_reason VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'college_reviews_status_check'
      AND conrelid = 'college_reviews'::regclass
  ) THEN
    ALTER TABLE college_reviews
      ADD CONSTRAINT college_reviews_status_check
      CHECK (status IN ('published', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_college_reviews_college_id
  ON college_reviews (college_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_college_reviews_user_id
  ON college_reviews (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_college_reviews_user_college_published
  ON college_reviews (user_id, college_id)
  WHERE status = 'published';

COMMIT;
