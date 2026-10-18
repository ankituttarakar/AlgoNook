import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDatabaseSchema, CURRENT_SCHEMA_VERSION } from '../server/schemaHealth.mjs';
import { applyTrackedUnit, listMigrations, splitSqlStatements } from '../scripts/migrate.js';

function schemaSql({
  versions = ['000_base_schema', '001', '002', '003', CURRENT_SCHEMA_VERSION],
  missingColumns = [],
  missingIndexes = [],
  missingConstraints = [],
  hasMigrationTable = true,
} = {}) {
  return {
    query: async (statement) => {
      if (statement.includes('FROM schema_migrations')) return versions.map((version) => ({ version }));
      return [{
        has_migration_table: hasMigrationTable,
        missing_columns: JSON.stringify(missingColumns),
        missing_indexes: JSON.stringify(missingIndexes),
        missing_constraints: JSON.stringify(missingConstraints),
      }];
    },
  };
}

test('schema health accepts a fully migrated compatible schema', async () => {
  const result = await checkDatabaseSchema('postgresql://test.invalid/db', () => schemaSql());
  assert.deepEqual(result, { compatible: true });
});

test('schema health rejects an old migration version or missing critical schema objects', async () => {
  const oldVersion = await checkDatabaseSchema('postgresql://test.invalid/db', () => schemaSql({
    versions: ['000_base_schema', '001', '002', '003'],
  }));
  const missingObjects = await checkDatabaseSchema('postgresql://test.invalid/db', () => schemaSql({
    missingColumns: ['user_progress.reset_generation', 'learning_events.generation'],
    missingIndexes: ['idx_users_clerk_id'],
    missingConstraints: ['uq_learning_event_generation_key'],
  }));
  const missingMetadata = await checkDatabaseSchema('postgresql://test.invalid/db', () => schemaSql({ hasMigrationTable: false }));

  assert.deepEqual(oldVersion, { compatible: false });
  assert.deepEqual(missingObjects, { compatible: false });
  assert.deepEqual(missingMetadata, { compatible: false });
});

test('schema health preserves database failures for the API to classify separately', async () => {
  const createSql = () => {
    return { query: async () => { throw new Error('database unavailable'); } };
  };
  await assert.rejects(checkDatabaseSchema('postgresql://test.invalid/db', createSql), /database unavailable/);
});

test('migration SQL splitting preserves semicolons inside strings and dollar-quoted blocks', () => {
  const statements = splitSqlStatements(`
    CREATE TABLE example (value text DEFAULT 'a;b');
    DO $migration$
    BEGIN
      PERFORM 'inside;block';
      -- a comment; not a statement
      PERFORM 1;
    END
    $migration$;
    SELECT "quoted;identifier" FROM example;
  `);
  assert.equal(statements.length, 3);
  assert.match(statements[1], /PERFORM 1;/);
});

test('incremental migrations have ordered, unique versioned filenames and valid SQL', async () => {
  const migrations = await listMigrations();
  assert.deepEqual(migrations.map(({ version }) => version), ['001', '002', '003', '004']);
  assert.ok(migrations.every(({ statements, checksum }) => statements.length > 0 && /^[a-f0-9]{64}$/.test(checksum)));
});

test('migration metadata is committed with the migration and applied checksums are immutable', async () => {
  let applied = null;
  let transactionCount = 0;
  const sql = (strings, ...values) => {
    const statement = strings.join('?');
    if (statement.includes('SELECT checksum')) {
      return Promise.resolve(applied ? [{ checksum: applied.checksum }] : []);
    }
    return { statement, values };
  };
  sql.query = (statement) => ({ statement, values: [] });
  sql.transaction = async (queries) => {
    transactionCount += 1;
    assert.match(queries[0].statement, /pg_advisory_xact_lock/);
    assert.match(queries.at(-1).statement, /INSERT INTO schema_migrations/);
    applied = {
      version: queries.at(-1).values[0],
      checksum: queries.at(-1).values[2],
    };
  };
  const unit = {
    version: '001',
    name: '001_example.sql',
    checksum: 'a'.repeat(64),
    statements: ['ALTER TABLE example ADD COLUMN value integer'],
  };

  assert.equal(await applyTrackedUnit(sql, unit), true);
  assert.deepEqual(applied, { version: '001', checksum: unit.checksum });
  assert.equal(await applyTrackedUnit(sql, unit), false);
  assert.equal(transactionCount, 1);
  await assert.rejects(
    applyTrackedUnit(sql, { ...unit, checksum: 'b'.repeat(64) }),
    /has changed/,
  );
});
