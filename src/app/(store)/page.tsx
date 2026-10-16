import Image from "next/image";
import Link from "next/link";
import { getActiveProducts, getSettings } from "@/lib/catalog";
import { getStoreReviews } from "@/lib/reviews";
import { countdownFor } from "@/lib/marketing";
import { CountdownBand } from "@/components/store/Countdown";
import { formatEUR } from "@/lib/money";
import { ProductCard } from "@/components/store/ProductCard";
import { Faq, faqJsonLd } from "@/components/store/Faq";
import { Reviews } from "@/components/store/Reviews";
import { ContactForm } from "@/components/store/ContactForm";
import { ButtonLink } from "@/components/ui/Button";
import type { PublicProduct } from "@/lib/types";

/** Spotlit, rounded photo frame used across the Dark Premium homepage. */
function Shot({ product, className, sizes, priority }: { product?: PublicProduct; className: string; sizes: string; priority?: boolean }) {
  const img = product?.images[0];
  return (
    <div className={`shot ${className.includes("absolute") ? "" : "relative "}${className}`}>
      {img && <Image src={img.url} alt={img.alt || product!.name} fill sizes={sizes} priority={priority} className="object-cover" />}
    </div>
  );
}

export default async function HomePage() {
  const [settings, products] = await Promise.all([getSettings(), getActiveProducts()]);
  const storeReviews = await getStoreReviews(products);
  const countdown = countdownFor(settings.countdown, "home");
  const { bundle } = settings;
  // Pick a product by colour slug, falling back to position so any catalogue still renders.
  const pick = (slug: string, i: number) => products.find((p) => p.slug.endsWith(`-${slug}`)) ?? products[i % Math.max(1, products.length)];
  const hero = pick("noir", 0);
  const lead = products[0];
  const minPrice = products.length ? Math.min(...products.map((p) => p.priceCents)) : 0;
  const bundleFull = minPrice * bundle.quantity;
  const bundleSavings = Math.max(0, bundleFull - bundle.priceCents);
  const showBundle = bundle.enabled && settings.promotion.enabled && products.some((p) => p.bundleEligible);
  const packHref = hero ? `/produit/${hero.slug}?offre=pack#acheter` : "/#collection";

  const benefits = [
    { title: "Livraison offerte", text: settings.shipping.summary },
    { title: "Retours 14 jours", text: settings.returns.summary },
    { title: "Du XS au 3XL", text: "Guide et simulateur de taille sur chaque fiche" },
    { title: "Mix & match", text: `${bundle.quantity} couleurs au choix dans un pack` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(settings.faq)).replace(/</g, "\\u003c") }}
      />

      {/* ---------- HERO ---------- */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div className="container-x relative pb-8 pt-4 lg:h-[760px] lg:pb-0 lg:pt-0">
          <div
            className="pointer-events-none absolute left-1/2 top-[18%] -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[120px] font-extrabold uppercase leading-none tracking-[-0.02em] text-[#161618] lg:top-[46%] lg:text-[300px]"
            aria-hidden
          >
            Brésil
          </div>

          {hero && (
            <div className="spotlight relative mx-auto h-[420px] w-full max-w-[600px] lg:absolute lg:bottom-0 lg:left-[55%] lg:top-5 lg:h-auto lg:w-[600px] lg:-translate-x-1/2">
              <Image
                src={hero.images[0]?.url ?? ""}
                alt={hero.images[0]?.alt || hero.name}
                fill
                priority
                sizes="(min-width: 1024px) 600px, 100vw"
                className="object-cover object-[50%_30%]"
              />
            </div>
          )}

          <div className="relative z-10 mt-2 lg:absolute lg:left-10 lg:top-[150px] lg:mt-0 lg:max-w-[400px]">
            <p className="lab">Collection Brésil — {products.length} coloris</p>
            <h1 id="hero-title" className="display mt-4 text-[46px] uppercase lg:text-[62px]">
              La veste de la <span className="text-brand">saison.</span>
            </h1>
            <p className="mt-5 text-base text-ink-2">Coupe-vent léger, coupe ample, zip intégral. Du XS au 3XL.</p>
          </div>

          <a href="#collection" className="absolute bottom-[60px] left-10 hidden text-[13px] text-muted hover:text-ink lg:block">
            ↓ Faire défiler la collection
          </a>

          {hero && (
            <div className="relative z-10 mt-6 rounded-[18px] border border-line bg-paper-2 p-6 lg:absolute lg:bottom-[60px] lg:right-10 lg:mt-0 lg:w-[360px]">
              <p className="lab">{hero.name}</p>
              <dl className="mt-2">
                <div className="flex items-baseline justify-between border-b border-line py-3">
                  <dt className="text-ink-2">La veste</dt>
                  <dd className="price text-[30px] leading-none">{formatEUR(hero.priceCents)}</dd>
                </div>
                {bundle.enabled && (
                  <div className="flex items-baseline justify-between border-b border-line py-3">
                    <dt className="text-ink-2">Les deux, au choix</dt>
                    <dd className="price text-[30px] leading-none text-brand">{formatEUR(bundle.priceCents)}</dd>
                  </div>
                )}
              </dl>
              <ul className="my-5 flex gap-3.5" aria-label="Coloris">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/produit/${p.slug}`}
                      aria-label={p.name}
                      title={p.color.name}
                      className={`relative block size-[26px] rounded-full after:absolute after:-inset-[7px] after:content-[''] ${p.id === hero.id ? "ring-2 ring-ink ring-offset-2 ring-offset-paper-2" : "ring-1 ring-white/15 hover:ring-white/50"}`}
                      style={{ background: p.color.hex }}
                    />
                  </li>
                ))}
              </ul>
              <ButtonLink href={`/produit/${hero.slug}#acheter`} size="lg" className="w-full">
                Choisir ma taille →
              </ButtonLink>
              {showBundle && (
                <ButtonLink href={packHref} size="lg" variant="ghost" className="mt-2.5 w-full border border-line-strong hover:bg-paper-3">
                  Composer mon pack
                </ButtonLink>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------- CAMPAIGN COUNTDOWN (only for a real, admin-configured deadline) ---------- */}
      {countdown && <CountdownBand data={countdown} />}

      {/* ---------- COLLECTION ---------- */}
      <section id="collection" aria-labelledby="collection-title" className="container-x scroll-mt-24 py-20 lg:py-28">
        <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <h2 id="collection-title" className="display text-[30px] uppercase sm:text-[48px] lg:text-[64px]">
            La collection
          </h2>
          <p className="lab">{products.length} coloris · une coupe</p>
        </div>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">La collection arrive bientôt.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-[18px]">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} bundle={bundle} priority={i < 3} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- PACK ---------- */}
      {showBundle && (
        <section id="pack" aria-labelledby="pack-title" className="scroll-mt-24 border-y border-line bg-paper-2">
          {/* Column ratio and type sizes follow Concept 04 (text column ≈ 717 px at 1440). */}
          <div className="container-x grid items-center gap-12 py-20 lg:grid-cols-[563fr_717fr] lg:gap-20 lg:py-28">
            <div className="relative mx-auto h-[380px] w-full max-w-[560px] sm:h-[540px]">
              <Shot product={pick("blanc", 3)} className="absolute left-0 top-0 aspect-[4/5] w-[62%] rounded-[18px] border border-line" sizes="(min-width: 1024px) 28vw, 60vw" />
              <Shot product={pick("bleu", 4)} className="absolute bottom-0 right-0 aspect-[4/5] w-[62%] rounded-[18px] border border-line shadow-[0_40px_80px_-30px_#000]" sizes="(min-width: 1024px) 28vw, 60vw" />
            </div>
            <div>
              <p className="lab">{bundle.label}</p>
              <h2 id="pack-title" className="display mt-4 text-[30px] uppercase sm:text-[44px] lg:text-[56px] xl:text-[72px]">
                {settings.promotion.headline}
              </h2>
              <p className="mt-6 max-w-md text-base text-ink-2">{settings.promotion.text}</p>
              <div className="my-8 flex flex-wrap items-baseline gap-4">
                <p className="price price-strong text-[52px] leading-none sm:text-[96px]">{formatEUR(bundle.priceCents)}</p>
                <s className="text-xl text-muted">{formatEUR(bundleFull)}</s>
              </div>
              <ol className="mb-9 grid grid-cols-3 gap-2.5">
                {["Deux coloris", "Deux tailles", "Ta demande"].map((step, i) => (
                  <li key={step} className="rounded-xl border border-line p-3.5 text-sm text-ink-2">
                    <span className="mb-2 block font-display text-[13px] font-bold text-brand">0{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <ButtonLink href={packHref} size="lg" className="w-full sm:w-auto">
                Composer mon pack — {formatEUR(bundleSavings)} d&apos;économie
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* ---------- CAMPAIGN / LA VESTE ---------- */}
      {lead && (
        <section id="details" aria-labelledby="details-title" className="container-x scroll-mt-24 py-20 lg:py-28">
          <div className="grid items-end gap-[18px] lg:grid-cols-[4fr_3fr_3fr]">
            <Shot product={pick("rose", 1)} className="hidden aspect-[4/5] rounded-2xl lg:block" sizes="(min-width: 1024px) 38vw, 100vw" />
            <div>
              <p className="lab">La veste</p>
              <h2 id="details-title" className="display mt-4 text-[44px] uppercase lg:text-[58px]">
                Légère.
                <br />
                Ample.
                <br />
                Zippée.
              </h2>
              <p className="mt-5 text-ink-2">{lead.description}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {lead.details.map((d) => (
                  <li key={d} className="rounded-full border border-line px-3.5 py-2 text-[13px] text-ink-2">
                    {d}
                  </li>
                ))}
              </ul>
              <Shot product={pick("vert", 0)} className="mt-8 hidden aspect-[3/4] rounded-2xl lg:block" sizes="28vw" />
            </div>
            <Shot product={pick("jaune", 5)} className="hidden aspect-[3/4] rounded-2xl lg:block" sizes="28vw" />
            <div className="grid grid-cols-2 gap-2.5 lg:hidden">
              <Shot product={pick("rose", 1)} className="aspect-[4/5] rounded-2xl" sizes="50vw" />
              <Shot product={pick("jaune", 5)} className="aspect-[4/5] rounded-2xl" sizes="50vw" />
            </div>
          </div>
        </section>
      )}

      {/* ---------- BENEFITS ---------- */}
      <section aria-label="Nos engagements" className="container-x">
        <ul className="grid grid-cols-2 gap-x-[18px] gap-y-8 lg:grid-cols-4">
          {benefits.map(({ title, text }) => (
            <li key={title} className="border-t border-brand pt-5">
              <h3 className="font-display text-base font-bold uppercase lg:text-lg">{title}</h3>
              <p className="mt-1.5 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <Reviews variant="home" summary={storeReviews.summary} reviews={storeReviews.reviews} />

      {/* ---------- FAQ + CONTACT ---------- */}
      <section className="container-x grid gap-[18px] py-20 lg:grid-cols-2 lg:py-28">
        <Faq items={settings.faq} />
        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24 rounded-[18px] border border-line bg-paper-2 p-6 sm:p-10">
          <p className="lab">Contact</p>
          <h2 id="contact-title" className="display mb-3 mt-3 text-[24px] uppercase sm:text-[36px] lg:text-[44px]">
            Une question ?
          </h2>
          <p className="mb-6 text-ink-2">
            Une hésitation sur la taille, une commande, un échange : écris-nous, on te répond au plus vite.
          </p>
          <ContactForm />
        </section>
      </section>
    </>
  );
}
