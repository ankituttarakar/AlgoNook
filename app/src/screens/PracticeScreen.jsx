// AlgoNook — Practice Screen
// Lightweight knowledge checks before full coding problems.
// Tests understanding of concepts and pattern recognition.

import { useState } from 'react';
import { getPracticeForNode } from '../data/practice.js';
import { ROADMAP_NODE_MAP } from '../data/roadmap.js';
import { sfx } from '../game/sfx.js';
import { useShuffledOptions } from '../game/answerOptions.js';
import PracticeRecommendations from '../components/PracticeRecommendations.jsx';

function PracticeChallenge({ challenge, onComplete }) {
  const options = useShuffledOptions(challenge.options, challenge.prompt);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [wrongAttempts, setWrongAttempts] = useState([]);
  const [solved, setSolved] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typedFeedback, setTypedFeedback] = useState('');

  const checkTypedAnswer = (event) => {
    event.preventDefault();
    if (solved || !typedAnswer.trim()) return;
    const normalize = (value) => value.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
    const correct = (challenge.acceptedAnswers || []).some((answer) => normalize(answer) === normalize(typedAnswer));
    if (correct) {
      setSolved(true);
      setTypedFeedback(challenge.explanation);
      sfx.correct();
    } else {
      setWrongAttempts([...wrongAttempts, typedAnswer]);
      setTypedFeedback(challenge.retryReason || 'Check how the work accumulates across iterations, then try again.');
      sfx.wrong();
    }
  };

  const handleChoice = (index) => {
    if (solved || wrongAttempts.includes(index)) return;

    setSelectedIndex(index);
    const option = options[index];

    if (option.correct) {
      setSolved(true);
      sfx.correct();
    } else {
      setWrongAttempts([...wrongAttempts, index]);
      sfx.wrong();
    }
  };

  return (
    <div className="border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5">
      {/* Challenge type badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] uppercase tracking-widest text-[var(--bb-muted)] font-mono">
          {challenge.type.replace('_', ' ')}
        </span>
        {solved && (
          <span className="text-[var(--bb-green)] text-xs">✓ Correct</span>
        )}
      </div>

      {/* Prompt */}
      <p className="text-sm font-medium text-[var(--bb-text)] mb-3">
        {challenge.prompt}
      </p>

      {/* Problem context */}
      {challenge.problem && (
        <div className="border border-[var(--bb-line)] bg-black/30 px-3 py-2 mb-4 text-xs text-[var(--bb-muted)]">
          {challenge.problem}
        </div>
      )}

      {/* Code block if present */}
      {challenge.code && (
        <pre className="border border-[var(--bb-line)] bg-black/40 p-3 mb-4 overflow-x-auto text-xs font-mono text-[var(--bb-text)] leading-relaxed">
          <code>{challenge.code}</code>
        </pre>
      )}

      {/* Initial state for trace problems */}
      {challenge.initial && (
        <div className="border-l-2 border-[var(--bb-amber)] pl-3 mb-4 text-xs text-[var(--bb-amber)]">
          {challenge.initial}
        </div>
      )}

      {/* Question for trace problems */}
      {challenge.question && (
        <p className="text-xs text-[var(--bb-muted)] mb-3 italic">
          {challenge.question}
        </p>
      )}

      {challenge.type === 'short_answer' ? (
        <form onSubmit={checkTypedAnswer} className="mb-3 flex flex-wrap gap-2">
          <input aria-label="Your answer" value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value)} disabled={solved} className="min-w-40 flex-1 border border-[var(--bb-line)] bg-black/50 px-3 py-2 text-sm" />
          <button disabled={solved || !typedAnswer.trim()} className="bb-btn bb-btn-green text-xs">Check answer</button>
        </form>
      ) : (
      /* Options */
      <div className="space-y-2 mb-3">
        {options.map((option, index) => {
          const isWrong = wrongAttempts.includes(index);
          const isCorrect = solved && option.correct;
          const isSelected = selectedIndex === index;

          return (
            <button
              key={index}
              onClick={() => handleChoice(index)}
              disabled={solved || isWrong}
              className={`block w-full border px-3 py-2.5 text-left text-xs transition-colors ${
                isCorrect
                  ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.08)] text-[var(--bb-green)]'
                  : isWrong
                    ? 'border-[var(--bb-red)]/50 text-[var(--bb-red)]/60 line-through'
                    : 'border-[var(--bb-line)] text-[var(--bb-text)] hover:border-[var(--bb-green-dim)]'
              }`}
            >
              <span className="mr-2 font-mono text-[var(--bb-muted)]">
                {String.fromCharCode(65 + index)}.
              </span>
              {option.text}
            </button>
          );
        })}
      </div>
      )}

      {/* Explanation */}
      {challenge.type === 'short_answer' && typedFeedback ? (
        <div role="status" className={`border px-3 py-2 text-xs leading-relaxed ${solved ? 'border-[var(--bb-green)]/40 text-[var(--bb-text)]' : 'border-[var(--bb-red)]/40 text-[var(--bb-text)]'}`}>
          <p className={`font-medium mb-1 ${solved ? 'text-[var(--bb-green)]' : 'text-[var(--bb-red)]'}`}>{solved ? 'Correct!' : 'Try again.'}</p>
          <p>{typedFeedback}</p>
        </div>
      ) : selectedIndex !== null && (
        <div
          className={`border px-3 py-2 text-xs leading-relaxed ${
            solved
              ? 'border-[var(--bb-green)]/40 bg-[rgba(0,244,142,0.04)] text-[var(--bb-text)]'
              : 'border-[var(--bb-red)]/40 bg-[rgba(255,59,48,0.04)] text-[var(--bb-text)]'
          }`}
        >
          <p className={`font-medium mb-1 ${solved ? 'text-[var(--bb-green)]' : 'text-[var(--bb-red)]'}`}>
            {solved ? 'Correct!' : 'Not quite.'}
          </p>
          <p>{options[selectedIndex].reason}</p>
        </div>
      )}

      {/* Continue button */}
      {solved && (
        <button
          onClick={() => onComplete({ firstTry: wrongAttempts.length === 0 })}
          className="bb-btn bb-btn-green mt-4 text-xs w-full"
        >
          Continue →
        </button>
      )}
    </div>
  );
}

export default function PracticeScreen({ nodeId, onContinue, onBack, recommendations = [], onLaunchRecommendation }) {
  const node = ROADMAP_NODE_MAP[nodeId];
  const challenges = getPracticeForNode(nodeId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);

  if (!node) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24">
        <button onClick={onBack} className="bb-btn bb-btn-ghost text-xs mb-4">
          ← Back
        </button>
        <p className="text-sm text-[var(--bb-muted)]">Topic not found.</p>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24">
        <button
          onClick={() => { sfx.select(); onBack(); }}
          className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
        >
          ← Back
        </button>

        <div className="border border-[var(--bb-line)] bg-black/20 p-6 text-center">
          <p className="text-sm text-[var(--bb-muted)] mb-4">
            No practice checks are registered for <strong className="text-[var(--bb-text)]">{node.label}</strong> yet.
          </p>
          <p className="text-xs text-[var(--bb-muted)]">Return to the topic hub; progression stays here until practice challenges are available.</p>
        </div>
      </div>
    );
  }

  const currentChallenge = challenges[currentIndex];
  const isLastChallenge = currentIndex === challenges.length - 1;

  const handleChallengeComplete = (result) => {
    const newResults = [...results, result];
    setResults(newResults);

    if (isLastChallenge) {
      // All challenges complete
      setTimeout(() => {
        sfx.select();
        onContinue();
      }, 800);
    } else {
      // Move to next challenge
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 600);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      {recommendations.length > 0 && <div className="mb-6"><PracticeRecommendations recommendations={recommendations} onLaunch={onLaunchRecommendation} compact title="Recommended for this chapter" /></div>}
      {/* Header */}
      <button
        onClick={() => { sfx.select(); onBack(); }}
        className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
      >
        ← Back to Patterns
      </button>

      <div className="border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-4 mb-3">
          <span className="font-mono text-3xl text-[var(--bb-green)] leading-none mt-1">
            {node.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)] mb-1">
              Practice Challenge
            </p>
            <h1 className="text-2xl font-bold text-[var(--bb-text)] leading-tight">
              Test Your Understanding
            </h1>
          </div>
          <span className="text-[9px] uppercase tracking-widest border border-[var(--bb-green-dim)] px-2 py-1 text-[var(--bb-green)] font-mono shrink-0">
            Step 4
          </span>
        </div>
        <p className="text-xs text-[var(--bb-muted)]">
          Quick checks to verify you understand when and how to apply {node.label}.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[var(--bb-muted)] mb-2">
          <span>Challenge {currentIndex + 1} of {challenges.length}</span>
          <span>{results.length} completed</span>
        </div>
        <div className="h-1 w-full bg-black/60 border border-[var(--bb-line)]">
          <div
            className="h-full bg-[var(--bb-green)] transition-all duration-500"
            style={{ width: `${((currentIndex) / challenges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current challenge */}
      <PracticeChallenge
        key={currentChallenge.id}
        challenge={currentChallenge}
        onComplete={handleChallengeComplete}
      />

      {/* Back button */}
      <div className="mt-6">
        <button
          onClick={() => { sfx.select(); onBack(); }}
          className="bb-btn bb-btn-ghost text-xs"
        >
          ← Back to Patterns
        </button>
      </div>
    </div>
  );
}
