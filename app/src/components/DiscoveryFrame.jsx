/** Shared CRT field console for challenges that reveal information through play. */
export default function DiscoveryFrame({
  context,
  title,
  objective,
  children,
  evidence,
  evidenceLabel = 'Inspect field notes',
}) {
  return (
    <section className="overflow-hidden border border-[var(--bb-line)] bg-[var(--bb-panel)]">
      <header className="border-b border-[var(--bb-line)] bg-black/40 px-4 py-3">
        <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--bb-amber)]">
          {context}
        </div>
        <h2 className="font-crt mt-1 text-2xl leading-none text-[var(--bb-green)]">
          {title}
        </h2>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="border-l-2 border-[var(--bb-green)] bg-[rgba(0,244,142,0.05)] px-3 py-2.5">
          <div className="mb-1 text-[9px] uppercase tracking-widest text-[var(--bb-green-dim)]">
            Objective
          </div>
          <p className="text-xs leading-relaxed text-[var(--bb-text)] sm:text-sm">{objective}</p>
        </div>

        <div className="border border-[var(--bb-line)] bg-black/30 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 text-[9px] uppercase tracking-widest text-[var(--bb-muted)]">
            <span className="h-1.5 w-1.5 bg-[var(--bb-amber)]" />
            Active console · interact to investigate
          </div>
          {children}
        </div>

        {evidence && (
          <details className="group border border-[var(--bb-line)] bg-black/20">
            <summary className="cursor-pointer list-none px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--bb-amber)] hover:bg-[rgba(255,176,0,0.05)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--bb-amber)]">
              <span className="mr-2 text-[var(--bb-green)] group-open:hidden">＋</span>
              <span className="mr-2 hidden text-[var(--bb-green)] group-open:inline">−</span>
              {evidenceLabel}
            </summary>
            <div className="border-t border-[var(--bb-line)] px-3 py-3 text-xs leading-relaxed text-[var(--bb-muted)]">
              {evidence}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
