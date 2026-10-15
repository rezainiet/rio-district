/** Thin promotional strip. Text comes from Admin → Réglages. */
export function AnnouncementBar({ text }: { text: string }) {
  const parts = text.split("·").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="bg-ink text-paper">
      <div className="container-x flex h-9 items-center justify-center overflow-hidden">
        {/* Static on desktop, gently scrolling on narrow screens if needed */}
        <p className="eyebrow hidden items-center gap-6 text-[10.5px] text-paper/90 lg:flex">
          {parts.map((p, i) => (
            <span key={i} className="flex items-center gap-6">
              {i > 0 && <span className="size-1 rounded-full bg-lime" aria-hidden />}
              {p}
            </span>
          ))}
        </p>
        <div className="relative w-full overflow-hidden lg:hidden">
          <span className="sr-only">{text}</span>
          <div className="flex w-max animate-marquee gap-8" aria-hidden>
            {[...parts, ...parts, ...parts, ...parts].map((p, i) => (
              <span key={i} className="eyebrow flex items-center gap-8 text-[10.5px] text-paper/90">
                {p}
                <span className="size-1 rounded-full bg-lime" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
