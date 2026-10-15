import Image from "next/image";
import Link from "next/link";
import { getActiveProducts, getPublishedTestimonials, getSettings } from "@/lib/catalog";
import { formatEUR, percentOff } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import { ProductCard } from "@/components/store/ProductCard";
import { Faq, faqJsonLd } from "@/components/store/Faq";
import { Testimonials } from "@/components/store/Testimonials";
import { ContactForm } from "@/components/store/ContactForm";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight, PaletteIcon, ReturnIcon, RulerIcon, TruckIcon } from "@/components/ui/icons";

export default async function HomePage() {
  const [settings, products, testimonials] = await Promise.all([
    getSettings(),
    getActiveProducts(),
    getPublishedTestimonials(),
  ]);
  const { bundle } = settings;
  const lead = products[0];
  const minPrice = products.length ? Math.min(...products.map((p) => p.priceCents)) : 0;
  const bundleFull = minPrice * bundle.quantity;
  const bundleSavings = Math.max(0, bundleFull - bundle.priceCents);
  const showBundle = bundle.enabled && settings.promotion.enabled && products.some((p) => p.bundleEligible);
  const packHref = lead ? `/produit/${lead.slug}?offre=pack#acheter` : "/#collection";

  const hasPlaceholders = products.some((p) => p.images.some((i) => i.kind === "placeholder"));

  const benefits = [
    { icon: TruckIcon, title: "Livraison offerte", text: settings.shipping.summary },
    { icon: ReturnIcon, title: "Retours 14 jours", text: settings.returns.summary },
    { icon: RulerIcon, title: "Du XS au 3XL", text: "Guide des tailles et simulateur sur chaque fiche." },
    { icon: PaletteIcon, title: "Mix & match", text: `${bundle.quantity} couleurs au choix dans un même pack.` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(settings.faq)).replace(/</g, "\\u003c") }}
      />

      {/* ---------- HERO ---------- */}
      <section aria-labelledby="hero-title">
        <div className="container-x grid gap-6 pt-6 lg:grid-cols-12 lg:items-end lg:gap-x-10 lg:gap-y-10 md:pt-12">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-2 text-muted">
              <span className="inline-block h-px w-8 bg-ink" aria-hidden />
              Collection Brésil · {products.length} coloris
            </p>
            <h1 id="hero-title" className="display mt-4 text-[clamp(72px,22vw,132px)] md:text-[clamp(112px,13.5vw,204px)]">
              Vestes
              <br />
              Brésil<span className="text-brand">.</span>
            </h1>
          </div>
          <div className="order-3 lg:order-none lg:col-span-5 lg:pb-2">
            <p className="max-w-md text-[17px] leading-relaxed text-ink-2">
              Coupe-vent léger, coupe ample, zip intégral. Une seule coupe, six couleurs<span className="max-md:hidden"> — et deux vestes au choix pour le prix d&apos;un pack</span>.
            </p>
            <dl className="mt-6 grid grid-cols-2 border-y border-line">
              <div className="py-4 pr-4">
                <dt className="eyebrow text-muted">La veste</dt>
                <dd className="price mt-1 text-4xl">{formatEUR(minPrice)}</dd>
              </div>
              {bundle.enabled && (
                <div className="border-l border-line py-4 pl-5">
                  <dt className="eyebrow text-brand">Les {bundle.quantity}, au choix</dt>
                  <dd className="price mt-1 text-4xl text-brand">{formatEUR(bundle.priceCents)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ButtonLink href="/#collection" size="lg" className="w-full">
                Choisir ma couleur <ArrowRight width={16} height={16} />
              </ButtonLink>
              {showBundle && (
                <ButtonLink href={packHref} size="lg" variant="outline" className="w-full">
                  Composer mon pack
                </ButtonLink>
              )}
            </div>
          </div>

          {/* Studio lineup: every colour visible at once, each tile opens its product. */}
          <div className="order-2 lg:order-none lg:col-span-12">
          <ul className="grid grid-cols-3 overflow-hidden rounded-[var(--radius-md)] bg-studio md:grid-cols-6" aria-label="Les coloris">
            {products.slice(0, 6).map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/produit/${p.slug}`}
                  className="group block focus-visible:outline-offset-[-4px]"
                  aria-label={`${p.name}, ${formatEUR(p.priceCents)}`}
                >
                  <span className="relative block aspect-[4/5] overflow-hidden">
                    {p.images[0] && (
                      <Image
                        src={p.images[0].url}
                        alt=""
                        fill
                        priority={i < 3}
                        sizes="(min-width: 768px) 16vw, 33vw"
                        className={`object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] ${artClass(p.images[0], "hero")}`}
                      />
                    )}
                  </span>
                  <span className="flex items-baseline justify-between gap-2 px-3 pb-3 md:px-4 md:pb-4">
                    <span className="eyebrow text-[10px] text-ink">{p.color.name}</span>
                    <span className="price hidden text-sm text-ink-2 lg:inline">{formatEUR(p.priceCents)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {hasPlaceholders && (
            <p className="mt-2 text-xs text-muted">Illustrations provisoires — les photos officielles arrivent bientôt.</p>
          )}
          </div>
        </div>
      </section>

      {/* ---------- BENEFITS ---------- */}
      <section aria-label="Nos engagements" className="mt-12 border-y border-line md:mt-16">
        <ul className="container-x grid grid-cols-2 gap-x-6 gap-y-7 py-8 md:grid-cols-4 md:py-10">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2 md:flex-row md:gap-4">
              <Icon className="shrink-0 text-brand" width={24} height={24} />
              <div>
                <p className="font-display text-[15px] font-bold uppercase [font-variation-settings:'wdth'_90]">{title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- COLLECTION ---------- */}
      <section id="collection" aria-labelledby="collection-title" className="container-x py-16 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-muted">{products.length} coloris disponibles</p>
            <h2 id="collection-title" className="display mt-3 text-6xl md:text-7xl lg:text-8xl">
              Trouve la tienne.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-2">
            Même coupe, même prix, six humeurs. Chaque coloris a sa fiche — et tu peux en mélanger deux dans un pack.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="mt-12 rounded-[var(--radius-md)] border border-dashed border-line-strong p-10 text-center text-muted">
            La collection arrive bientôt.
          </p>
        ) : (
          <ul className="mt-12 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-14">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} bundle={bundle} priority={i < 2} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- BUNDLE ---------- */}
      {showBundle && (
        <section id="pack" aria-labelledby="pack-title" className="grain relative overflow-hidden bg-ink text-paper">
          <div className="container-x grid items-center gap-12 py-16 lg:grid-cols-12 md:py-28">
            <div className="lg:col-span-6">
              <p className="eyebrow text-lime">{bundle.label}</p>
              <h2 id="pack-title" className="display mt-4 text-6xl md:text-7xl lg:text-8xl">
                {settings.promotion.headline}
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-paper/75">{settings.promotion.text}</p>

              <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-3">
                <p className="price text-6xl text-lime md:text-7xl">{formatEUR(bundle.priceCents)}</p>
                <div className="pb-2">
                  <p className="text-sm text-paper/50 line-through">{formatEUR(bundleFull)}</p>
                  <p className="eyebrow text-paper">
                    −{percentOff(bundleFull, bundle.priceCents)} % · {formatEUR(bundleSavings)} d&apos;économie
                  </p>
                </div>
              </div>

              <ol className="mt-8 grid gap-3 text-sm text-paper/80 sm:grid-cols-3">
                {["Choisis 2 coloris", "Une taille pour chacune", "Envoie ta demande"].map((step, i) => (
                  <li key={step} className="flex items-center gap-3 border-t border-paper/15 pt-3">
                    <span className="eyebrow text-lime">0{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>

              <ButtonLink href={packHref} variant="lime" size="lg" className="mt-10">
                Composer mon pack <ArrowRight width={16} height={16} />
              </ButtonLink>
            </div>

            <div className="relative lg:col-span-6">
              <div className="mx-auto flex max-w-[340px] items-center justify-center md:max-w-[520px]">
                {[products[3] ?? products[0], products[4] ?? products[1]].map((p, i) =>
                  p ? (
                    <div
                      key={p.id + i}
                      className={`relative aspect-[4/5] w-1/2 overflow-hidden rounded-[var(--radius-md)] bg-studio shadow-[var(--shadow-pop)] ${i === 0 ? "-rotate-3 translate-y-4" : "rotate-3 -ml-6"}`}
                    >
                      <Image src={p.images[0]?.url ?? ""} alt={p.images[0]?.alt ?? p.name} fill sizes="(min-width: 768px) 25vw, 50vw" className={`object-cover ${artClass(p.images[0], "pack")}`} />
                    </div>
                  ) : null,
                )}
              </div>
              <span className="display absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-5xl text-ink md:size-20" aria-hidden>
                +
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ---------- DETAILS / EDITORIAL ---------- */}
      {lead && (
        <section id="details" aria-labelledby="details-title" className="container-x py-16 md:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-12 md:gap-12">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-studio lg:col-span-6 lg:aspect-[4/5]">
              <Image
                src={lead.images[2]?.url ?? lead.images[0]?.url ?? ""}
                alt={lead.images[2]?.alt ?? lead.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <p className="eyebrow text-muted">La veste</p>
              <h2 id="details-title" className="display mt-3 text-[64px] md:text-7xl lg:text-8xl">
                Légère.
                <br />
                Ample.
                <br />
                <span className="text-brand">Zippée.</span>
              </h2>
              <p className="mt-6 text-[17px] leading-relaxed text-ink-2">{lead.description}</p>
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {lead.details.map((d, i) => (
                  <li key={d} className="flex items-center gap-5 py-4">
                    <span className="eyebrow w-6 text-muted">0{i + 1}</span>
                    <span className="font-display text-lg font-semibold uppercase [font-variation-settings:'wdth'_90]">{d}</span>
                  </li>
                ))}
              </ul>
              {lead.material && <p className="mt-6 text-sm text-muted">Composition : {lead.material}</p>}
            </div>
          </div>
        </section>
      )}

      <Testimonials items={testimonials} />

      <Faq items={settings.faq} />

      {/* ---------- CONTACT ---------- */}
      <section id="contact" aria-labelledby="contact-title" className="bg-brand text-paper">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-12 md:py-28">
          <div className="lg:col-span-5">
            <p className="eyebrow text-lime">Contact</p>
            <h2 id="contact-title" className="display mt-3 text-6xl md:text-7xl lg:text-8xl">
              Une question ?
            </h2>
            <p className="mt-6 max-w-sm text-[17px] leading-relaxed text-paper/80">
              Une hésitation sur la taille, une commande, un échange : laisse-nous ton e-mail et ton message, on te répond
              au plus vite.
            </p>
            <a href={`mailto:${settings.contactEmail}`} className="link-underline mt-6 inline-block text-sm text-paper">
              {settings.contactEmail}
            </a>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
