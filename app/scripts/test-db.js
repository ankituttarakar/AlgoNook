import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('ℹ️  DATABASE_URL is not set in environment or .env file.');
    console.log('   Add your connection string to .env (see .env.example).');
    return;
  }

  console.log('Testing connection to Neon PostgreSQL...');
  try {
    const sql = neon(dbUrl);
    const result = await sql`SELECT 1 as connected;`;
    console.log('✅ Successfully connected to Neon PostgreSQL database!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message || error);
  }
}

main();
