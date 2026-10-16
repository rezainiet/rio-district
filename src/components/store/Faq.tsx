import type { FaqItem } from "@/lib/defaults";

/** FAQ panel (Dark Premium): accordion inside a rounded surface. The parent decides the layout. */
export function Faq({ items, id = "faq", className = "" }: { items: FaqItem[]; id?: string; className?: string }) {
  if (items.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 rounded-[18px] border border-line bg-paper-2 p-6 sm:p-10 ${className}`}>
      <p className="lab">FAQ</p>
      <h2 id={`${id}-title`} className="display mt-3 text-[24px] uppercase sm:text-[36px] lg:text-[44px]">
        Questions fréquentes
      </h2>
      <div className="faq mt-6">
        {items.map((item, i) => (
          <details key={i} className="group border-t border-line">
            <summary className="flex min-h-14 list-none items-center justify-between gap-6 py-4 text-left">
              <span className="text-[15px] font-medium sm:text-base">{item.question}</span>
              <span className="faq-icon shrink-0 text-xl leading-none text-brand transition-transform duration-300" aria-hidden>
                +
              </span>
            </summary>
            <p className="max-w-2xl pb-5 pr-10 text-[15px] leading-relaxed text-ink-2">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}
