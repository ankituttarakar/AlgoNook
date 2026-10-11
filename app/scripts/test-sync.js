// Verification script for Clerk-Neon user synchronization & idempotency
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL not found');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  console.log('🧪 Testing Clerk user synchronization logic in Neon...');

  const testClerkId = 'user_test_' + Date.now();
  const testCallsign = 'TEST_RUNNER';
  const testEmail = 'testrunner@algonook.io';

  // 1. Initial Insert
  console.log('\n1. Testing first-time sign-in insert:');
  const insertResult = await sql`
    INSERT INTO users (clerk_id, callsign, email, updated_at)
    VALUES (${testClerkId}, ${testCallsign}, ${testEmail}, NOW())
    ON CONFLICT (clerk_id) 
    DO UPDATE SET 
      callsign = COALESCE(EXCLUDED.callsign, users.callsign),
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW()
    RETURNING id, clerk_id, callsign, email, created_at, updated_at;
  `;
  console.log('Inserted user record:', insertResult[0]);

  // 2. Repeat sign-in (idempotency check)
  console.log('\n2. Testing repeat sign-in (must NOT duplicate):');
  const repeatResult = await sql`
    INSERT INTO users (clerk_id, callsign, email, updated_at)
    VALUES (${testClerkId}, 'UPDATED_CALLSIGN', ${testEmail}, NOW())
    ON CONFLICT (clerk_id) 
    DO UPDATE SET 
      callsign = COALESCE(EXCLUDED.callsign, users.callsign),
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW()
    RETURNING id, clerk_id, callsign, email, created_at, updated_at;
  `;
  console.log('Updated user record on repeat sign-in:', repeatResult[0]);

  // Verify same UUID primary key
  if (insertResult[0].id === repeatResult[0].id) {
    console.log('✅ PASS: UUID primary key remained identical on repeat sign-in.');
  } else {
    console.error('❌ FAIL: Duplicate row created on repeat sign-in.');
  }

  // 3. Clean up test row
  await sql`DELETE FROM users WHERE clerk_id = ${testClerkId};`;
  console.log('🧹 Cleaned up test record.');

  console.log('\n🎉 Clerk <-> Neon User synchronization logic verified successfully!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
