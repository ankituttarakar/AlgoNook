// Boot / title screen — first contact with the machine
import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';

const BOOT_LINES = [
  'ALGONOOK MAINFRAME v2.6 — COLD BOOT',
  'MEMCHECK .............. 640K OK',
  'GRID LINK ............. ESTABLISHED',
  '14 SECTORS ............ LOCATED',
  'OPERATOR .............. REQUIRED',
];

export default function BootScreen({ onStart }) {
  const { save, setCallsign } = useGame();
  const [line, setLine] = useState(0);
  const [name, setName] = useState(save.callsign === 'OPERATOR' ? '' : save.callsign);

  useEffect(() => {
    sfx.boot();
    if (line >= BOOT_LINES.length) return;
    const id = setTimeout(() => setLine((v) => v + 1), 380);
    return () => clearTimeout(id);
  }, [line]);

  const ready = line >= BOOT_LINES.length;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <pre className="font-crt mx-auto w-fit text-center text-[clamp(0.55rem,3.9vw,1.35rem)] leading-[1.05] text-[var(--bb-green)] bb-glow select-none">
{` █████╗ ██╗      ██████╗  ██████╗ 
██╔══██╗██║     ██╔════╝ ██╔═══██╗
███████║██║     ██║  ███╗██║   ██║
██╔══██║██║     ██║   ██║██║   ██║
██║  ██║███████╗╚██████╔╝╚██████╔╝
╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ 
███╗   ██╗ ██████╗  ██████╗ ██╗  ██╗
████╗  ██║██╔═══██╗██╔═══██╗██║ ██╔╝
██╔██╗ ██║██║   ██║██║   ██║█████╔╝ 
██║╚██╗██║██║   ██║██║   ██║██╔═██╗ 
██║ ╚████║╚██████╔╝╚██████╔╝██║  ██╗
╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝`}
        </pre>

        <div className="bb-panel mt-8 p-4 text-sm">
          {BOOT_LINES.slice(0, line).map((l, i) => (
            <div key={i} className="anim-rise text-[var(--bb-green-dim)]">
              <span className="text-[var(--bb-green-faint)]">&gt;</span> {l}
            </div>
          ))}
          {!ready && <span className="anim-blink text-[var(--bb-green)]">▌</span>}

          {ready && (
            <div className="anim-pop mt-4 border-t border-[var(--bb-line)] pt-4">
              <label className="mb-2 block text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
                Enter callsign
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_-]/gi, '').slice(0, 14))}
                placeholder="OPERATOR"
                className="w-full border border-[var(--bb-line)] bg-black/60 px-3 py-2.5 text-[var(--bb-green)] outline-none placeholder:text-[var(--bb-green-faint)] focus:border-[var(--bb-green)]"
              />
              <button
                className="bb-btn bb-btn-green anim-pulse-glow mt-4 w-full"
                onClick={() => {
                  setCallsign(name || 'OPERATOR');
                  sfx.unlock();
                  onStart();
                }}
              >
                ▶ Jack In
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
          42 missions · 14 sectors · one mainframe
        </p>
      </div>
    </div>
  );
}
