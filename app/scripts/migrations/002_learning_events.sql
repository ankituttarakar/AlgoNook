-- Additive migration: retain all existing aggregate progress rows as
-- grandfathered history; no data is reset or backfilled as verified events.
ALTER TABLE mission_progress
  ALTER COLUMN mistakes DROP NOT NULL;

CREATE TABLE IF NOT EXISTS learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key UUID NOT NULL,
  event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('mission_completed', 'game_lab_completed', 'review_completed')),
  event_key VARCHAR(128) NOT NULL,
  mission_id VARCHAR(64),
  node_id VARCHAR(64),
  skill_id VARCHAR(64),
  problem_id VARCHAR(64),
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0 AND xp_awarded <= 1000),
  stars_awarded INTEGER NOT NULL DEFAULT 0 CHECK (stars_awarded >= 0 AND stars_awarded <= 3),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object' AND octet_length(metadata::text) <= 2048),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_learning_event_idempotency UNIQUE (user_id, idempotency_key),
  CONSTRAINT uq_learning_event_key UNIQUE (user_id, event_type, event_key)
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_created
  ON learning_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_skill
  ON learning_events(user_id, skill_id, created_at);
