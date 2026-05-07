CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(20),
  entity_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20);

ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS entity_id INTEGER;

ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'favorites'
      AND column_name = 'college_id'
  ) THEN
    EXECUTE $sql$
      UPDATE favorites
      SET entity_type = 'college',
          entity_id = college_id
      WHERE (entity_type IS NULL OR entity_id IS NULL)
        AND college_id IS NOT NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'favorites'
      AND column_name = 'specialty_id'
  ) THEN
    EXECUTE $sql$
      UPDATE favorites
      SET entity_type = 'specialty',
          entity_id = specialty_id
      WHERE (entity_type IS NULL OR entity_id IS NULL)
        AND specialty_id IS NOT NULL
    $sql$;
  END IF;
END $$;

DELETE FROM favorites
WHERE entity_type NOT IN ('college', 'specialty')
  OR entity_id IS NULL;

DELETE FROM favorites f
USING favorites duplicate
WHERE f.user_id = duplicate.user_id
  AND f.entity_type = duplicate.entity_type
  AND f.entity_id = duplicate.entity_id
  AND f.id > duplicate.id;

ALTER TABLE favorites
  ALTER COLUMN entity_type SET NOT NULL;

ALTER TABLE favorites
  ALTER COLUMN entity_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'favorites_entity_type_check'
      AND conrelid = 'favorites'::regclass
  ) THEN
    ALTER TABLE favorites
      ADD CONSTRAINT favorites_entity_type_check
      CHECK (entity_type IN ('college', 'specialty'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_favorites_user_id
  ON favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_entity
  ON favorites (entity_type, entity_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_user_entity
  ON favorites (user_id, entity_type, entity_id);
