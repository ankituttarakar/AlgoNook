export const EXECUTION_REQUEST_LIMIT: 12;
export const EXECUTION_WINDOW_MS: 60000;
export const EXECUTION_CONCURRENCY_LIMIT: 2;
export const EXECUTION_LEASE_MS: 35000;

export type ExecutionAdmission =
  | { admitted: true; leaseId: string }
  | { admitted: false; retryAfterSeconds: number };

export function reserveCodeExecution(userId: string, env?: NodeJS.ProcessEnv): Promise<ExecutionAdmission>;
export function releaseCodeExecution(userId: string, leaseId: string, env?: NodeJS.ProcessEnv): Promise<void>;
