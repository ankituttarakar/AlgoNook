// Migration to safely add clerk_id column to existing users table if not already present
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is not defined');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  console.log('📦 Running migration: Add clerk_id to users table...');

  await sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(128) UNIQUE;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
  `;

  console.log('✅ Migration completed.');

  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position;
  `;

  console.log('\n🔍 users table structure:');
  console.table(columns);
}

main().catch(err => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
