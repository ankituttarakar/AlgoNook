import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';

export default function Hud({ location }) {
  const { save, level, levelInfo, title, toggleSound } = useGame();
  const pct = Math.min(100, Math.round((levelInfo.into / levelInfo.span) * 100));

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--bb-line)] bg-[rgba(6,8,7,0.92)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-crt text-xl leading-none text-[var(--bb-green)] bb-glow">AlgoNook</span>
          <span className="hidden text-[10px] uppercase tracking-widest text-[var(--bb-muted)] sm:inline">
            {location}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
              {save.callsign} · LV {level} {title}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-28 border border-[var(--bb-line)] bg-black/60 sm:w-40">
                <div
                  className="h-full bg-[var(--bb-amber)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-[var(--bb-amber)]">
                {levelInfo.into}/{levelInfo.span} XP
              </span>
            </div>
          </div>

          {/* Clerk Auth Controls */}
          <div className="flex items-center gap-2 border-l border-[var(--bb-line)] pl-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  onClick={() => sfx.select()}
                  className="bb-btn bb-btn-ghost !min-h-0 !px-2.5 !py-1 text-[11px]"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  onClick={() => sfx.select()}
                  className="bb-btn bb-btn-green !min-h-0 !px-2.5 !py-1 text-[11px]"
                >
                  Sign up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-7 h-7 border border-[var(--bb-green)]',
                  },
                }}
              />
            </Show>
          </div>

          <button
            onClick={() => { toggleSound(); sfx.select(); }}
            className="bb-btn bb-btn-ghost !min-h-0 !px-2 !py-1 text-xs"
            aria-label="Toggle sound"
            title="Toggle sound"
          >
            {save.sound ? 'SND:ON' : 'SND:OFF'}
          </button>
        </div>
      </div>
    </header>
  );
}
