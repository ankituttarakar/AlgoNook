// Test script for verifying user_progress creation and persistence in Neon
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  console.log('🧪 Testing user_progress persistence logic in Neon...');

  const testClerkId = 'test_user_' + Date.now();

  // 1. Create a user row
  const userResult = await sql`
    INSERT INTO users (clerk_id, callsign, email, updated_at)
    VALUES (${testClerkId}, 'GRID_TESTER', 'gridtester@algonook.io', NOW())
    RETURNING id, clerk_id, callsign;
  `;
  const userId = userResult[0].id;
  console.log('1. Created test user:', userResult[0]);

  // 2. Load progress for new user (simulate default creation)
  let existing = await sql`
    SELECT xp, level, sound, booted FROM user_progress WHERE user_id = ${userId};
  `;
  console.log('2. Initial query for user_progress (expected empty):', existing);

  if (existing.length === 0) {
    const defaultProgress = await sql`
      INSERT INTO user_progress (user_id, xp, level, sound, booted, created_at, updated_at)
      VALUES (${userId}, 0, 1, TRUE, FALSE, NOW(), NOW())
      RETURNING xp, level, sound, booted;
    `;
    console.log('2b. Default user_progress created:', defaultProgress[0]);
    if (defaultProgress[0].xp !== 0 || defaultProgress[0].level !== 1) {
      throw new Error('Default values mismatch');
    }
  }

  // 3. Save updated XP and Level (simulate gameplay XP gain)
  const newXp = 120;
  const newLevel = 2;
  const updatedProgress = await sql`
    INSERT INTO user_progress (user_id, xp, level, updated_at)
    VALUES (${userId}, ${newXp}, ${newLevel}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      xp = EXCLUDED.xp,
      level = EXCLUDED.level,
      updated_at = NOW()
    RETURNING xp, level, sound, booted;
  `;
  console.log('3. Updated user_progress:', updatedProgress[0]);
  if (updatedProgress[0].xp !== 120 || updatedProgress[0].level !== 2) {
    throw new Error('Updated values mismatch');
  }

  // 4. Reload progress (simulate page refresh / re-login)
  const reloaded = await sql`
    SELECT xp, level, sound, booted FROM user_progress WHERE user_id = ${userId};
  `;
  console.log('4. Reloaded user_progress after refresh:', reloaded[0]);
  if (reloaded[0].xp !== 120 || reloaded[0].level !== 2) {
    throw new Error('Reloaded values do not match persisted values');
  }

  // 5. Cleanup
  await sql`DELETE FROM users WHERE id = ${userId};`;
  console.log('🧹 Cleaned up test user and cascading user_progress records.');

  console.log('\n🎉 ALL user_progress persistence tests passed successfully!');
}

main().catch((err) => {
  console.error('❌ Error during test:', err);
  process.exit(1);
});
