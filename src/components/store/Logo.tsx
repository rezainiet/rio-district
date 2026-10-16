/** Vector monogram and compact fashion wordmark; sharp at every display size. */
export function Logo({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`rio-logo ${className}`} aria-label={name}>
    <svg className="rio-monogram" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M4 13 24 2l20 11v22L24 46 4 35Z" stroke="currentColor" strokeWidth="1" />
      <path d="M14 34V14h9c9 0 9 11 0 11h-9m9 0 10 9M28 14h2c12 0 12 20 0 20h-2" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
    </svg>
    <span className="rio-wordmark" aria-hidden="true"><span>RIO</span><span>DISTRICT</span></span>
  </span>;
}
