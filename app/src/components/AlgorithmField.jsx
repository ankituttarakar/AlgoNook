/** Decorative learning-path artwork shared by the public landing and Home dashboard. */
export default function AlgorithmField({ subtle = false }) {
  return (
    <svg
      className={`algorithm-field${subtle ? ' algorithm-field-subtle' : ''}`}
      viewBox="0 0 640 460"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="algorithm-core" cx="0" cy="0" r="1" gradientTransform="translate(358 228) rotate(90) scale(106)">
          <stop stopColor="var(--bb-cyan)" stopOpacity=".22" />
          <stop offset="1" stopColor="var(--bb-cyan)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="algorithm-path-lime" x1="94" y1="104" x2="534" y2="366" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--bb-green)" stopOpacity=".12" />
          <stop offset=".55" stopColor="var(--bb-green)" stopOpacity=".86" />
          <stop offset="1" stopColor="var(--bb-cyan)" stopOpacity=".25" />
        </linearGradient>
        <linearGradient id="algorithm-path-cyan" x1="548" y1="83" x2="101" y2="382" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--bb-cyan)" stopOpacity=".72" />
          <stop offset="1" stopColor="var(--bb-cyan)" stopOpacity=".12" />
        </linearGradient>
        <filter id="algorithm-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <circle cx="358" cy="228" r="106" fill="url(#algorithm-core)" />
      <g className="algorithm-orbits" stroke="var(--bb-cyan)" strokeOpacity=".12">
        <ellipse cx="358" cy="228" rx="224" ry="93" transform="rotate(-24 358 228)" />
        <ellipse cx="358" cy="228" rx="163" ry="222" transform="rotate(34 358 228)" />
        <circle cx="358" cy="228" r="72" />
      </g>

      <g className="algorithm-routes" strokeLinecap="round" strokeLinejoin="round">
        <path className="algorithm-route algorithm-route-lime" d="M73 112H176L252 166H316L358 228L424 267H526" stroke="url(#algorithm-path-lime)" strokeWidth="2" />
        <path className="algorithm-route algorithm-route-cyan" d="M110 350H208L265 293L316 266L358 228L408 170H506L562 105" stroke="url(#algorithm-path-cyan)" strokeWidth="1.6" />
        <path d="M250 61V124L316 166L358 228L348 310L405 368" stroke="var(--bb-amber)" strokeOpacity=".38" strokeWidth="1.3" />
        <path d="M73 112L123 177L208 208L265 293M506 105L477 207L526 267L565 332" stroke="var(--bb-cyan)" strokeOpacity=".22" strokeWidth="1" />
      </g>

      <g className="algorithm-nodes">
        <circle cx="73" cy="112" r="5" fill="var(--bb-green)" />
        <circle cx="176" cy="112" r="4" fill="var(--bb-cyan)" />
        <circle cx="250" cy="61" r="5" fill="var(--bb-amber)" />
        <circle cx="110" cy="350" r="5" fill="var(--bb-cyan)" />
        <circle cx="208" cy="350" r="4" fill="var(--bb-green)" />
        <circle cx="506" cy="105" r="5" fill="var(--bb-green)" />
        <circle cx="562" cy="105" r="4" fill="var(--bb-amber)" />
        <circle cx="526" cy="267" r="5" fill="var(--bb-cyan)" />
        <circle cx="405" cy="368" r="5" fill="var(--bb-green)" />
      </g>

      <circle className="algorithm-core-glow" cx="358" cy="228" r="28" fill="var(--bb-cyan)" filter="url(#algorithm-glow)" />
      <circle cx="358" cy="228" r="19" fill="#10272e" stroke="var(--bb-green)" strokeOpacity=".86" />
      <circle className="algorithm-core-dot" cx="358" cy="228" r="5" fill="var(--bb-green)" />
      <path d="M348 228h20M358 218v20" stroke="var(--bb-text)" strokeOpacity=".76" strokeWidth="1" />

      <g className="algorithm-labels" fill="var(--bb-muted)" fontFamily="DM Mono, monospace" fontSize="9" letterSpacing="1.6">
        <text x="51" y="91">INPUT</text>
        <text x="490" y="84">TRACE</text>
        <text x="523" y="354">INSIGHT</text>
      </g>
    </svg>
  );
}
