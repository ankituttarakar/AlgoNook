import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import OrderChallenge from '../challenges/OrderChallenge.jsx';
import HintLadder from '../components/HintLadder.jsx';
import { getLanguageById, getSupportedLanguages } from '../data/languages.js';
import { sfx } from '../game/sfx.js';
import { useShuffledOptions } from '../game/answerOptions.js';
import ExecutionPlayback from '../components/ExecutionPlayback.jsx';

const supportedLanguages = getSupportedLanguages();
const MonacoCodeEditor = lazy(() => import('../components/MonacoCodeEditor.jsx'));

function Section({ title, children }) {
  return (
    <section className="border border-[var(--bb-line)] bg-black/20 p-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)]">{title}</h3>
      {children}
    </section>
  );
}

function ChoiceStep({ step, onMistake, onContinue }) {
  const options = useShuffledOptions(step.options, step.prompt);
  const [wrong, setWrong] = useState([]);
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(false);

  const choose = (index) => {
    if (solved || wrong.includes(index)) return;
    setSelected(index);
    if (options[index].correct) {
      setSolved(true);
      sfx.correct();
    } else {
      setWrong((items) => [...items, index]);
      onMistake(options[index].rationale);
      sfx.wrong();
    }
  };

  return (
    <>
      <p className="mb-4 text-sm font-medium leading-relaxed text-[var(--bb-text)]">{step.prompt}</p>
      <div className="space-y-2">
        {options.map((option, index) => {
          const isWrong = wrong.includes(index);
          const isCorrect = solved && option.correct;
          return (
            <button
              key={option.text}
              onClick={() => choose(index)}
              disabled={solved || isWrong}
              className={`block w-full border px-3 py-3 text-left text-xs leading-relaxed transition-colors sm:text-sm ${
                isCorrect
                  ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.08)] text-[var(--bb-green)]'
                  : isWrong
                    ? 'border-[var(--bb-red)]/50 text-[var(--bb-red)]/60 line-through'
                    : 'border-[var(--bb-line)] text-[var(--bb-text)] hover:border-[var(--bb-green-dim)]'
              }`}
            >
              <span className="mr-2 font-mono text-[var(--bb-muted)]">{String.fromCharCode(65 + index)}.</span>
              {option.text}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className={`mt-3 border px-3 py-2 text-xs leading-relaxed ${solved ? 'border-[var(--bb-green)]/40 text-[var(--bb-green)]' : 'border-[var(--bb-red)]/40 text-[var(--bb-text)]'}`}>
          {options[selected].rationale}
        </div>
      )}
      {solved && (
        <button
          onClick={() => { sfx.select(); onContinue({ firstTry: wrong.length === 0 }); }}
          className="bb-btn bb-btn-green mt-4 text-xs"
        >
          Continue to {step.nextLabel} →
        </button>
      )}
    </>
  );
}

function TestCasesStep({ cases, onMistake, onContinue }) {
  const [caseIndex, setCaseIndex] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(false);
  const [hadRetry, setHadRetry] = useState(false);
  const current = cases[caseIndex];
  const options = useShuffledOptions(current.options, `${caseIndex}:${current.prompt}`);

  const choose = (index) => {
    if (solved || wrong.includes(index)) return;
    setSelected(index);
    if (options[index].correct) {
      setSolved(true);
      sfx.correct();
    } else {
      setWrong((items) => [...items, index]);
      setHadRetry(true);
      onMistake(options[index].rationale);
      sfx.wrong();
    }
  };

  const advance = () => {
    if (caseIndex + 1 === cases.length) {
      onContinue({ firstTry: !hadRetry && wrong.length === 0 });
      return;
    }
    setCaseIndex((index) => index + 1);
    setWrong([]);
    setSelected(null);
    setSolved(false);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
        <span>Case {caseIndex + 1} of {cases.length}</span>
        <span>Think through the expected return value</span>
      </div>
      <Section title="Input">
        <pre className="overflow-x-auto text-xs text-[var(--bb-green)]">nums = {current.inputDisplay || JSON.stringify(current.nums)}</pre>
      </Section>
      <p className="my-4 text-sm font-medium text-[var(--bb-text)]">{current.prompt}</p>
      <div className="space-y-2">
        {options.map((option, index) => (
          <button
            key={option.text}
            onClick={() => choose(index)}
            disabled={solved || wrong.includes(index)}
            className={`block w-full border px-3 py-2.5 text-left text-xs leading-relaxed ${
              solved && option.correct
                ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.08)] text-[var(--bb-green)]'
                : wrong.includes(index)
                  ? 'border-[var(--bb-red)]/50 text-[var(--bb-red)]/60 line-through'
                  : 'border-[var(--bb-line)] text-[var(--bb-text)] hover:border-[var(--bb-green-dim)]'
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className="mt-3 border border-[var(--bb-line)] px-3 py-2 text-xs leading-relaxed text-[var(--bb-muted)]">
          {options[selected].rationale}
        </p>
      )}
      {solved && (
        <button onClick={advance} className="bb-btn bb-btn-green mt-4 text-xs">
          {caseIndex + 1 < cases.length ? 'Next test case →' : 'Review explanation →'}
        </button>
      )}
    </>
  );
}

function ImplementationStep({ challenge, problem, pattern, onMistake, onContinue, onHintRevealed }) {
  const { getToken } = useAuth();
  const availableLanguages = challenge.supportedLanguages
    ? supportedLanguages.filter((language) => challenge.supportedLanguages.includes(language.id))
    : supportedLanguages;
  const [selectedLanguage, setSelectedLanguage] = useState(availableLanguages[0]?.id || 'python');
  const getStarterCode = (languageId) => (
    challenge.starterCodeByLanguage?.[languageId]
    ?? (languageId === 'javascript' ? challenge.starter : null)
    ?? getLanguageById(languageId)?.starterCode
    ?? ''
  );
  const [codeByLanguage, setCodeByLanguage] = useState(() => Object.fromEntries(
    supportedLanguages.map((language) => [language.id, getStarterCode(language.id)]),
  ));
  const [checks, setChecks] = useState(null);
  const [execution, setExecution] = useState({ loading: false, result: null, error: null });
  const executionLock = useRef(false);
  const [attempts, setAttempts] = useState(0);
  const [runAttempts, setRunAttempts] = useState(0);
  const activeLanguage = getLanguageById(selectedLanguage);
  const code = codeByLanguage[selectedLanguage]
    ?? challenge.starterCodeByLanguage?.[selectedLanguage]
    ?? activeLanguage?.starterCode
    ?? '';
  const trustedRunPassed = execution.result?.status === 'PASSED'
    && execution.result.summary?.total > 0
    && execution.result.summary.passed === execution.result.summary.total
    && execution.result.tests.length === execution.result.summary.total
    && execution.result.tests.every((test) => test.status === 'PASSED');

  const changeLanguage = (languageId) => {
    setSelectedLanguage(languageId);
    setChecks(null);
    setExecution({ loading: false, result: null, error: null });
  };

  const resetCurrentCode = () => {
    setCodeByLanguage((current) => ({ ...current, [selectedLanguage]: getStarterCode(selectedLanguage) }));
    setChecks(null);
    setExecution({ loading: false, result: null, error: null });
  };

  const runPythonCode = async () => {
    if (selectedLanguage !== 'python' || !code.trim() || executionLock.current) return;
    executionLock.current = true;
    setExecution({ loading: true, result: null, error: null });
    const attemptNumber = runAttempts + 1;
    setRunAttempts(attemptNumber);

    try {
      const token = await getToken();
      if (!token) {
        setExecution({ loading: false, result: null, error: 'Your session could not be verified. Sign in again and retry.' });
        return;
      }

      const response = await fetch('/api/code/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: 'python',
          sourceCode: code,
          problemId: challenge.problemId || 'contains-duplicate',
          trace: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      const validResult = payload
        && typeof payload.status === 'string'
        && payload.summary
        && Number.isFinite(payload.summary.passed)
        && Number.isFinite(payload.summary.total)
        && Array.isArray(payload.tests);

      if (validResult) {
        setExecution({ loading: false, result: payload, error: null });
      } else {
        const message = typeof payload?.error === 'string'
          ? payload.error
          : typeof payload?.error?.message === 'string'
            ? payload.error.message
            : response.ok
              ? 'The execution service returned an invalid response.'
              : `Execution request failed (${response.status}).`;
        setExecution({ loading: false, result: null, error: message });
      }
    } catch {
      setExecution({ loading: false, result: null, error: 'Could not reach the execution service. Check your connection and try again.' });
    } finally {
      executionLock.current = false;
    }
  };

  const changeCode = (value) => {
    setCodeByLanguage((current) => ({ ...current, [selectedLanguage]: value ?? '' }));
    setExecution({ loading: false, result: null, error: null });
  };

  const validate = () => {
    const normalized = code.replace(/\s+/g, ' ');
    const results = challenge.requirements.map((requirement) => ({
      ...requirement,
      passed: new RegExp(requirement.pattern, 'i').test(normalized),
    }));
    const ordering = challenge.ordering;
    const before = ordering ? normalized.indexOf(ordering.before) : -1;
    const after = ordering ? normalized.indexOf(ordering.after) : -1;
    const ordered = !ordering || (before >= 0 && after > before);
    const complete = results.every((result) => result.passed) && ordered;
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    setChecks({ results, ordered, complete });
    if (complete) {
      sfx.correct();
      onContinue({ firstTry: nextAttempt === 1 });
    } else {
      sfx.wrong();
      onMistake('Implementation is missing one or more required algorithm steps.');
    }
  };

  const testStatus = (status) => {
    if (status === 'PASSED') return { icon: '✓', label: 'Passed', className: 'is-passed' };
    if (status === 'WRONG_ANSWER') return { icon: '✕', label: 'Failed', className: 'is-failed' };
    if (status === 'NOT_RUN') return { icon: '○', label: 'Not run', className: 'is-pending' };
    return { icon: '✕', label: status?.replaceAll('_', ' ') || 'Error', className: 'is-failed' };
  };

  return (
    <div className="coding-workspace">
      <section className="workspace-panel workspace-brief" aria-label="Problem instructions">
        <header className="workspace-panel-heading"><div><p className="workspace-kicker">PROBLEM NOTES</p><h3>Understand the mission</h3></div><span className="workspace-difficulty">{problem?.difficulty || 'DSA'}</span></header>
        <div className="workspace-brief-body">
          <h4>Objective</h4><p>{problem?.statement || challenge.prompt}</p>
              {!!problem?.constraints?.length && <div className="brief-block"><h4>Constraints</h4><ul>{problem.constraints.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {problem?.complexity && <div className="brief-pattern"><span className="workspace-kicker">COMPLEXITY TARGET</span><p>{problem.complexity}</p></div>}
          {!!problem?.examples?.length && <details className="workspace-examples"><summary>Examples <span>{problem.examples.length}</span></summary><div>{problem.examples.map((example, index) => <article key={`${example.input}-${index}`}><small>Example {index + 1}</small><pre>Input: {example.input}{'\n'}Output: {example.output}</pre><p>{example.explanation}</p></article>)}</div></details>}
          {pattern?.prompt && <div className="brief-pattern"><span className="workspace-kicker">PATTERN TO APPLY</span><p>{pattern.prompt}</p></div>}
          {challenge.ladder && <div className="workspace-hints"><HintLadder ladder={challenge.ladder} onHintRevealed={onHintRevealed} disabled={checks?.complete} /></div>}
        </div>
      </section>

      <section className={`workspace-panel workspace-editor ${trustedRunPassed ? 'has-passing-run' : ''}`} aria-label="Code editor">
        <header className="workspace-panel-heading"><div><p className="workspace-kicker">IMPLEMENTATION / {challenge.problemId || 'PROBLEM'}</p><h3>{challenge.executionLabel || 'Write your solution'}</h3></div>{trustedRunPassed && <span className="execution-success-badge">✓ TESTS PASSED</span>}</header>
        <p className="workspace-prompt">{challenge.prompt}</p>
        <div className="workspace-toolbar">
          <label htmlFor="dsa-language-selector">Language
            <select id="dsa-language-selector" value={selectedLanguage} onChange={(event) => changeLanguage(event.target.value)} disabled={execution.loading}>
              {availableLanguages.map((language) => <option key={language.id} value={language.id}>{language.displayName}</option>)}
            </select>
          </label>
          <span className="workspace-filetype">{activeLanguage?.fileExtension || ''}</span>
          <button type="button" onClick={resetCurrentCode} disabled={execution.loading} className="bb-btn bb-btn-ghost text-xs">Reset</button>
        </div>
        {selectedLanguage === 'javascript' ? <p className="workspace-mode-note">JavaScript structure checks are available for this stage; use Python for trusted execution and trace playback.</p> : selectedLanguage === 'python' ? <p className="workspace-mode-note is-python">Python runs in the trusted, isolated sandbox. Add <code>algonook.step(action, state)</code> calls for step playback.</p> : <p role="status" className="workspace-mode-note">Execution and validation for {activeLanguage?.displayName || 'this language'} are not available yet.</p>}
        <Suspense fallback={<div className="editor-loading">Loading editor…</div>}>
          <MonacoCodeEditor language={activeLanguage?.id || 'javascript'} languageName={activeLanguage?.displayName || 'Code'} value={code} onChange={changeCode} tabSize={selectedLanguage === 'python' ? 4 : 2} readOnly={execution.loading} />
        </Suspense>
        <div className="workspace-run-controls">
          {selectedLanguage === 'javascript' && <button onClick={validate} className="bb-btn bb-btn-ghost text-xs">Check implementation</button>}
          <button type="button" onClick={runPythonCode} disabled={selectedLanguage !== 'python' || !code.trim() || execution.loading} className={`bb-btn text-xs ${selectedLanguage === 'python' && code.trim() && !execution.loading ? 'bb-btn-green' : 'bb-btn-ghost cursor-not-allowed opacity-60'}`}>{execution.loading ? '● Running…' : '▶ Run Code'}</button>
          <span>{selectedLanguage === 'python' ? `Trusted ${challenge.executionLabel || 'problem'} cases` : 'Python execution only'}</span>
        </div>
        {selectedLanguage === 'python' && trustedRunPassed && <button onClick={() => onContinue({ firstTry: runAttempts === 1 })} className="bb-btn bb-btn-green workspace-continue">All trusted tests passed · Continue →</button>}
      </section>

      <aside className="workspace-panel workspace-visualizer" aria-label="Algorithm visualization">
        <ExecutionPlayback problemId={challenge.problemId} trace={execution.result?.trace} />
      </aside>

      <section className="workspace-panel workspace-results" aria-live="polite" aria-label="Test and execution results">
        <header className="workspace-panel-heading results-heading"><div><p className="workspace-kicker">TESTS / EXECUTION</p><h3>{execution.loading ? 'Running trusted test suite…' : execution.result ? `${execution.result.summary.passed} / ${execution.result.summary.total} passed` : 'Results appear after execution'}</h3></div>{execution.result?.executionTimeMs != null && <span className="result-runtime">{execution.result.executionTimeMs} ms</span>}</header>
        {execution.loading && <p className="suite-running"><i />The sandbox is evaluating the registered cases. Results appear when execution completes.</p>}
        {execution.error && <div className="execution-error"><strong>EXECUTION ERROR</strong><p>{execution.error}</p></div>}
        {execution.result && <>
          <div className={`overall-result ${execution.result.status === 'PASSED' ? 'is-passed' : execution.result.status === 'WRONG_ANSWER' ? 'is-failed' : 'is-error'}`}><strong>{execution.result.status === 'PASSED' ? '✓ All tests passed' : execution.result.status === 'WRONG_ANSWER' ? '✕ Some tests failed' : `! ${execution.result.status.replaceAll('_', ' ')}`}</strong>{execution.result.error?.message && <span>{execution.result.error.message}</span>}</div>
          {!!execution.result.tests.length && <ul className="execution-test-list">{execution.result.tests.map((test, index) => { const result = testStatus(test.status); return <li key={test.id || index} className={result.className}><span className="test-status-icon" aria-hidden="true">{result.icon}</span><span className="test-name">{test.id || `Test ${index + 1}`}</span><span className="test-status-label">{result.label}</span>{(test.status === 'WRONG_ANSWER' || test.error?.message) && <small>{test.error?.message || 'Output did not match the expected result for this case.'}</small>}</li>; })}</ul>}
        </>}
        {selectedLanguage === 'javascript' && checks && <div className="structure-checks"><strong>STRUCTURE CHECKS · NOT A RUNTIME JUDGE</strong><ul>{checks.results.map((result) => <li key={result.id} className={result.passed ? 'is-passed' : 'is-failed'}>{result.passed ? '✓' : '○'} {result.label}</li>)}{challenge.ordering && <li className={checks.ordered ? 'is-passed' : 'is-failed'}>{checks.ordered ? '✓' : '○'} {challenge.ordering.label}</li>}</ul></div>}
        {!execution.result && !execution.error && !execution.loading && <p className="results-empty">○ Pending · Choose Python and run code to see the backend’s actual test results.</p>}
      </section>
    </div>
  );
}

export default function DSAProblemFlow({ flow, onStageComplete, onMistake, onHintRevealed, onComplete, onAbort }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [finalResult, setFinalResult] = useState(null);
  const explanationFirstTry = useRef(false);
  const completedStep = useRef(null);
  const step = flow.steps[stepIndex];

  useEffect(() => {
    if (finalResult) onComplete(finalResult);
  }, [finalResult, onComplete]);

  const completeStep = ({ firstTry = true } = {}) => {
    if (completedStep.current === step.id) return;
    completedStep.current = step.id;
    // Merely advancing past the problem statement is navigation, not evidence
    // of learning. Award progress only for answered/reasoned/implemented stages.
    if (step.type !== 'problem') onStageComplete({ label: step.xpLabel, difficulty: step.difficulty, firstTry });
    if (step.id === 'explain') explanationFirstTry.current = firstTry;
    if (stepIndex + 1 === flow.steps.length) {
      setFinalResult({ explanationFirstTry: explanationFirstTry.current, transferFirstTry: firstTry });
    } else {
      setStepIndex((index) => index + 1);
    }
  };

  return (
    <main className={step.type === 'implementation' ? 'mx-auto w-full max-w-[1440px] px-4 pb-20 pt-6' : 'mx-auto max-w-3xl px-4 pb-24 pt-6'}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--bb-line)] pb-4">
        <div>
          <button onClick={() => { sfx.select(); onAbort(); }} className="mb-3 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)]">← Exit problem</button>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--bb-muted)]">
            {flow.id} · {flow.difficulty}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--bb-text)] sm:text-2xl">{flow.title}</h1>
        </div>
        <span className="font-mono text-xs text-[var(--bb-muted)]">{String(stepIndex + 1).padStart(2, '0')} / {flow.steps.length}</span>
      </header>

      <nav aria-label="Problem-solving stages" className="mb-6 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {flow.steps.map((stage, index) => (
          <div key={stage.id} aria-current={index === stepIndex ? 'step' : undefined} className={`border px-1 py-2 text-center ${
            index < stepIndex
              ? 'border-[var(--bb-green-dim)] text-[var(--bb-green)]'
              : index === stepIndex
                ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.06)] text-[var(--bb-green)]'
                : 'border-[var(--bb-line)] text-[var(--bb-muted)]'
          }`}>
            <span className="block font-mono text-[9px]">{String(index + 1).padStart(2, '0')}</span>
            <span className="hidden text-[8px] tracking-wide sm:block">{stage.section}</span>
          </div>
        ))}
      </nav>

      <section className="overflow-hidden border border-[var(--bb-line)] bg-[var(--bb-panel)]">
        <header className="border-b border-[var(--bb-line)] bg-black/30 px-4 py-3 sm:px-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--bb-green-dim)]">{step.section}</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--bb-text)]">{step.heading}</h2>
        </header>
        <div className="space-y-4 p-4 sm:p-5">
          {step.type === 'problem' && (
            <>
              <Section title="Problem statement">
                <p className="text-sm leading-relaxed text-[var(--bb-text)]">{step.statement}</p>
              </Section>
              <details className="group border border-[var(--bb-line)] bg-black/20">
                <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-green)]">Constraints and examples</summary>
                <div className="space-y-3 border-t border-[var(--bb-line)] p-3">
                  <Section title="Constraints">
                    <ul className="space-y-1 text-xs text-[var(--bb-text)]">
                      {step.constraints.map((constraint) => <li key={constraint}>• {constraint}</li>)}
                    </ul>
                  </Section>
                  <Section title="Examples">
                    <div className="space-y-3">
                      {step.examples.map((example, index) => (
                        <div key={example.input} className="border-l border-[var(--bb-line)] pl-3 text-xs">
                          <p className="mb-1 text-[var(--bb-muted)]">Example {index + 1}</p>
                          <pre className="whitespace-pre-wrap text-[var(--bb-text)]">Input: {example.input}{'\n'}Output: {example.output}</pre>
                          <p className="mt-1 leading-relaxed text-[var(--bb-muted)]">{example.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              </details>
              <button onClick={() => { sfx.select(); completeStep(); }} className="bb-btn bb-btn-green text-xs">Start with the input →</button>
            </>
          )}

          {step.type === 'choice' && (
            <ChoiceStep key={step.id} step={step} onMistake={onMistake} onContinue={completeStep} />
          )}

          {step.type === 'order' && (
            <OrderChallenge
              key={step.id}
              challenge={{ ...step.challenge, t: 'order' }}
              onMistake={onMistake}
              onSolved={completeStep}
            />
          )}

        {step.type === 'implementation' && (
            <ImplementationStep
              key={step.id}
              challenge={step.challenge}
              problem={flow.steps.find((item) => item.type === 'problem')}
              pattern={flow.steps.find((item) => item.section === 'PATTERN')}
              onHintRevealed={onHintRevealed}
              onMistake={onMistake}
              onContinue={completeStep}
            />
          )}

          {step.type === 'tests' && (
            <TestCasesStep key={step.id} cases={step.cases} onMistake={onMistake} onContinue={completeStep} />
          )}
        </div>
      </section>
    </main>
  );
}
