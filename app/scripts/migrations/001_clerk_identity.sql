ALTER TABLE users
  ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id
  ON users(clerk_id);
