import { useMemo, useState } from 'react';

const SERIES = [
  { label: 'O(1)', color: '#00f48e', value: () => 1 },
  { label: 'O(log n)', color: '#22d3ee', value: (n) => Math.log2(Math.max(2, n)) },
  { label: 'O(n)', color: '#ffb000', value: (n) => n },
  { label: 'O(n log n)', color: '#fb923c', value: (n) => n * Math.log2(Math.max(2, n)) },
  { label: 'O(n²)', color: '#ff5252', value: (n) => n * n },
];

const formatCount = (count) => new Intl.NumberFormat('en-US').format(Math.round(count));

export default function ComplexityGrowthViz() {
  const [inputSize, setInputSize] = useState(100);
  const chart = useMemo(() => {
    const width = 680;
    const height = 280;
    const left = 56;
    const right = 18;
    const top = 18;
    const bottom = 38;
    const maxY = Math.log10(SERIES.at(-1).value(inputSize) + 1);
    const pathFor = (series) => {
      const samples = 70;
      return Array.from({ length: samples }, (_, index) => {
        const n = Math.max(1, 1 + ((inputSize - 1) * index) / (samples - 1));
        const x = left + (index / (samples - 1)) * (width - left - right);
        const y = top + (1 - Math.log10(series.value(n) + 1) / maxY) * (height - top - bottom);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    };
    return { width, height, left, right, top, bottom, pathFor };
  }, [inputSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor="complexity-input-size" className="block text-xs font-medium text-[var(--bb-text)]">Compare input sizes</label>
          <p className="mt-1 text-[10px] text-[var(--bb-muted)]">Change n and inspect how the work grows.</p>
        </div>
        <output htmlFor="complexity-input-size" className="font-mono text-sm text-[var(--bb-green)]">n = {inputSize}</output>
      </div>
      <input
        id="complexity-input-size"
        aria-label="Input size n"
        type="range"
        min="10"
        max="500"
        step="10"
        value={inputSize}
        onChange={(event) => setInputSize(Number(event.target.value))}
        className="w-full accent-[var(--bb-green)]"
      />
      <div className="overflow-x-auto border border-[var(--bb-line)] bg-black/30 p-2">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`Growth comparison at input size ${inputSize}; vertical axis is logarithmic`} className="min-w-[540px] w-full">
          <text x="12" y="18" fill="#a1a1aa" fontSize="10">operations · log scale</text>
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = chart.top + (tick / 4) * (chart.height - chart.top - chart.bottom);
            return <g key={tick}><line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} stroke="#27272a" strokeDasharray="3 4" /><text x={chart.left - 8} y={y + 3} fill="#71717a" fontSize="9" textAnchor="end">10^{Math.round((1 - tick / 4) * Math.log10(inputSize * inputSize + 1))}</text></g>;
          })}
          <line x1={chart.left} x2={chart.width - chart.right} y1={chart.height - chart.bottom} y2={chart.height - chart.bottom} stroke="#52525b" />
          <text x={chart.width / 2} y={chart.height - 7} fill="#a1a1aa" fontSize="10" textAnchor="middle">input size n</text>
          {SERIES.map((series) => <path key={series.label} d={chart.pathFor(series)} fill="none" stroke={series.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />)}
        </svg>
      </div>
      <p className="text-[10px] text-[var(--bb-muted)]">The vertical axis is logarithmic so slower-growing curves remain visible beside O(n²).</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SERIES.map((series) => (
          <li key={series.label} className="flex items-center justify-between border border-[var(--bb-line)] bg-black/20 px-3 py-2 text-xs">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} /><code className="font-mono">{series.label}</code></span>
            <span className="font-mono text-[var(--bb-muted)]">~{formatCount(series.value(inputSize))}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-[var(--bb-muted)]">These counts compare representative growth functions; actual runtimes also depend on constants, hardware, and implementation.</p>
    </div>
  );
}
