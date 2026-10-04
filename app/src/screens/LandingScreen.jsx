import { SignInButton, SignUpButton } from '@clerk/react';
import { sfx } from '../game/sfx.js';

export default function LandingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      {/* Top Mainframe / System Status Header */}
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between border-b border-[var(--bb-line)] pb-3 text-xs uppercase tracking-widest text-[var(--bb-muted)]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--bb-green)] anim-pulse-glow" />
            <span>MAINFRAME // PUBLIC_PORTAL</span>
          </div>
          <div>AUTH_STATUS: REQUIRED</div>
        </div>

        {/* Hero Branding Section */}
        <div className="text-center">
          <pre className="font-crt mx-auto w-fit text-center text-[clamp(0.48rem,3.2vw,1.15rem)] leading-[1.05] text-[var(--bb-green)] bb-glow select-none">
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

          <div className="mt-6 inline-block border border-[var(--bb-amber)]/40 bg-[var(--bb-amber)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--bb-amber)] bb-glow-amber">
            MASTER DSA. NOT JUST MEMORIZE IT.
          </div>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--bb-text)]/90 sm:text-base">
            AlgoNook is a cyberpunk algorithm terminal simulator. Experience data structures and algorithms through interactive visual execution, step-by-step memory inspections, and tactical problem scenarios.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SignUpButton mode="modal">
              <button
                onClick={() => sfx.select()}
                className="bb-btn bb-btn-green anim-pulse-glow w-full sm:w-auto sm:min-w-[200px]"
              >
                ▶ Create Account
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button
                onClick={() => sfx.select()}
                className="bb-btn bb-btn-ghost w-full sm:w-auto sm:min-w-[160px]"
              >
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>

        {/* 3 Core Value Pillars */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bb-panel p-5 transition-all hover:border-[var(--bb-green)]/60">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--bb-green)]">
              <span className="font-crt text-lg">01 //</span>
              <span>LEARN</span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--bb-muted)]">
              Dissect algorithms step-by-step with interactive state visualizations, memory pointer maps, and intuitive real-time breakdown.
            </p>
          </div>

          <div className="bb-panel p-5 transition-all hover:border-[var(--bb-amber)]/60">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--bb-amber)]">
              <span className="font-crt text-lg">02 //</span>
              <span>PRACTICE</span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--bb-muted)]">
              Tackle live cyber-grid challenges across 14 specialized sectors and 42 tactical missions designed for deep algorithmic comprehension.
            </p>
          </div>

          <div className="bb-panel p-5 transition-all hover:border-[var(--bb-green)]/60">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--bb-green)]">
              <span className="font-crt text-lg">03 //</span>
              <span>MASTER</span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--bb-muted)]">
              Reinforce problem-solving patterns with automated spaced repetition, persistent skill mastery tracking, and high-stakes debriefs.
            </p>
          </div>
        </div>

        {/* Terminal Footer Info */}
        <div className="mt-10 border-t border-[var(--bb-line)] pt-4 text-center text-[11px] uppercase tracking-widest text-[var(--bb-muted)]">
          42 missions · 14 sectors · spaced repetition · cyber mainframe
        </div>
      </div>
    </div>
  );
}
