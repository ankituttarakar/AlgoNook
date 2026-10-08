// Engine 3 — the Machine: drive a real stack or queue.
// Input items enter in fixed order; pops/dequeues must reproduce the target tape.
import { useState } from 'react';
import { sfx } from '../game/sfx.js';
import DiscoveryFrame from '../components/DiscoveryFrame.jsx';

export default function MachineChallenge({ challenge, onSolved, onMistake }) {
  const { mode, input, target } = challenge;
  const isStack = mode === 'stack';
  const noun = isStack ? ['PUSH', 'POP'] : ['ENQUEUE', 'DEQUEUE'];

  const [nextIdx, setNextIdx] = useState(0);
  const [container, setContainer] = useState([]);
  const [out, setOut] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [error, setError] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const solved = out.length === target.length;

  const reset = () => {
    setNextIdx(0);
    setContainer([]);
    setOut([]);
  };

  const insert = () => {
    if (solved || nextIdx >= input.length) return;
    setContainer((c) => [...c, input[nextIdx]]);
    setNextIdx((i) => i + 1);
    setError(null);
    sfx.push();
  };

  const eject = () => {
    if (solved) return;
    if (container.length === 0) {
      const msg = `The ${mode} is EMPTY — there is nothing to ${noun[1].toLowerCase()}.`;
      setError(msg);
      sfx.wrong();
      return;
    }
    const value = isStack ? container[container.length - 1] : container[0];
    const expected = target[out.length];
    if (value === expected) {
      const newOut = [...out, value];
      setOut(newOut);
      setContainer((c) => (isStack ? c.slice(0, -1) : c.slice(1)));
      setError(null);
      sfx.pop();
      if (newOut.length === target.length) {
        sfx.correct();
        onSolved({ firstTry: mistakes === 0, hintUsed: hintOpen });
      }
    } else {
      const msg = `${noun[1]} would emit ${value}, but the target tape needs ${expected} next. ${isStack ? 'That value was buried too deep — LIFO means whatever entered LAST leaves first.' : 'FIFO means whatever entered FIRST must leave first.'} Machine reset.`;
      setMistakes((m) => m + 1);
      setError(msg);
      sfx.wrong();
      onMistake(msg);
      reset();
    }
  };

  return (
    <DiscoveryFrame context={`${mode.toUpperCase()} SIMULATOR`} title="Operate the machine" objective={challenge.q || `Drive the ${mode.toUpperCase()} so the output tape reads exactly:`}>
      {/* target tape */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">TARGET</span>
        {target.map((v, i) => (
          <span
            key={i}
            className={`flex h-9 w-9 items-center justify-center border font-crt text-xl ${
              i < out.length
                ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.12)] text-[var(--bb-green)]'
                : 'border-[var(--bb-line)] text-[var(--bb-muted)]'
            }`}
          >
            {v}
          </span>
        ))}
      </div>

      {/* machine body */}
      <div className="bb-panel grid grid-cols-3 gap-3 p-3 text-center">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">Input</div>
          <div className="flex min-h-[44px] flex-wrap items-start justify-center gap-1.5">
            {input.slice(nextIdx).map((v, i) => (
              <span
                key={i}
                className={`flex h-9 w-9 items-center justify-center border font-crt text-xl ${
                  i === 0 ? 'border-[var(--bb-amber)] text-[var(--bb-amber)]' : 'border-[var(--bb-line)] text-[var(--bb-muted)]'
                }`}
              >
                {v}
              </span>
            ))}
            {nextIdx >= input.length && <span className="py-2 text-[10px] text-[var(--bb-green-faint)]">EMPTY</span>}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--bb-amber)]">
            {mode} {isStack ? '(top →)' : '(front →)'}
          </div>
          <div className="flex min-h-[44px] flex-wrap content-start items-start justify-center gap-1.5">
            {container.map((v, i) => (
              <span
                key={`${i}-${v}`}
                className="anim-pop flex h-9 w-9 items-center justify-center border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.07)] font-crt text-xl text-[var(--bb-green)]"
              >
                {v}
              </span>
            ))}
            {container.length === 0 && <span className="py-2 text-[10px] text-[var(--bb-green-faint)]">EMPTY</span>}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">Output</div>
          <div className="flex min-h-[44px] flex-wrap items-start justify-center gap-1.5">
            {out.map((v, i) => (
              <span key={i} className="anim-pop flex h-9 w-9 items-center justify-center border border-[var(--bb-green)] font-crt text-xl text-[var(--bb-green)]">
                {v}
              </span>
            ))}
            {out.length === 0 && <span className="py-2 text-[10px] text-[var(--bb-green-faint)]">—</span>}
          </div>
        </div>
      </div>

      {/* controls */}
      {!solved && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={insert}
            disabled={nextIdx >= input.length}
            className="bb-btn bb-btn-green"
          >
            ▼ {noun[0]} {nextIdx < input.length ? input[nextIdx] : '—'}
          </button>
          <button
            onClick={eject}
            disabled={container.length === 0}
            className="bb-btn bb-btn-amber"
          >
            ▲ {noun[1]} {container.length > 0 ? (isStack ? container[container.length - 1] : container[0]) : '—'}
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!solved && challenge.hint && !hintOpen && (
          <button
            onClick={() => { setHintOpen(true); sfx.hint(); }}
            className="bb-btn bb-btn-amber !min-h-0 !px-3 !py-1.5 text-[10px]"
          >
            ▚ Decrypt hint
          </button>
        )}
      </div>
      {hintOpen && !solved && (
        <p className="anim-rise mt-3 border border-[var(--bb-amber)]/40 bg-[rgba(255,176,0,0.06)] px-3 py-2 text-xs text-[var(--bb-amber)]">
          DECRYPTED HINT: {challenge.hint}
          <span className="ml-2 text-[10px] text-[var(--bb-muted)]">(first-try bonus forfeited)</span>
        </p>
      )}

      {error && !solved && (
        <div className="anim-shake mt-4 border border-[var(--bb-red)]/50 bg-[rgba(255,82,82,0.06)] px-3 py-2.5 text-xs leading-relaxed text-[var(--bb-red)]">
          <span className="font-bold">✗ JAMMED — </span>{error}
        </div>
      )}
      {solved && (
        <div className="anim-rise mt-4 border border-[var(--bb-green)]/50 bg-[rgba(0,244,142,0.06)] px-3 py-2.5 text-xs leading-relaxed text-[var(--bb-green)]">
          <span className="font-bold">✓ TAPE MATCHES — </span>{challenge.why}
        </div>
      )}
    </DiscoveryFrame>
  );
}
