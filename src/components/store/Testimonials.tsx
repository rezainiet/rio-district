import { StarIcon } from "@/components/ui/icons";

type T = { id: string; author: string; text: string; rating: number; verified: boolean };

/** Renders only testimonials an admin has published. No aggregate score is invented. */
export function Testimonials({ items, title = "Ce qu'ils en disent." }: { items: T[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section id="avis" aria-labelledby="avis-title" className="border-t border-line py-20 md:py-28">
      <div className="container-x">
        <p className="eyebrow text-muted">Avis clients</p>
        <h2 id="avis-title" className="display mt-3 text-5xl md:text-7xl">{title}</h2>
      </div>
      <ul className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex w-[82%] shrink-0 snap-start flex-col justify-between rounded-[var(--radius-md)] border border-line bg-[#fbf9f4] p-6 sm:w-[360px]"
          >
            <div>
              <div className="flex gap-0.5 text-ink" aria-label={`${t.rating} sur 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} width={14} height={14} className={i < t.rating ? "" : "opacity-20"} />
                ))}
              </div>
              <blockquote className="mt-4 text-[15px] leading-relaxed">“{t.text}”</blockquote>
            </div>
            <p className="mt-6 text-sm font-semibold">
              {t.author}
              {t.verified && <span className="eyebrow ml-2 text-[10px] text-brand">Achat vérifié</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
