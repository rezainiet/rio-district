"use client";

/* Compact purchase flow followed by customer reviews, videos and help. */
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import { artClass } from "@/lib/image-fit";
import type { Size } from "@/lib/sizes";
import { Gallery } from "@/components/store/Gallery";
import { Modal } from "@/components/ui/Modal";
import { ZoomIcon } from "@/components/ui/icons";
import { FaqList, RelatedColours, StickyBar, SupportCard } from "./blocks";
import { CompactPurchase } from "./CompactPurchase";
import { ProductSocialProof } from "./ProductSocialProof";
import type { PreviewData } from "./types";
import { usePurchase, type Offer, type Purchase } from "./usePurchase";

/** Mobile photo: shorter than the screen so the essentials stay visible; colour dots switch the jacket. */
function MobilePhoto({ d, p }: { d: PreviewData; p: Purchase }) {
  const [zoom, setZoom] = useState(false);
  const img = d.product.images[0];
  return (
    <div className="md:hidden">
      <div className="shot relative -mx-4 aspect-[6/5] sm:-mx-6">
        {img && <Image src={img.url} alt={img.alt || d.product.name} fill priority sizes="100vw" className={`object-cover object-[50%_42%] ${artClass(img, "hero")}`} />}
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
          aria-label="Agrandir la photo"
        >
          <ZoomIcon width={18} height={18} />
        </button>
        {d.siblings.length > 1 && (
          <ul className="absolute bottom-2 left-2 z-10 flex rounded-full bg-black/50 px-0.5 backdrop-blur" aria-label="Coloris">
            {d.siblings.map((s) => (
              <li key={s.id}>
                <Link
                  href={p.colourHref(s)}
                  scroll={false}
                  aria-label={`Coloris ${s.color.name}`}
                  aria-current={s.id === d.product.id ? "true" : undefined}
                  className="grid size-11 place-items-center"
                >
                  <span className={clsx("block size-5 rounded-full", s.id === d.product.id ? "ring-2 ring-white ring-offset-2 ring-offset-black/60" : "ring-1 ring-white/40")} style={{ background: s.color.hex }} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal open={zoom} onClose={() => setZoom(false)} title={d.product.name} className="max-w-3xl">
        {img && (
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-studio">
            <Image src={img.url} alt={img.alt || d.product.name} fill sizes="100vw" className="object-contain" />
          </div>
        )}
      </Modal>
    </div>
  );
}

export function ProductView({
  d,
  basePath = "/produit",
  initialOffer,
  initialSize,
}: {
  d: PreviewData;
  basePath?: string;
  initialOffer: Offer;
  initialSize: Size | null;
}) {
  const [p, zoneRef] = usePurchase({ product: d.product, bundleOptions: d.bundleOptions, initialOffer, initialSize, basePath });

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="container-x hidden pt-6 text-[13px] text-muted md:block">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Accueil</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/#collection" className="hover:text-ink">Collection</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink-2">{d.product.name}</li>
        </ol>
      </nav>

      <section className="container-x pdp-main">
        <div className="pdp-gallery">
          <MobilePhoto d={d} p={p} />
          <div className="pdp-desktop-gallery">
            <Gallery key={d.product.id} images={d.product.images} name={d.product.name} />
          </div>
        </div>

        <CompactPurchase p={p} d={d} zoneRef={zoneRef} />
      </section>

      <ProductSocialProof d={d} />

      <section aria-labelledby="faq-title" className="border-t border-line py-12 lg:py-20">
        <div className="container-x grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="min-w-0 lg:col-span-7">
            <p className="lab">FAQ</p>
            <h2 id="faq-title" className="display t-section mt-2 uppercase">Questions fréquentes.</h2>
            <FaqList d={d} className="mt-6" />
          </div>
          <div className="min-w-0 lg:col-span-5 lg:pt-[88px]">
            <SupportCard d={d} />
          </div>
        </div>
      </section>

      <section aria-labelledby="related-title" className="border-t border-line py-12 lg:py-20">
        <div className="container-x">
          <p className="lab">Les autres coloris</p>
          <h2 id="related-title" className="display t-section mt-2 uppercase">Complète ton pack.</h2>
          <RelatedColours d={d} basePath={basePath} className="mt-6" />
        </div>
      </section>

      <StickyBar p={p} d={d} />
    </>
  );
}
