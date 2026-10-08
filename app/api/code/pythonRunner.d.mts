import type { ExecutionResponse } from './execute.js';

export function executePythonSandbox(request: {
  sourceCode: string;
  problemId?: string;
  trace?: boolean;
  testCases: ReadonlyArray<{
    id?: string;
    input?: unknown;
    nums?: readonly number[];
    values?: readonly string[];
    expected?: unknown;
  }>;
}): Promise<ExecutionResponse>;
