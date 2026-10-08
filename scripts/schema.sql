-- AlgoNook — Initial PostgreSQL Schema
-- Tables: users, user_progress, mission_progress, skill_mastery, mission_attempts

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(128) UNIQUE,
  callsign VARCHAR(32) NOT NULL DEFAULT 'OPERATOR',
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- 2. User Progress (global stats like XP, level, sound settings, boot status)
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  sound BOOLEAN NOT NULL DEFAULT TRUE,
  booted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Mission Progress (completed missions, best stars, lowest mistakes)
CREATE TABLE IF NOT EXISTS mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id VARCHAR(64) NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  mistakes INTEGER NOT NULL DEFAULT 0,
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
