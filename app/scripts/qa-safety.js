import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERCEL_PREVIEW = /^[a-z0-9-]+-git-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i;

export function getTarget() {
  const raw = process.env.QA_BASE_URL || 'http://localhost:3000';
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('QA_BASE_URL must be an absolute HTTP(S) URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('QA_BASE_URL must be an HTTP(S) URL without embedded credentials.');
  }
  return url;
}

export function getAuthStatePath() {
  return path.resolve(APP_DIR, process.env.QA_AUTH_STATE || 'auth.json');
}

export function classifyTarget(url = getTarget()) {
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return 'local';
  const declared = process.env.QA_TARGET_ENV;
  if (declared && !['production', 'staging', 'preview'].includes(declared)) {
    throw new Error('QA_TARGET_ENV must be preview, staging, or production.');
  }
  if (declared === 'production') return 'production';
  if (declared === 'staging' || declared === 'preview') {
    const allowlist = (process.env[declared === 'staging' ? 'QA_STAGING_HOSTS' : 'QA_PREVIEW_HOSTS'] || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (!VERCEL_PREVIEW.test(url.hostname) && !allowlist.includes(url.hostname.toLowerCase())) {
      throw new Error(`Remote ${declared} target must be a deployment-specific Vercel Preview host or appear in ${declared === 'staging' ? 'QA_STAGING_HOSTS' : 'QA_PREVIEW_HOSTS'}.`);
    }
    return declared;
  }
  if (VERCEL_PREVIEW.test(url.hostname)) return 'preview';
  throw new Error('Remote target is ambiguous. Set QA_TARGET_ENV=preview, staging, or production explicitly.');
}

function databaseHostFromEnvFile(filename) {
  if (!fs.existsSync(filename)) return null;
  const contents = fs.readFileSync(filename, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const raw = match[1].replace(/^(['"])(.*)\1$/, '$2');
    try {
      return new URL(raw).hostname;
    } catch {
      throw new Error('The configured local DATABASE_URL is invalid; its value was not displayed.');
    }
  }
  return null;
}

function assertLocalDataIsIsolated() {
  if (process.env.QA_DATA_ENV !== 'isolated') {
    throw new Error('Local mutating QA requires QA_DATA_ENV=isolated and a dedicated development database.');
  }
  const localHost = databaseHostFromEnvFile(path.join(APP_DIR, '.env.local'));
  const defaultHost = databaseHostFromEnvFile(path.join(APP_DIR, '.env'));
  let processHost = null;
  if (process.env.DATABASE_URL) {
    try {
      processHost = new URL(process.env.DATABASE_URL).hostname;
    } catch {
      throw new Error('The shell DATABASE_URL is invalid; its value was not displayed.');
    }
  }
  if (!localHost) {
    throw new Error('Local QA requires app/.env.local to point to the isolated development database.');
  }
  if (processHost && processHost !== localHost) {
    throw new Error('Local QA refused: shell DATABASE_URL does not match app/.env.local.');
  }
  if (defaultHost && localHost === defaultHost) {
    throw new Error('Local QA refused: app/.env.local and app/.env resolve to the same database host.');
  }
  const allowedHosts = (process.env.QA_SAFE_DATABASE_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
  if (!allowedHosts.length) {
    throw new Error('Local mutating QA requires QA_SAFE_DATABASE_HOSTS with the exact isolated database hostname.');
  }
  if (!allowedHosts.includes(localHost)) {
    throw new Error('Local QA database host is not in QA_SAFE_DATABASE_HOSTS.');
  }
}

export function assertSafeTarget({ deployedCommand = false } = {}) {
  const url = getTarget();
  const target = classifyTarget(url);
  if (deployedCommand && (target === 'local' || !process.env.QA_BASE_URL)) {
    throw new Error('test:e2e:qa requires an explicit deployed QA_BASE_URL; it never defaults to localhost or production.');
  }
  if (target === 'production') {
    throw new Error('Production QA is disabled for all Playwright commands.');
  }
  if (target === 'local') assertLocalDataIsIsolated();
  if (target === 'preview' || target === 'staging') {
    if (process.env.QA_DATA_ENV !== 'isolated') {
      throw new Error('Remote QA requires QA_DATA_ENV=isolated to confirm the deployment uses non-production data.');
    }
  }
  return { url, target };
}

export function validateAuthState(authPath, url) {
  if (!fs.existsSync(authPath)) {
    throw new Error(`Authenticated QA state is missing at ${authPath}. Follow app/QA.md to provision a dedicated QA Clerk account.`);
  }
  let state;
  try {
    state = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  } catch {
    throw new Error('QA auth state is invalid JSON. Recreate it for the dedicated QA Clerk account.');
  }
  const expectedUserId = process.env.QA_EXPECTED_CLERK_USER_ID;
  if (!expectedUserId) throw new Error('Set QA_EXPECTED_CLERK_USER_ID to the dedicated QA Clerk user ID.');
  if (!(state.origins || []).some((origin) => origin.origin === url.origin)) {
    throw new Error('QA auth state was not captured for QA_BASE_URL. Sign in to the target with the dedicated QA account and recreate the state.');
  }
  const sessionCookies = (state.cookies || []).filter((cookie) => cookie.name === '__session'
    && (url.hostname === cookie.domain.replace(/^\./, '')
      || url.hostname.endsWith(cookie.domain.replace(/^\./, ''))));
  const verified = sessionCookies.some((cookie) => {
    try {
      const payload = JSON.parse(Buffer.from(cookie.value.split('.')[1], 'base64url').toString('utf8'));
      return payload.sub === expectedUserId && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  });
  if (!verified) {
    throw new Error('QA auth state does not contain a current session for QA_EXPECTED_CLERK_USER_ID. Recreate it with the dedicated QA account.');
  }
  const resolved = path.resolve(authPath);
  const insideRepo = resolved.startsWith(`${APP_DIR}${path.sep}`);
  if (insideRepo) {
    try {
      execFileSync('git', ['check-ignore', '--quiet', '--', path.relative(APP_DIR, resolved)], {
        cwd: APP_DIR,
        stdio: 'ignore',
      });
    } catch {
      throw new Error('QA auth state inside the repository must be git-ignored; see app/QA.md.');
    }
  }
  return state;
}

export function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  let safe = value
    .replace(/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi, '[redacted database URL]')
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '[redacted authorization]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?\b/g, '[redacted token]')
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]+\b/gi, '[redacted API key]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[redacted API key]')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, '[redacted API key]')
    .replace(/((?:secret|password|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie)\s*[:=]\s*)[^,\s;]+/gi, '$1[redacted]');
  for (const [name, secret] of Object.entries(process.env)) {
    if (/DATABASE_URL|SECRET|TOKEN|PASSWORD|API_KEY|AUTH/i.test(name)
      && name !== 'QA_EXPECTED_CLERK_USER_ID' && secret && secret.length >= 8) {
      safe = safe.split(secret).join('[redacted]');
    }
  }
  return safe;
}

export function sanitizeUrl(raw) {
  try {
    const url = new URL(raw);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return sanitizeText(url.toString());
  } catch {
    return sanitizeText(raw);
  }
}

export function sanitizeValue(value) {
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      /authorization|cookie|password|secret|token|api.?key|database.?url/i.test(key)
        ? '[redacted]'
        : sanitizeValue(entry),
    ]));
  }
  return value;
}
