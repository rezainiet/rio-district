import type { FaqItem } from "@/lib/defaults";
import { PlusIcon } from "@/components/ui/icons";

export function Faq({ items, id = "faq" }: { items: FaqItem[]; id?: string }) {
  if (items.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="container-x py-20 md:py-28">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow text-muted">FAQ</p>
          <h2 id={`${id}-title`} className="display mt-3 text-5xl md:text-7xl">
            Questions
            <br />
            fréquentes.
          </h2>
        </div>
        <div className="faq divide-y divide-line border-y border-line lg:col-span-8">
          {items.map((item, i) => (
            <details key={i} className="group">
              <summary className="flex min-h-16 list-none items-center justify-between gap-6 py-5 text-left">
                <span className="font-display text-lg font-semibold [font-variation-settings:'wdth'_92] md:text-xl">{item.question}</span>
                <span className="faq-icon grid size-9 shrink-0 place-items-center rounded-full border border-line-strong transition-transform duration-300 group-hover:border-ink">
                  <PlusIcon width={16} height={16} />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 text-[15px] leading-relaxed text-ink-2">{item.answer}</p>
            </details>
          ))}
        </div>
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
