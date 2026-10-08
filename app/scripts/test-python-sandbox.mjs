import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { executePythonSandbox } from '../api/code/pythonRunner.mjs';

const image = 'algonook-python-runner:3.12.11';
const dockerInfo = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', windowsHide: true });
if (dockerInfo.error || dockerInfo.status !== 0) {
  console.error('Docker daemon unavailable. Start Docker Desktop with the Linux container engine, then run:');
  console.error('npm run sandbox:build');
  process.exit(2);
}

const imageInfo = spawnSync('docker', ['image', 'inspect', image], { encoding: 'utf8', windowsHide: true });
if (imageInfo.error || imageInfo.status !== 0) {
  console.error(`Runner image ${image} is not built. Run: npm run sandbox:build`);
  process.exit(2);
}

const run = async (name, sourceCode, input = '', expected = '', expectedStatus = 'PASSED') => {
  const result = await executePythonSandbox({
    sourceCode,
    testCases: [{ id: name, input, expected }],
  });
  const testStatus = result.tests?.[0]?.status;
  const passed = result.status === expectedStatus || testStatus === expectedStatus;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: expected ${expectedStatus}, got ${result.status}/${testStatus || 'no test result'}`);
  if (!passed) process.exitCode = 1;
  return result;
};

await run(
  'normal stdin/stdout program',
  'import sys\nnumber = int(sys.stdin.readline())\nprint(number + 1)',
  '41\n',
  '42\n',
);

await run('runtime error', 'raise ValueError("test runtime error")', '', '', 'RUNTIME_ERROR');

await run('infinite loop timeout', 'while True:\n    pass', '', '', 'TIME_LIMIT_EXCEEDED');

await run('large output limit', 'print("x" * 1_000_000)', '', '', 'OUTPUT_LIMIT_EXCEEDED');

await run(
  'network isolation',
  'import socket\ntry:\n    socket.create_connection(("1.1.1.1", 53), timeout=0.25)\n    print("NETWORK_AVAILABLE")\nexcept OSError:\n    print("BLOCKED")',
  '',
  'BLOCKED\n',
);

process.env.ALGONOOK_HOST_SECRET = 'must-not-enter-the-container';
await run(
  'host environment isolation',
  'import os\nprint("EXPOSED" if os.getenv("ALGONOOK_HOST_SECRET") else "NOT_EXPOSED")',
  '',
  'NOT_EXPOSED\n',
);
delete process.env.ALGONOOK_HOST_SECRET;

const hostTemp = await mkdtemp(path.join(os.tmpdir(), 'algonook-sandbox-host-'));
const hostSecretPath = path.join(hostTemp, 'host-only-secret.txt');
try {
  await writeFile(hostSecretPath, 'must-not-be-readable-from-container', 'utf8');
  await run(
    'host filesystem isolation',
    'import sys\ntry:\n    open(sys.stdin.readline().strip()).read()\n    print("HOST_FILE_READABLE")\nexcept OSError:\n    print("BLOCKED")',
    `${hostSecretPath}\n`,
    'BLOCKED\n',
  );
} finally {
  await rm(hostTemp, { recursive: true, force: true });
}

await run(
  'process limit',
  'import errno, shutil, subprocess\nsleep = shutil.which("sleep")\nif sleep is None:\n    raise RuntimeError("sleep utility is unavailable")\nchildren = []\nblocked = False\ntry:\n    for _ in range(100):\n        try:\n            children.append(subprocess.Popen([sleep, "10"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))\n        except OSError as error:\n            if error.errno != errno.EAGAIN or not children:\n                raise\n            blocked = True\n            break\n    print("BLOCKED" if blocked else "UNLIMITED")\nfinally:\n    for child in children:\n        child.kill()\n    for child in children:\n        child.wait()',
  '',
  'BLOCKED\n',
);

await run(
  'memory limit',
  'data = bytearray(512 * 1024 * 1024)\nprint(len(data))',
  '',
  '',
  'MEMORY_LIMIT_EXCEEDED',
);

if (process.exitCode === 1) console.error('One or more sandbox checks failed. Do not relax sandbox settings to make them pass.');
