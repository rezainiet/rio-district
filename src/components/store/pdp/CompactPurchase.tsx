"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { formatEUR } from "@/lib/money";
import { rangeLong, rangeShort, shortDay } from "@/lib/delivery-plan";
import type { PublicProduct } from "@/lib/types";
import type { Size } from "@/lib/sizes";
import { SizeGuide } from "@/components/store/SizeGuide";
import { Swatches } from "@/components/store/ProductPurchase";
import { ArrowRight, CheckIcon, ReturnIcon, RulerIcon, TruckIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { CtaButton, RatingLink, StockLine } from "./blocks";
import type { PreviewData } from "./types";
import type { Purchase } from "./usePurchase";
import "./premium.css";
import { useT } from "@/i18n/client";

function SizeSelect({ product, value, onChange, field, error }: {
  product: PublicProduct; value: Size | null; onChange: (size: Size) => void; field: string; error?: string;
}) {
  const { t } = useT();
  return <label className="pdp-size-select" htmlFor={`size-${field}`}>
    <span>{t("Taille")}</span>
    <select id={`size-${field}`} value={value ?? ""} onChange={e => onChange(e.target.value as Size)} aria-label={field === "single" ? t("Taille — {name}", { name: product.name }) : t("Taille de la veste {n} — {color}", { n: Number(field.slice(4)) + 1, color: product.color.name })} aria-invalid={!!error || undefined} aria-describedby={error ? `error-${field}` : undefined}>
      <option value="" disabled>{t("Choisir")}</option>
      {product.sizes.map(size => <option key={size.label} value={size.label} disabled={!size.available}>{size.label}{!size.available ? ` · ${t("épuisé")}` : ""}</option>)}
    </select>
  </label>;
}

function CompactSelection({ p, d }: { p: Purchase; d: PreviewData }) {
  const { t } = useT();
  const guideSize = p.guideFor === null ? null : p.guideFor < 0 ? p.size : p.slots[p.guideFor]?.size;
  const choices = p.offer === "single"
    ? [{ product: d.product, size: p.size, field: "single", guide: -1, error: p.errors.single }]
    : p.slots.map((slot,i) => ({ product: p.slotProducts[i], size: slot.size, field: `slot${i}`, guide: i, error: p.errors[`slot${i}`] }));
  return <div className="pdp-selection">
    <p className="pdp-micro-label">{p.offer === "single" ? t("Couleur & taille") : t("Compose ton duo")}</p>
    {choices.map((choice,i) => <div key={choice.field} id={`field-${choice.field}`} className={`pdp-choice ${choice.error ? "has-error" : ""} ${p.offer === "bundle" ? "is-bundle" : ""}`}>
      <div className="pdp-choice-heading">
        <div className="pdp-choice-name">{p.offer === "bundle" && <span>{t("Veste {n}", { n: i + 1 })} <span aria-hidden="true">/</span> </span>}<strong>{choice.product.color.name}</strong></div>
        <button type="button" className="pdp-guide" onClick={() => p.setGuideFor(choice.guide)} aria-label={p.offer === "single" ? t("Trouver ma taille") : t("Trouver la taille de la veste {n}", { n: i + 1 })} title={t("Guide des tailles")}><RulerIcon width={17} height={17}/><span>{t("Guide")}</span></button>
        <SizeSelect product={choice.product} field={choice.field} value={choice.size} error={choice.error} onChange={size => p.offer === "single" ? p.setSize(size) : p.updateSlot(i,{size})}/>
      </div>
      <div className="pdp-color-choices"><Swatches variant="image" label={p.offer === "single" ? t("Couleur") : t("Couleur de la veste {n}", { n: i + 1 })} options={p.offer === "single" ? d.siblings : d.bundleOptions} value={choice.product.id} onSelect={product => p.offer === "single" ? p.goToColour(product) : p.selectSlotColour(i,product)}/></div>
      {choice.error && <p className="pdp-field-error" id={`error-${choice.field}`} role="alert">{choice.error}</p>}
    </div>)}
    <SizeGuide key={`${p.guideFor}-${guideSize ?? ""}`} open={p.guideFor !== null} onClose={() => p.setGuideFor(null)} rules={d.sizeRules} chart={d.sizeChart} onPick={size => {
      if (p.guideFor === -1) p.setSize(size);
      else if (p.guideFor !== null) p.updateSlot(p.guideFor,{size});
      p.setGuideFor(null);
    }}/>
  </div>;
}

function CompactOffers({ p, product }: { p: Purchase; product: PublicProduct }) {
  const { t } = useT();
  if (!p.bundleAvailable) return null;
  return <fieldset className="pdp-offers"><legend className="pdp-micro-label">{t("Choisis ton offre")}</legend>
    <div className="pdp-offer-options">{(["single","bundle"] as const).map(offer => {
      const duo = offer === "bundle";
      return <label key={offer} className={`pdp-offer ${p.offer === offer ? "is-selected" : ""}`}>
        <input type="radio" name="offer" value={offer} checked={p.offer === offer} onChange={() => p.setOffer(offer)} aria-label={duo ? t("Pack 2 vestes") : t("Une veste")}/>
        <span className="pdp-offer-dot" aria-hidden="true"/>
        <span className="pdp-offer-copy"><strong>{duo ? t("Le duo · 2 vestes") : t("La veste seule")}</strong><span className="pdp-offer-price">{formatEUR(duo ? p.bundlePrice : product.priceCents)}</span>{duo && p.savings > 0 && <span className="pdp-offer-saving">{t("Économise {price}", { price: formatEUR(p.savings) })}</span>}</span>
        {duo && p.percent > 0 && <span className="pdp-offer-badge">−{p.percent} %</span>}
      </label>;
    })}</div>
  </fieldset>;
}

function FulfilmentSummary({ d }: { d: PreviewData }) {
  const { t, locale } = useT();
  const steps = [{label:t("Commande"),value:t("Aujourd’hui")},{label:t("Expédition"),value:shortDay(d.plan.dispatchDay,locale)},{label:t("Chez toi"),value:rangeShort(d.plan.deliveryFrom,d.plan.deliveryTo,locale)}];
  return <div className="pdp-fulfilment">
    <ol className="pdp-timeline" aria-label={t("Estimation de livraison")}>{steps.map((step,i) => <li key={step.label}><span className={`pdp-step-dot ${i === 0 ? "is-current" : ""}`} aria-hidden="true">{i === 0 ? <CheckIcon width={12} height={12}/> : i === 2 ? <TruckIcon width={12} height={12}/> : "·"}</span><span>{step.label}</span><strong>{step.value}</strong></li>)}</ol>
    <ul className="pdp-trust" aria-label={t("Les engagements Rio")}><li><TruckIcon width={17} height={17}/><span>{d.freeShipping ? t("Livraison offerte") : t("Livraison suivie")}</span></li><li><CheckIcon width={17} height={17}/><span>{d.payments.online ? t("Paiement en ligne") : t("Aucun débit aujourd’hui")}</span></li><li><ReturnIcon width={17} height={17}/><Link href={d.returnsHref}>{t("Retours {n} jours", { n: d.policy.windowDays })}</Link></li></ul>
  </div>;
}

export function CompactPurchase({ p, d, zoneRef }: { p: Purchase; d: PreviewData; zoneRef: RefObject<HTMLDivElement | null> }) {
  const { t, locale } = useT();
  return <div className="pdp-purchase">
    <header className="pdp-product-heading"><h1 className="display t-title">{d.product.name}</h1><RatingLink summary={d.summary} compact className="pdp-product-rating"/></header>
    <div className="pdp-price-stock"><p><span className="price">{formatEUR(p.total)}</span>{p.offer === "bundle" && p.savings > 0 && <s>{formatEUR(p.bundleFull)}</s>}<span className="pdp-tax">{t("TTC")}</span></p><StockLine info={d.stock[d.product.id]} size={p.offer === "single" ? p.size : null}/></div>
    <div className="pdp-delivery" aria-label={t("Livraison estimée")}>
      <div><span className="pdp-delivery-dot" aria-hidden="true"/><span><span className="pdp-delivery-label">{t("Chez toi entre")}</span><strong title={rangeLong(d.plan.deliveryFrom,d.plan.deliveryTo,locale)}>{rangeShort(d.plan.deliveryFrom,d.plan.deliveryTo,locale)}</strong></span></div>
      <div><TruckIcon width={21} height={21}/><span><span className="pdp-delivery-label">{t("Livraison")}</span><strong>{d.freeShipping ? t("Offerte & suivie") : t("Avec suivi")}</strong></span></div>
    </div>
    <div ref={zoneRef} id="acheter" className="pdp-buy-zone">
      <CompactOffers p={p} product={d.product}/>
      <CompactSelection p={p} d={d}/>
      <CtaButton p={p} className="pdp-add-button"/>
      <p className="pdp-payment-clarity">{d.payments.online ? t("Tes coordonnées ici, puis paiement chez notre partenaire externe.") : t("Demande confirmée par e-mail · rien à payer aujourd’hui.")}</p>
      <Button variant="outline" className="pdp-buy-now-button" onClick={p.buyNow} disabled={!p.config.acceptingOrders || p.buyingNow} aria-busy={p.buyingNow}>
        {p.buyingNow ? t("Ouverture…") : <>{t("Acheter maintenant · {price}", { price: formatEUR(p.total) })} <ArrowRight width={17} height={17} /></>}
      </Button>
    </div>
    <FulfilmentSummary d={d}/>
  </div>;
}
