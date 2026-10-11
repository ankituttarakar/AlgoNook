import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(SCRIPT_DIR, 'migrations');
const BASE_SCHEMA_VERSION = '000_base_schema';

export function splitSqlStatements(source) {
  const statements = [];
  let start = 0;
  let quote = null;
  let dollarQuote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (dollarQuote) {
      if (source.startsWith(dollarQuote, index)) {
        index += dollarQuote.length - 1;
        dollarQuote = null;
      }
      continue;
    }
    if (quote) {
      if (char === quote && next === quote) {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      lineComment = true;
      index += 1;
    } else if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === '$') {
      const delimiter = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)?.[0];
      if (delimiter) dollarQuote = delimiter;
    } else if (char === ';') {
      const statement = source.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }

  if (quote || dollarQuote || blockComment) throw new Error('Migration SQL contains an unterminated quoted value or comment.');
  const finalStatement = source.slice(start).trim();
  if (finalStatement) statements.push(finalStatement);
  return statements;
}

export async function listMigrations(directory = MIGRATIONS_DIR) {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));
  const versions = new Set();
  return Promise.all(names.map(async (name) => {
    const match = name.match(/^(\d{3})_[a-z0-9_]+\.sql$/);
    if (!match || versions.has(match[1])) throw new Error(`Invalid or duplicate migration filename: ${name}`);
    versions.add(match[1]);
    const contents = await readFile(path.join(directory, name), 'utf8');
    return {
      version: match[1],
      name,
      contents,
      statements: splitSqlStatements(contents),
      checksum: createHash('sha256').update(contents).digest('hex'),
    };
  }));
}

export async function applyTrackedUnit(sql, unit, { verifyChecksum = true } = {}) {
  const existing = await sql`
    SELECT checksum FROM schema_migrations WHERE version = ${unit.version} LIMIT 1;
  `;
  if (existing.length > 0) {
    if (verifyChecksum && existing[0].checksum !== unit.checksum) {
      throw new Error(`Applied migration ${unit.version} has changed; create a new migration instead.`);
    }
    return false;
  }
  if (unit.statements.length === 0) throw new Error(`Migration ${unit.version} contains no SQL statements.`);

  const queries = [
    sql`SELECT pg_advisory_xact_lock(741928301);`,
    ...unit.statements.map((statement) => sql.query(statement)),
  ];
  queries.push(sql`
    INSERT INTO schema_migrations (version, name, checksum)
    VALUES (${unit.version}, ${unit.name}, ${unit.checksum});
  `);
  try {
    await sql.transaction(queries, { isolationLevel: 'Serializable' });
  } catch (error) {
    // If another migration process committed the same idempotent unit first,
    // accept it only when the committed checksum matches this exact file.
    const concurrent = await sql`
      SELECT checksum FROM schema_migrations WHERE version = ${unit.version} LIMIT 1;
    `;
    if (concurrent[0]?.checksum === unit.checksum) return false;
    throw error;
  }
  return true;
}

export async function applyMigrations({ databaseUrl = process.env.DATABASE_URL, createSql = neon } = {}) {
  if (!databaseUrl) throw new Error('DATABASE_URL must be set before applying migrations.');
  const sql = createSql(databaseUrl);
  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(741928301);`,
    sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  ], { isolationLevel: 'Serializable' });

  const baseContents = await readFile(path.join(SCRIPT_DIR, 'schema.sql'), 'utf8');
  const base = {
    version: BASE_SCHEMA_VERSION,
    name: 'schema.sql',
    checksum: createHash('sha256').update(baseContents).digest('hex'),
    statements: splitSqlStatements(baseContents),
  };
  const appliedBase = await applyTrackedUnit(sql, base, { verifyChecksum: false });
  if (appliedBase) console.log(`Applied ${BASE_SCHEMA_VERSION}.`);

  for (const migration of await listMigrations()) {
    const applied = await applyTrackedUnit(sql, migration);
    if (applied) console.log(`Applied ${migration.version} ${migration.name}.`);
  }
}

async function main() {
  if (process.argv.includes('--check')) {
    const migrations = await listMigrations();
    console.log(`Migration files are valid and ordered (${migrations.length} incremental migrations).`);
    return;
  }
  if (!process.env.DATABASE_URL) await import('dotenv/config');
  await applyMigrations();
  console.log('Database schema is up to date.');
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;
if (invokedPath) {
  main().catch((error) => {
    console.error('Database migration failed:', error instanceof Error ? error.message : 'Unknown error.');
    process.exitCode = 1;
  });
}
