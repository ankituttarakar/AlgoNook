export interface SupportedLanguage {
  readonly id: string;
  readonly displayName: string;
  readonly fileExtension: string;
  readonly requiresCompilation: boolean;
  readonly starterCode: string;
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[];

export function getLanguageById(id: string): SupportedLanguage | null;

export function getSupportedLanguages(): readonly SupportedLanguage[];
