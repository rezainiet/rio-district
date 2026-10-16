import Image from "next/image";
import Link from "next/link";
import { getActiveProducts, getSettings } from "@/lib/catalog";
import { countdownFor } from "@/lib/marketing";
import { formatEUR } from "@/lib/money";
import { rangeShort } from "@/lib/delivery-plan";
import { homeReviews, storeFaq, storePlan } from "@/lib/storefront";
import { CountdownBand } from "@/components/store/Countdown";
import { ProductCard } from "@/components/store/ProductCard";
import { Faq, faqJsonLd } from "@/components/store/Faq";
import { HomeReviews } from "@/components/store/HomeReviews";
import { ContactFormLazy } from "@/components/store/ContactFormLazy";
import { Stars } from "@/components/store/Stars";
import { ButtonLink } from "@/components/ui/Button";
import { MailIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";
import type { PublicProduct } from "@/lib/types";

/** Rounded, softly lit product photo used across the homepage. */
function Shot({ product, className, sizes, priority }: { product?: PublicProduct; className: string; sizes: string; priority?: boolean }) {
  const img = product?.images[0];
  return (
    <div className={`shot relative ${className}`}>
      {img && <Image src={img.url} alt={img.alt || product!.name} fill sizes={sizes} priority={priority} className="object-cover" />}
    </div>
  );
}

export default async function HomePage() {
  const [settings, products] = await Promise.all([getSettings(), getActiveProducts()]);
  const reviews = await homeReviews(products);
  const countdown = countdownFor(settings.countdown, "home");
  const plan = storePlan(settings);
  const { bundle } = settings;
  const pick = (slug: string, i: number) => products.find((p) => p.slug.endsWith(`-${slug}`)) ?? products[i % Math.max(1, products.length)];
  const lead = products[0];
  const unit = products.length ? Math.min(...products.map((p) => p.priceCents)) : 0;
  const bundleFull = unit * bundle.quantity;
  const bundleSavings = Math.max(0, bundleFull - bundle.priceCents);
  const showBundle = bundle.enabled && products.some((p) => p.bundleEligible);
  const packHref = lead ? `/produit/${lead.slug}?offre=pack#acheter` : "/#collection";
  const faq = storeFaq(settings, plan, unit);
  const promises = [
    { icon: TruckIcon, title: settings.shipping.priceCents === 0 ? "Livraison offerte et suivie" : "Livraison suivie", text: `Commandée aujourd'hui, livrée ${rangeShort(plan.deliveryFrom, plan.deliveryTo)}` },
    { icon: ReturnIcon, title: `Retour sous ${settings.returnsPolicy.windowDays} jours`, text: "Après réception, sur simple demande" },
    { icon: MailIcon, title: "Rien à payer aujourd'hui", text: "Commande confirmée par e-mail avant tout paiement" },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faq)).replace(/</g, "\\u003c") }} />

      {/* ---------- HERO: the whole line-up, the prices and the way in, on the first screen ---------- */}
      <section aria-labelledby="hero-title" className="container-x grid gap-5 pb-10 pt-4 lg:grid-cols-[5fr_7fr] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-6 lg:pb-16 lg:pt-12">
        <div className="lg:col-start-1 lg:self-end">
          <p className="lab">Collection Brésil · {products.length} coloris · XS → 3XL</p>
          <h1 id="hero-title" className="display t-hero mt-2 uppercase">
            La veste <span className="text-brand">Brésil.</span>
          </h1>
        </div>

        {/* Campaign line-up: the six colourways side by side, each one a way into its page. */}
        <ul
          className="relative isolate aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-[radial-gradient(120%_90%_at_50%_100%,#2a2418_0%,#141416_55%,#0f0f11_100%)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:aspect-[16/11] lg:self-center lg:rounded-3xl"
          aria-label="Les six coloris"
        >
          {products.slice(0, 6).map((p, i, list) => {
            const n = list.length;
            const mid = (n - 1) / 2;
            const dist = Math.abs(i - mid);
            const left = n > 1 ? (i / (n - 1)) * 60 : 30;
            return (
              <li
                key={p.id}
                className="absolute w-[40%] transition-transform duration-200 ease-[var(--ease-out-soft)] hover:-translate-y-2 focus-within:-translate-y-2"
                style={{ left: `${left}%`, bottom: `${2 + (mid - dist) * 3.5}%`, zIndex: Math.round(10 - dist * 2) }}
              >
                <Link href={`/produit/${p.slug}`} aria-label={`${p.name}, ${formatEUR(p.priceCents)}`} className="block">
                  <Shot
                    product={p}
                    className="aspect-[4/5] overflow-hidden rounded-xl shadow-[0_24px_40px_-18px_#000] ring-1 ring-black/50 sm:rounded-2xl"
                    sizes="(min-width: 1024px) 24vw, 40vw"
                    priority
                  />
                </Link>
              </li>
            );
          })}
          <li className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-2.5 pt-3" aria-hidden>
            {products.slice(0, 6).map((p) => (
              <span key={p.id} className="size-3 rounded-full ring-1 ring-white/30" style={{ background: p.color.hex }} />
            ))}
          </li>
        </ul>

        <div className="lg:col-start-1 lg:self-start">
          <p className="max-w-md text-[16px] leading-relaxed text-ink-2">Coupe-vent léger, coupe ample, zip intégral. Celle que tu mets tous les jours.</p>
          {reviews.summary.count > 0 && (
            <a href="#avis" className="mt-2 inline-flex min-h-11 items-center gap-2 text-[15px]">
              <Stars value={reviews.summary.average} size={16} />
              <span className="font-semibold">{reviews.summary.average.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}</span>
              <span className="text-ink-2 underline decoration-line-strong underline-offset-4">{reviews.summary.count} avis clients</span>
            </a>
          )}
          <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-paper-2">
            <div className="p-4">
              <dt className="text-sm text-ink-2">La veste</dt>
              <dd className="price mt-0.5 text-[30px] leading-none">{formatEUR(unit)}</dd>
            </div>
            {showBundle && (
              <div className="border-l border-line bg-[#17140f] p-4">
                <dt className="text-sm text-ink-2">Les deux, au choix</dt>
                <dd className="price mt-0.5 text-[30px] leading-none text-brand">{formatEUR(bundle.priceCents)}</dd>
                {bundleSavings > 0 && <dd className="mt-1 text-[13px] font-semibold text-[#8fd9ad]">{formatEUR(bundleSavings)} d&apos;économie</dd>}
              </div>
            )}
          </dl>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <ButtonLink href="#collection" size="lg" className="h-14 w-full">Choisir ma veste</ButtonLink>
            {showBundle && (
              <ButtonLink href={packHref} size="lg" variant="ghost" className="h-14 w-full border border-line-strong hover:bg-paper-3">
                Composer mon pack
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      {/* ---------- PROMISES ---------- */}
      <section aria-label="Nos engagements" className="border-y border-line bg-paper-2">
        <ul className="container-x grid gap-4 py-5 sm:grid-cols-3 sm:gap-6">
          {promises.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-brand"><Icon width={18} height={18} /></span>
              <span>
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {countdown && <CountdownBand data={countdown} />}

      {/* ---------- COLLECTION ---------- */}
      <section id="collection" aria-labelledby="collection-title" className="container-x scroll-mt-20 py-14 lg:py-24">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end lg:mb-10">
          <div>
            <p className="lab">{products.length} coloris · une coupe</p>
            <h2 id="collection-title" className="display t-section mt-2 uppercase">Trouve la tienne.</h2>
          </div>
          {showBundle && <p className="text-[15px] text-ink-2">{formatEUR(unit)} la veste · <span className="text-brand">{formatEUR(bundle.priceCents)} les deux</span></p>}
        </div>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">La collection arrive bientôt.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} bundle={bundle} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- PACK ---------- */}
      {showBundle && (
        <section id="pack" aria-labelledby="pack-title" className="scroll-mt-20 border-y border-line bg-paper-2">
          <div className="container-x grid items-center gap-8 py-14 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <div className="relative mx-auto h-[300px] w-full max-w-[460px] sm:h-[420px]">
              <Shot product={pick("blanc", 3)} className="absolute left-0 top-0 aspect-[4/5] w-[60%] overflow-hidden rounded-2xl border border-line" sizes="(min-width: 1024px) 26vw, 55vw" />
              <Shot product={pick("bleu", 4)} className="absolute bottom-0 right-0 aspect-[4/5] w-[60%] overflow-hidden rounded-2xl border border-line shadow-[0_30px_60px_-30px_#000]" sizes="(min-width: 1024px) 26vw, 55vw" />
            </div>
            <div>
              <p className="lab">{bundle.label}</p>
              <h2 id="pack-title" className="display t-section mt-2 uppercase">Deux coloris, un seul prix.</h2>
              <p className="mt-3 max-w-md text-[16px] leading-relaxed text-ink-2">
                Choisis deux vestes, mêmes coloris ou différents, une taille pour chacune. La remise s&apos;applique automatiquement.
              </p>
              <div className="mt-6 grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-line bg-paper p-4 text-center">
                <p>
                  <span className="block text-sm text-muted">2 × {formatEUR(unit)}</span>
                  <s className="price block text-[22px] text-muted">{formatEUR(bundleFull)}</s>
                </p>
                <span className="text-muted" aria-hidden>→</span>
                <p>
                  <span className="block text-sm text-ink-2">Le pack</span>
                  <span className="price block text-[34px] leading-none text-brand">{formatEUR(bundle.priceCents)}</span>
                </p>
              </div>
              {bundleSavings > 0 && <p className="mt-3 text-[15px] font-semibold text-[#8fd9ad]">Tu économises {formatEUR(bundleSavings)}, soit {formatEUR(Math.round(bundle.priceCents / bundle.quantity))} la veste.</p>}
              <ButtonLink href={packHref} size="lg" className="mt-6 h-14 w-full sm:w-auto">Composer mon pack</ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* ---------- THE JACKET ---------- */}
      {lead && (
        <section id="details" aria-labelledby="details-title" className="container-x scroll-mt-20 py-14 lg:py-24">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="grid grid-cols-2 gap-3">
              <Shot product={pick("rose", 1)} className="aspect-[4/5] overflow-hidden rounded-2xl" sizes="(min-width: 1024px) 24vw, 50vw" />
              <Shot product={pick("jaune", 5)} className="mt-8 aspect-[4/5] overflow-hidden rounded-2xl" sizes="(min-width: 1024px) 24vw, 50vw" />
            </div>
            <div>
              <p className="lab">La veste</p>
              <h2 id="details-title" className="display t-section mt-2 uppercase">Légère. Ample. Zippée.</h2>
              <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-ink-2">{lead.description}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {lead.details.map((d) => (
                  <li key={d} className="rounded-full border border-line-strong px-3.5 py-2 text-[14px] text-ink-2">{d}</li>
                ))}
              </ul>
              <ButtonLink href={`/produit/${lead.slug}`} size="lg" variant="ghost" className="mt-6 h-14 w-full border border-line-strong hover:bg-paper-3 sm:w-auto">
                Voir la fiche et les tailles
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      <HomeReviews summary={reviews.summary} reviews={reviews.reviews} previewSource={reviews.source === "manifest"} />

      {/* ---------- FAQ + CONTACT ---------- */}
      <section className="border-t border-line">
        <div className="container-x grid gap-5 py-14 lg:grid-cols-[7fr_5fr] lg:gap-8 lg:py-24">
          <Faq items={faq} />
          <section id="contact" aria-labelledby="contact-title" className="scroll-mt-20 rounded-2xl border border-line bg-paper-2 p-5 sm:p-8">
            <p className="lab">Contact</p>
            <h2 id="contact-title" className="display t-sub mt-2 uppercase">Une question ?</h2>
            <p className="mb-5 mt-2 text-[15px] leading-relaxed text-ink-2">
              Taille, commande, retour : écris-nous, on te répond par e-mail. Indique ton numéro de commande si tu en as un.
            </p>
            <ContactFormLazy />
            <p className="mt-4 break-all text-sm text-muted">ou directement : <span className="text-ink-2">{settings.contactEmail}</span></p>
          </section>
        </div>
      </section>
    </>
  );
}
