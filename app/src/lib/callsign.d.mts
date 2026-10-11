export const CALLSIGN_MAX_LENGTH: number;
export const DEFAULT_CALLSIGN: string;

export function normalizeCallsign(raw: unknown): string | null;
export function isValidCallsign(raw: unknown): boolean;
export function displayCallsign(raw: unknown): string;
