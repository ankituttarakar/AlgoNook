import type { ExecutionResponse } from '../../api/code/execute.js';

export type RunnerProblem = {
  id: string;
  testCases: ReadonlyArray<unknown>;
};

export function sandboxUnavailable(): ExecutionResponse;

export function executePythonJob(request: {
  sourceCode: string;
  problem: RunnerProblem;
  trace?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; result: ExecutionResponse }>;
