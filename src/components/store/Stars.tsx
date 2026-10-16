import clsx from "clsx";

const PATH = "M12 2.8l2.75 5.7 6.25.9-4.5 4.4 1.05 6.2L12 17.05 6.45 20l1.05-6.2L3 9.4l6.25-.9z";

/**
 * Brass star rating. Supports fractional values (e.g. 4.6) by clipping the
 * filled layer; the empty layer stays as a faint outline.
 */
export function Stars({ value, size = 16, className, label }: { value: number; size?: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (filled: boolean) => (
    <span className="flex gap-[3px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
          <path
            d={PATH}
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeOpacity={filled ? 1 : 0.35}
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
  return (
    <span
      role="img"
      aria-label={label ?? `${value.toLocaleString("fr-FR")} sur 5`}
      className={clsx("relative inline-flex text-brand", className)}
    >
      {row(false)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row(true)}
      </span>
    </span>
  );
}
