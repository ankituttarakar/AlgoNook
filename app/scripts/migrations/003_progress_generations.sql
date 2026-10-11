-- Additive reset-generation fencing; legacy rows remain in generation 0.
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS reset_generation BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_progress'::regclass
      AND conname = 'ck_user_progress_reset_generation'
  ) THEN
    ALTER TABLE user_progress
      ADD CONSTRAINT ck_user_progress_reset_generation CHECK (reset_generation >= 0);
  END IF;
END $$;

ALTER TABLE learning_events
  ADD COLUMN IF NOT EXISTS generation BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'learning_events'::regclass
      AND conname = 'ck_learning_events_generation'
  ) THEN
    ALTER TABLE learning_events
      ADD CONSTRAINT ck_learning_events_generation CHECK (generation >= 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'learning_events'::regclass
      AND conname = 'uq_learning_event_idempotency'
  ) THEN
    ALTER TABLE learning_events DROP CONSTRAINT uq_learning_event_idempotency;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'learning_events'::regclass
      AND conname = 'uq_learning_event_key'
  ) THEN
    ALTER TABLE learning_events DROP CONSTRAINT uq_learning_event_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'learning_events'::regclass
      AND conname = 'uq_learning_event_generation_idempotency'
  ) THEN
    ALTER TABLE learning_events
      ADD CONSTRAINT uq_learning_event_generation_idempotency
      UNIQUE (user_id, generation, idempotency_key);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'learning_events'::regclass
      AND conname = 'uq_learning_event_generation_key'
  ) THEN
    ALTER TABLE learning_events
      ADD CONSTRAINT uq_learning_event_generation_key
      UNIQUE (user_id, generation, event_type, event_key);
  END IF;
END $$;
