BEGIN;

CREATE TABLE IF NOT EXISTS application_history (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL CHECK (action IN ('submitted', 'status_changed', 'cancelled')),
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_application_history_application_id
  ON application_history (application_id, created_at ASC);

COMMIT;
