import Editor, { loader } from '@monaco-editor/react';
import * as monaco from '../../node_modules/monaco-editor/esm/vs/editor/editor.api.js';
import editorWorker from '../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js?worker';
import '../../node_modules/monaco-editor/esm/vs/languages/definitions/cpp/register.js';
import '../../node_modules/monaco-editor/esm/vs/languages/definitions/java/register.js';
import '../../node_modules/monaco-editor/esm/vs/languages/definitions/python/register.js';
import '../../node_modules/monaco-editor/esm/vs/languages/definitions/javascript/register.js';

globalThis.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

loader.config({ monaco });

function configureEditorTheme(editorMonaco) {
  editorMonaco.editor.defineTheme('algonook-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#080b09',
      'editor.foreground': '#e5e7eb',
      'editorLineNumber.foreground': '#69736c',
      'editorLineNumber.activeForeground': '#d1d5db',
      'editorCursor.foreground': '#00f48e',
      'editor.lineHighlightBackground': '#101612',
      'editor.selectionBackground': '#17402f',
      'editorIndentGuide.background1': '#1d2921',
      'editorBracketMatch.background': '#17402f',
      'editorBracketMatch.border': '#00a866',
    },
  });
}

export default function MonacoCodeEditor({ language, languageName, value, onChange, tabSize, readOnly = false }) {
  return (
    <div className="min-h-[460px] w-full overflow-hidden border border-[var(--bb-line)] bg-[#080b09]" style={{ height: 'min(70vh, 720px)' }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme="algonook-dark"
        beforeMount={configureEditorTheme}
        onChange={onChange}
        options={{
          ariaLabel: `${languageName} editor`,
          automaticLayout: true,
          autoIndent: 'full',
          bracketPairColorization: { enabled: true },
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 14,
          insertSpaces: true,
          lineNumbers: 'on',
          matchBrackets: 'always',
          minimap: { enabled: false },
          padding: { top: 14, bottom: 14 },
          readOnly,
          scrollBeyondLastLine: false,
          tabSize,
          wordWrap: 'off',
        }}
      />
    </div>
  );
}
