// AlgoNook — React ErrorBoundary
// Wraps the app shell so a crashing screen, visualization, game, GameProvider
// subtree, or any other render error never produces a blank page.
//
// The fallback shows AlgoNook branding, a sanitized description of what
// happened, a stable error identifier for bug reports, and two recoveries:
//   Retry             — re-render the same screen in place
//   Return to Roadmap — leave the crashed screen and go back to the roadmap
//
// No server details, stack traces, connection strings, or credentials are ever
// shown to the learner; only a sanitized one-line summary plus an error id.

import { Component } from 'react';

const SECRET_PATTERNS = [
  [/(postgres(?:ql)?|mongodb(?:\+srv)?|mysql|redis|amqp):\/\/[^\s"'`]+/gi, '[redacted connection string]'],
  [/\bsk_(?:test|live)_[A-Za-z0-9._-]+/g, '[redacted secret key]'],
  [/\bpk_(?:test|live)_[A-Za-z0-9._-]+/g, '[redacted publishable key]'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}[A-Za-z0-9._-]*/g, '[redacted token]'],
  [/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]'],
  [/([?&](?:token|key|secret|code|session|password|auth)=)[^&\s"'`]+/gi, '$1[redacted]'],
];

export function sanitizeErrorText(text, max = 240) {
  if (!text) return '';
  let out = String(text);
  for (const [pattern, replacement] of SECRET_PATTERNS) out = out.replace(pattern, replacement);
  out = out.replace(/\s+/g, ' ').trim();
  return out.length > max ? `${out.slice(0, max)}…` : out;
}

// Short stable id derived from the error itself so two reports of the same
// crash share an identifier, without exposing the stack trace.
export function errorFingerprint(error, componentStack = '') {
  const source = [error?.name, error?.message, componentStack].join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `ERR-${hash.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}

// "<ConceptScreen> (...) at ..." → "ConceptScreen"
function firstComponentFrame(componentStack) {
  const frame = String(componentStack || '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^at\s+/.test(line) && !/ErrorBoundary|CrashHook/.test(line));
  if (!frame) return '';
  const match = frame.match(/^at\s+([A-Za-z0-9_.-]+)/);
  return match ? match[1] : '';
}

function ErrorFallback({ error, fingerprint, componentStack, onRetry, onReturnToRoadmap }) {
  const detail = sanitizeErrorText(`${error?.name || 'Error'}: ${error?.message || ''}`);
  const where = firstComponentFrame(componentStack);

  return (
    <div
      role="alert"
      data-testid="error-boundary-fallback"
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-12"
    >
      <div className="border border-[var(--bb-amber)] bg-[var(--bb-panel)] p-6 text-center max-w-md w-full">
        <div className="font-mono text-sm text-[var(--bb-green)] mb-3">AlgoNook</div>
        <div className="font-mono text-xs text-[var(--bb-amber)] mb-3">Something went wrong</div>
        <p className="text-xs text-[var(--bb-muted)] mb-3">
          A screen crashed while rendering. Your progress is stored on the server and was not lost.
          Nothing was saved from the crashed view.
        </p>
        {detail && (
          <p className="text-[10px] font-mono text-[var(--bb-muted)] break-all mb-1">
            What happened: {detail}
          </p>
        )}
        {where && (
          <p className="text-[10px] font-mono text-[var(--bb-muted)] break-all mb-1">
            Near: {where}
          </p>
        )}
        <p className="text-[10px] font-mono text-[var(--bb-muted)] mb-4" data-testid="error-id">
          Error ID: {fingerprint}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={onRetry} className="bb-btn bb-btn-green text-xs">
            Retry
          </button>
          <button onClick={onReturnToRoadmap} className="bb-btn bb-btn-ghost text-xs">
            Return to Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  state = { error: null, componentStack: '', fingerprint: '' };

  static getDerivedStateFromError(error) {
    return { error, fingerprint: errorFingerprint(error) };
  }

  componentDidCatch(error, info) {
    const componentStack = info?.componentStack || '';
    // Keep the fingerprint assigned in getDerivedStateFromError so the Error ID
    // shown to the learner never changes after paint.
    this.setState({ componentStack });
    // Full detail goes to the developer console only — never to the UI.
    console.error('[AlgoNook] render error caught by ErrorBoundary', error, componentStack);
    if (typeof this.props.onError === 'function') this.props.onError(error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, componentStack: '', fingerprint: '' });
    }
  }

  handleRetry = () => {
    if (typeof this.props.onRetry === 'function') this.props.onRetry();
    else this.setState({ error: null, componentStack: '', fingerprint: '' });
  };

  handleReturnToRoadmap = () => {
    if (typeof this.props.onReturnToRoadmap === 'function') {
      this.props.onReturnToRoadmap();
      return;
    }
    // Root-level fallback: a hard navigation to "/" drops any query string
    // (including QA crash hooks) and starts from the roadmap.
    window.location.assign('/');
  };

  render() {
    const { error, componentStack, fingerprint } = this.state;
    if (!error) return this.props.children;
    return (
      <ErrorFallback
        error={error}
        componentStack={componentStack}
        fingerprint={fingerprint}
        onRetry={this.handleRetry}
        onReturnToRoadmap={this.handleReturnToRoadmap}
      />
    );
  }
}
