export type RequestHeaders = Record<string, string | string[] | undefined>;

export class UnauthorizedError extends Error {
  constructor(message?: string);
}

export function getBearerToken(headers: RequestHeaders): string | undefined;
export function verifySessionToken(token: string, secretKey: string): Promise<string>;
export function authenticateRequest(headers: RequestHeaders, secretKey: string): Promise<string>;
