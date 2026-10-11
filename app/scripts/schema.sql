-- AlgoNook — Initial PostgreSQL Schema
-- Tables: users, user_progress, mission_progress, skill_mastery, mission_attempts,
--         topic_progress, learning_events, code_execution_admission

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(128),
  callsign VARCHAR(32) NOT NULL DEFAULT 'OPERATOR',
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Progress (global stats like XP, level, sound settings, boot status)
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  sound BOOLEAN NOT NULL DEFAULT TRUE,
  booted BOOLEAN NOT NULL DEFAULT FALSE,
  reset_generation BIGINT NOT NULL DEFAULT 0 CONSTRAINT ck_user_progress_reset_generation CHECK (reset_generation >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Mission Progress (completed missions, best stars, lowest mistakes)
CREATE TABLE IF NOT EXISTS mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id VARCHAR(64) NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  mistakes INTEGER DEFAULT 0,
  cleared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_mission UNIQUE (user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_mission_progress_user ON mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_progress_mission ON mission_progress(mission_id);

-- 4. Skill Mastery (5-tier DSA mastery, hint levels, review schedule)
CREATE TABLE IF NOT EXISTS skill_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id VARCHAR(64) NOT NULL,
  mastery_level VARCHAR(32) NOT NULL DEFAULT 'introduced' CHECK (mastery_level IN ('introduced', 'guided', 'practicing', 'independent', 'retained')),
  attempts INTEGER NOT NULL DEFAULT 0,
  successful_independent_solves INTEGER NOT NULL DEFAULT 0,
  highest_hint_level_revealed INTEGER NOT NULL DEFAULT 0,
  total_hints_used INTEGER NOT NULL DEFAULT 0,
  ladder_reveals JSONB DEFAULT '[0, 0, 0, 0, 0, 0]'::jsonb,
  last_practiced_at TIMESTAMPTZ,
  review_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_mastery_user ON skill_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_mastery_review_due ON skill_mastery(user_id, review_due_at);

-- 5. Mission Attempts (detailed per-run telemetry and learning logs)
CREATE TABLE IF NOT EXISTS mission_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id VARCHAR(64) NOT NULL,
  skill_id VARCHAR(64),
  stars INTEGER NOT NULL DEFAULT 0,
  mistakes INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  max_hint_level INTEGER NOT NULL DEFAULT 0,
  explanation_correct BOOLEAN DEFAULT FALSE,
  transfer_passed BOOLEAN DEFAULT FALSE,
  is_replay BOOLEAN NOT NULL DEFAULT FALSE,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mission_attempts_user_mission ON mission_attempts(user_id, mission_id);

-- 6. Topic/Stage Progress (per-node stage completion for the learning loop)
CREATE TABLE IF NOT EXISTS topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id VARCHAR(64) NOT NULL,
  stages JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_topic UNIQUE (user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_progress_user ON topic_progress(user_id);

-- 7. Validated learning event ledger. Aggregate tables above remain the
-- hydration snapshot; new progression changes are only written with an event.
CREATE TABLE IF NOT EXISTS learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key UUID NOT NULL,
  generation BIGINT NOT NULL DEFAULT 0 CONSTRAINT ck_learning_events_generation CHECK (generation >= 0),
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
  CONSTRAINT uq_learning_event_generation_idempotency UNIQUE (user_id, generation, idempotency_key),
  CONSTRAINT uq_learning_event_generation_key UNIQUE (user_id, generation, event_type, event_key)
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_created
  ON learning_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_skill
  ON learning_events(user_id, skill_id, created_at);

-- 8. Bounded code-execution admission state, keyed only by verified Clerk IDs.
CREATE TABLE IF NOT EXISTS code_execution_admission (
  clerk_user_id VARCHAR(128) PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  active_leases JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(active_leases) = 'array' AND jsonb_array_length(active_leases) <= 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
