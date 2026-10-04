// Script to apply schema.sql to Neon PostgreSQL and verify tables
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const schemaPath = path.resolve('scripts', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('📦 Applying schema to Neon PostgreSQL...');
  
  // Split statements by semicolon and execute
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log('✅ Schema executed successfully.');

  console.log('\n🔍 Verifying created tables in information_schema:');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  console.log('Tables found in database:');
  const tableNames = tables.map(t => t.table_name);
  console.log(tableNames);

  const expectedTables = [
    'users',
    'user_progress',
    'mission_progress',
    'skill_mastery',
    'mission_attempts'
  ];

  const allExist = expectedTables.every(t => tableNames.includes(t));
  if (allExist) {
    console.log('\n🎉 ALL 5 REQUIRED TABLES VERIFIED SUCCESSFULLY:');
    expectedTables.forEach(t => console.log(`  ✓ ${t}`));
  } else {
    console.error('\n⚠️ Missing some tables:', expectedTables.filter(t => !tableNames.includes(t)));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
