const slug = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A page-sized environment with decorative layers isolated from page controls. */
export function PageScene({ scene = 'learning-room', world, children, className = '' }) {
  return (
    <div className={`page-scene scene-${slug(scene)} ${world ? `world-${slug(world)}` : ''} ${className}`}>
      <div className="environment-background" aria-hidden="true">
        <span className="environment-orb environment-orb-one" />
        <span className="environment-orb environment-orb-two" />
        <span className="environment-contour" />
      </div>
      <div className="page-scene-content">{children}</div>
    </div>
  );
}

/** Reusable raised surface for important content inside a scene. */
export function FloatingPanel({ as: Element = 'div', className = '', children, ...props }) {
  return <Element className={`floating-panel ${className}`} {...props}>{children}</Element>;
}

/** A depth-aware interactive card used for destinations in the learning world. */
export function WorldCard({ className = '', children, ...props }) {
  return <button className={`world-card ${className}`} {...props}>{children}</button>;
}
