/**
 * Language-level editor defaults shared by future editors and runner adapters.
 * Problem-specific starters should be supplied by problem data rather than
 * embedded in this language registry.
 */
export const SUPPORTED_LANGUAGES = Object.freeze([
  Object.freeze({
    id: 'cpp',
    displayName: 'C++',
    fileExtension: '.cpp',
    requiresCompilation: true,
    starterCode: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  }),
  Object.freeze({
    id: 'java',
    displayName: 'Java',
    fileExtension: '.java',
    requiresCompilation: true,
    starterCode: 'class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  }),
  Object.freeze({
    id: 'python',
    displayName: 'Python',
    fileExtension: '.py',
    requiresCompilation: false,
    starterCode: 'def solution():\n    # Write your solution here\n    pass\n',
  }),
  Object.freeze({
    id: 'javascript',
    displayName: 'JavaScript',
    fileExtension: '.js',
    requiresCompilation: false,
    starterCode: 'function solution() {\n  // Write your solution here\n}\n',
  }),
  Object.freeze({
    id: 'c',
    displayName: 'C',
    fileExtension: '.c',
    requiresCompilation: true,
    starterCode: '#include <stdio.h>\n\nint main(void) {\n    // Write your solution here\n    return 0;\n}\n',
  }),
]);

const languagesById = new Map(SUPPORTED_LANGUAGES.map((language) => [language.id, language]));

export function getLanguageById(id) {
  return languagesById.get(id) || null;
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}
