/** Thin announcement strip (Dark Premium). Text comes from Admin → Réglages, messages separated by "·". */
export function AnnouncementBar({ text }: { text: string }) {
  const parts = text.split("·").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="border-b border-line" data-announcement>
      <p className="container-x flex h-10 items-center justify-center text-center text-[12.5px] tracking-[0.06em] text-muted">
        {parts.map((p, i) => (
          <span key={i} className={i > 0 ? "hidden items-center sm:flex" : "flex items-center"}>
            {i > 0 && (
              <span className="mx-[18px] text-[9px] text-brand" aria-hidden>
                ✦
              </span>
            )}
            {p}
          </span>
        ))}
      </p>
    </div>
  );
}
