import { neon } from '@neondatabase/serverless';

export const CURRENT_SCHEMA_VERSION = '004';

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const SCHEMA_REQUIREMENTS = `
  WITH required_columns(table_name, column_name) AS (
    VALUES
      ('schema_migrations', 'version'),
      ('schema_migrations', 'name'),
      ('schema_migrations', 'checksum'),
      ('schema_migrations', 'applied_at'),
      ('users', 'clerk_id'),
      ('users', 'callsign'),
      ('user_progress', 'user_id'),
      ('user_progress', 'xp'),
      ('user_progress', 'level'),
      ('user_progress', 'sound'),
      ('user_progress', 'booted'),
      ('user_progress', 'reset_generation'),
      ('user_progress', 'updated_at'),
      ('mission_progress', 'user_id'),
      ('mission_progress', 'mission_id'),
      ('mission_progress', 'stars'),
      ('mission_progress', 'mistakes'),
      ('mission_progress', 'cleared_at'),
      ('skill_mastery', 'user_id'),
      ('skill_mastery', 'skill_id'),
      ('skill_mastery', 'mastery_level'),
      ('skill_mastery', 'attempts'),
      ('skill_mastery', 'successful_independent_solves'),
      ('skill_mastery', 'highest_hint_level_revealed'),
      ('skill_mastery', 'total_hints_used'),
      ('skill_mastery', 'ladder_reveals'),
      ('skill_mastery', 'review_due_at'),
      ('topic_progress', 'user_id'),
      ('topic_progress', 'node_id'),
      ('topic_progress', 'stages'),
      ('topic_progress', 'started_at'),
      ('topic_progress', 'completed_at'),
      ('mission_attempts', 'user_id'),
      ('learning_events', 'user_id'),
      ('learning_events', 'idempotency_key'),
      ('learning_events', 'generation'),
      ('learning_events', 'event_type'),
      ('learning_events', 'event_key'),
      ('learning_events', 'xp_awarded'),
      ('learning_events', 'stars_awarded'),
      ('learning_events', 'metadata'),
      ('code_execution_admission', 'clerk_user_id'),
      ('code_execution_admission', 'window_started_at'),
      ('code_execution_admission', 'request_count'),
      ('code_execution_admission', 'active_leases')
  ),
  required_indexes(index_name) AS (
    VALUES
      ('idx_users_clerk_id'),
      ('idx_learning_events_user_created'),
      ('idx_learning_events_user_skill')
  ),
  required_constraints(constraint_name) AS (
    VALUES
      ('ck_user_progress_reset_generation'),
      ('ck_learning_events_generation'),
      ('uq_learning_event_generation_idempotency'),
      ('uq_learning_event_generation_key'),
      ('code_execution_admission_request_count_check'),
      ('code_execution_admission_active_leases_check')
  )
  SELECT
    to_regclass('public.schema_migrations') IS NOT NULL AS has_migration_table,
    COALESCE((
      SELECT json_agg(required_columns.table_name || '.' || required_columns.column_name)
      FROM required_columns
      WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = required_columns.table_name
          AND column_name = required_columns.column_name
      )
    ), '[]'::json) AS missing_columns,
    COALESCE((
      SELECT json_agg(required_indexes.index_name)
      FROM required_indexes
      WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = required_indexes.index_name
      )
    ), '[]'::json) AS missing_indexes,
    COALESCE((
      SELECT json_agg(required_constraints.constraint_name)
      FROM required_constraints
      WHERE NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
          AND conname = required_constraints.constraint_name
      )
    ), '[]'::json) AS missing_constraints;
`;

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function checkDatabaseSchema(databaseUrl, createSql = neon) {
  const sql = createSql(databaseUrl);
  const inspection = await sql.query(SCHEMA_REQUIREMENTS);
  const row = Array.isArray(inspection) ? inspection[0] : null;
  if (!isRecord(row) || typeof row.has_migration_table !== 'boolean') return { compatible: false };
  if (!row.has_migration_table) return { compatible: false };

  const missingColumns = parseJsonArray(row.missing_columns);
  const missingIndexes = parseJsonArray(row.missing_indexes);
  const missingConstraints = parseJsonArray(row.missing_constraints);
  if (!missingColumns || !missingIndexes || !missingConstraints
    || missingColumns.length > 0 || missingIndexes.length > 0 || missingConstraints.length > 0) {
    return { compatible: false };
  }

  const versions = await sql.query('SELECT version FROM schema_migrations;');
  const appliedVersions = Array.isArray(versions)
    ? versions.filter(isRecord).map((item) => item.version)
    : [];
  const requiredVersions = ['000_base_schema', '001', '002', '003', CURRENT_SCHEMA_VERSION];
  return {
    compatible: requiredVersions.every((version) => appliedVersions.includes(version)),
  };
}
