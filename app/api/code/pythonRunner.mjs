import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const PYTHON_RUNNER_IMAGE = 'algonook-python-runner:3.12.11';
const MAX_PROTOCOL_BYTES = 512 * 1024;
const RUNNER_RESULT_FRAME = '__ALGONOOK_RUNNER_RESULT__';
const RUN_TIMEOUT_MS = 15_000;
const DOCKER_CLI_TIMEOUT_MS = 5_000;

function runDocker(args, { input, timeoutMs = DOCKER_CLI_TIMEOUT_MS, maxOutputBytes = 16 * 1024, onTimeout } = {}) {
  return new Promise((resolve) => {
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let timedOut = false;
    let outputLimitExceeded = false;
    let settled = false;
    const child = spawn('docker', args, {
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      onTimeout?.();
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 300).unref();
    }, timeoutMs);

    const stopOnOutputLimit = () => {
      if (outputLimitExceeded) return;
      outputLimitExceeded = true;
      onTimeout?.();
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 300).unref();
    };

    const appendBounded = (current, chunk) => {
      if (current.length + chunk.length > maxOutputBytes) {
        const retained = Buffer.concat([current, chunk]).subarray(0, maxOutputBytes);
        stopOnOutputLimit();
        return retained;
      }
      return Buffer.concat([current, chunk]);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        timedOut,
        outputLimitExceeded,
      });
    };

    child.stdout.on('data', (chunk) => { stdout = appendBounded(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = appendBounded(stderr, chunk); });
    child.on('error', (error) => finish({ exitCode: null, spawnError: error }));
    child.on('close', (exitCode, signal) => finish({ exitCode, signal }));
    child.stdin.on('error', () => {});
    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
  });
}

async function killContainer(containerId) {
  await runDocker(['kill', containerId], { timeoutMs: DOCKER_CLI_TIMEOUT_MS, maxOutputBytes: 1024 });
}

async function removeContainer(containerId) {
  await runDocker(['rm', '--force', containerId], { timeoutMs: DOCKER_CLI_TIMEOUT_MS, maxOutputBytes: 1024 });
}

const sandboxFailure = (message = 'The Python sandbox could not start.') => ({
  ok: false,
  status: 'SANDBOX_ERROR',
  summary: { passed: 0, total: 0 },
  tests: [],
  stdout: '',
  stderr: '',
  executionTimeMs: null,
  error: { code: 'SANDBOX_UNAVAILABLE', message },
});

export async function executePythonSandbox({ sourceCode, testCases, problemId, trace = false }) {
  const hostTempDir = await mkdtemp(path.join(os.tmpdir(), 'algonook-python-run-'));
  const containerIdFile = path.join(hostTempDir, 'container.id');
  const createArgs = [
    'create',
    '--interactive',
    '--rm',
    '--cidfile', containerIdFile,
    '--network', 'none',
    '--read-only',
    '--user', '65532:65532',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges=true',
    '--memory', '128m',
    '--memory-swap', '128m',
    '--cpus', '0.5',
    '--pids-limit', '32',
    '--ulimit', 'nofile=64:64',
    '--ulimit', 'fsize=1048576:1048576',
    '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777',
    '--workdir', '/runner',
    PYTHON_RUNNER_IMAGE,
  ];

  let containerId = '';
  let killPromise;
  let lateCreateCleanup;
  try {
    const created = await runDocker(createArgs, {
      onTimeout: async () => {
        lateCreateCleanup = (async () => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          try {
            const id = (await readFile(containerIdFile, 'utf8')).trim();
            if (/^[a-f0-9]{12,64}$/i.test(id)) await removeContainer(id);
          } catch {
            // A timed-out create may not have created a container or cidfile.
          }
        })();
      },
    });
    containerId = created.stdout.trim();
    if (!/^[a-f0-9]{12,64}$/i.test(containerId)) {
      try {
        containerId = (await readFile(containerIdFile, 'utf8')).trim();
      } catch {
        containerId = '';
      }
    }
    if (created.exitCode !== 0 || !/^[a-f0-9]{12,64}$/i.test(containerId)) return sandboxFailure();

    const startedAt = Date.now();
    const payload = JSON.stringify({ sourceCode, testCases, ...(problemId ? { problemId } : {}), ...(trace ? { trace: true } : {}) });
    const result = await runDocker(
      ['start', '--attach', '--interactive', containerId],
      {
        input: payload,
        timeoutMs: RUN_TIMEOUT_MS,
        maxOutputBytes: MAX_PROTOCOL_BYTES,
        onTimeout: () => {
          killPromise ||= killContainer(containerId);
        },
      },
    );

    if (result.timedOut) {
      await killPromise;
      return {
        ok: true,
        status: 'TIME_LIMIT_EXCEEDED',
        summary: { passed: 0, total: testCases.length },
        tests: testCases.map((testCase, index) => ({ id: testCase.id || `test-${index + 1}`, status: 'NOT_RUN' })),
        stdout: '',
        stderr: '',
        executionTimeMs: Date.now() - startedAt,
        error: { code: 'RUN_TIMEOUT', message: 'Execution exceeded the 15 second time limit.' },
      };
    }

    if (result.outputLimitExceeded) {
      await killPromise;
      return {
        ok: true,
        status: 'OUTPUT_LIMIT_EXCEEDED',
        summary: { passed: 0, total: testCases.length },
        tests: [],
        stdout: '',
        stderr: '',
        executionTimeMs: Date.now() - startedAt,
        error: { code: 'OUTPUT_LIMIT', message: 'Runner output exceeded its response limit.' },
      };
    }

    if (result.spawnError || result.exitCode === null) return sandboxFailure();

    if (result.exitCode === 137) {
      return {
        ok: true,
        status: 'MEMORY_LIMIT_EXCEEDED',
        summary: { passed: 0, total: testCases.length },
        tests: testCases.map((testCase, index) => ({ id: testCase.id || `test-${index + 1}`, status: 'NOT_RUN' })),
        stdout: '',
        stderr: '',
        executionTimeMs: Date.now() - startedAt,
        error: { code: 'MEMORY_LIMIT', message: 'Execution exceeded the memory limit.' },
      };
    }

    let runnerResult;
    try {
      const frameIndex = result.stdout.lastIndexOf(RUNNER_RESULT_FRAME);
      if (frameIndex < 0) return sandboxFailure();
      const framedResult = result.stdout.slice(frameIndex + RUNNER_RESULT_FRAME.length).split(/\r?\n/, 1)[0];
      runnerResult = JSON.parse(framedResult);
    } catch {
      return sandboxFailure();
    }
    if (!runnerResult || typeof runnerResult.status !== 'string' || !Array.isArray(runnerResult.tests)) {
      return sandboxFailure();
    }

    return {
      ok: true,
      ...runnerResult,
      executionTimeMs: Date.now() - startedAt,
    };
  } finally {
    if (/^[a-f0-9]{12,64}$/i.test(containerId)) await removeContainer(containerId);
    await lateCreateCleanup;
    await rm(hostTempDir, { recursive: true, force: true });
  }
}
