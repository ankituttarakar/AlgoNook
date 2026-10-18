import { assertSafeTarget, getAuthStatePath, validateAuthState } from './qa-safety.js';

export default async function globalSetup() {
  const { url, target } = assertSafeTarget();
  const authPath = getAuthStatePath();
  validateAuthState(authPath, url);
  console.log(`QA target validated (${target}); dedicated Clerk state and isolation checks passed.`);
}
