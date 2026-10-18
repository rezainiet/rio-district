import Image from "next/image";
import { getActiveProducts, getSettings } from "@/lib/catalog";

import { formatEUR } from "@/lib/money";
import { rangeShort } from "@/lib/delivery-plan";
import { homeReviews, storeFaq, storePlan } from "@/lib/storefront";
import { HeroCarousel } from "@/components/store/HeroCarousel";
import { Reveal } from "@/components/store/Reveal";
import { CustomerVideos } from "@/components/store/CustomerVideos";
import { ProductCard } from "@/components/store/ProductCard";
import { Faq, faqJsonLd } from "@/components/store/Faq";
import { HomeReviews } from "@/components/store/HomeReviews";
import { ContactFormLazy } from "@/components/store/ContactFormLazy";
import { Stars } from "@/components/store/Stars";
import { ButtonLink } from "@/components/ui/Button";
import { MailIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";
import type { PublicProduct } from "@/lib/types";
import "./collection.css";
import { paymentsEnabled } from "@/lib/payments";

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
  const reviews = await homeReviews(products, 28);

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
    { icon: MailIcon, title: paymentsEnabled(settings) ? "Paiement chez notre partenaire" : "Rien à payer aujourd'hui", text: paymentsEnabled(settings) ? "Ta sélection enregistrée avant le paiement externe" : "Commande confirmée par e-mail avant tout paiement" },
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

        <HeroCarousel products={products} />

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

      <section aria-label="Nos engagements" className="benefits-marquee border-y border-line bg-paper-2" tabIndex={0}>
        <div className="benefits-track">{[0, 1].map(copy => <ul key={copy} aria-hidden={copy === 1}>
          {promises.map(({icon:Icon,title,text}) => <li key={title}><Icon width={22} height={22} className="shrink-0 text-brand" /><span><strong>{title}</strong><span>{text}</span></span><span className="benefit-star" aria-hidden="true">✦</span></li>)}
        </ul>)}</div>
      </section>

      {/* ---------- COLLECTION ---------- */}
      <Reveal><section id="collection" aria-labelledby="collection-title" className="container-x scroll-mt-32 section-space">
        <div className="rd-collection-invitation">
          <p className="lab">{products.length} coloris · {showBundle ? "ton duo t’attend" : "à toi de choisir"}</p>
          <h2 id="collection-title" className="display t-section mt-4">
            {showBundle ? <>Ton prochain duo<br /><span className="text-brand">commence ici.</span></> : <>Ton coup de cœur<br /><span className="text-brand">t’attend ici.</span></>}
          </h2>
          <p className="rd-collection-copy">
            Un coloris pour aujourd’hui. Un autre pour demain.
            {showBundle && <span>Choisis tes deux coups de cœur pour <strong>{formatEUR(bundle.priceCents)}</strong>.</span>}
          </p>
          <svg className="rd-collection-arrow" width="138" height="95" viewBox="0 0 160 110" fill="none" aria-hidden="true" focusable="false">
            <path d="M38 9c55-12 109 19 94 42-11 17-49 8-36-10 12-16 40 1 25 23-10 14-29 19-43 33" />
            <path d="m77 76-1 23 25-5" />
          </svg>
        </div>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">La collection arrive bientôt.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} bundle={bundle} rating={reviews.summary} />
              </li>
            ))}
          </ul>
        )}
      </section>

      </Reveal>
      {/* ---------- PACK ---------- */}
      {showBundle && (
        <Reveal><section id="pack" aria-labelledby="pack-title" className="pack-editorial scroll-mt-32">
          <div className="container-x section-space text-center">
            <p className="lab">Deux fois plus de Rio</p>
            <div className="pack-lineup" aria-label="Les six couleurs de la collection">{products.slice(0,6).map((p) => <Shot key={p.id} product={p} className="pack-lineup-shot" sizes="(min-width: 1024px) 22vw, 29vw" />)}</div>
            <h2 id="pack-title" className="display mt-8 text-[clamp(36px,8vw,76px)]">Une seule couleur ?<br /><span className="text-brand">Dur de choisir.</span></h2>
            <p className="mx-auto mt-5 max-w-lg text-[16px] text-ink-2">Mélange les couleurs, choisis chaque taille.<br />Le duo à <strong className="text-ink">{formatEUR(bundle.priceCents)}</strong>, c&apos;est toi qui le composes.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm"><s className="text-muted">{formatEUR(bundleFull)}</s><span className="text-brand">{formatEUR(bundleSavings)} d&apos;économie sur le duo</span></div>
            <ButtonLink href={packHref} size="lg" className="mt-7 h-14 gap-8">Créer mon pack <span aria-hidden="true">↗</span></ButtonLink>
          </div>
        </section></Reveal>
      )}

      {/* ---------- THE JACKET ---------- */}
      {lead && (
        <Reveal><section id="details" aria-labelledby="details-title" className="container-x scroll-mt-20 py-14 lg:py-24">
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
        </section></Reveal>
      )}

      <Reveal><CustomerVideos /></Reveal>
      <Reveal><HomeReviews summary={reviews.summary} reviews={reviews.reviews} previewSource={reviews.source === "manifest"} /></Reveal>

      {/* ---------- FAQ + CONTACT ---------- */}
      <Reveal><section className="home-support border-t border-line">
        <div className="container-x grid gap-12 section-space lg:grid-cols-[7fr_5fr] lg:gap-16">
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
      </section></Reveal>
    </>
  );
}
