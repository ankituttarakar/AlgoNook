CREATE TABLE IF NOT EXISTS code_execution_admission (
  clerk_user_id VARCHAR(128) PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  active_leases JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(active_leases) = 'array' AND jsonb_array_length(active_leases) <= 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
