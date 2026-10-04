// Typewriter text — terminal-style reveal
import { useEffect, useState } from 'react';
import { sfx } from '../game/sfx.js';

export default function Type({ text, speed = 14, className = '', tick = false, onDone }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    if (!text) return;
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          onDone?.();
          return v;
        }
        if (tick && v % 3 === 0) sfx.tick();
        return v + 1;
      });
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  return (
    <span className={className}>
      {text.slice(0, n)}
      {n < text.length && <span className="anim-blink text-[var(--bb-green)]">▌</span>}
    </span>
  );
}
