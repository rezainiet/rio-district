"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { formatEUR } from "@/lib/money";
import { rangeLong, rangeShort, shortDay } from "@/lib/delivery-plan";
import type { PublicProduct } from "@/lib/types";
import type { Size } from "@/lib/sizes";
import { SizeGuide } from "@/components/store/SizeGuide";
import { Swatches } from "@/components/store/ProductPurchase";
import { CheckIcon, ReturnIcon, RulerIcon, TruckIcon } from "@/components/ui/icons";
import { CtaButton, RatingLink, StockLine } from "./blocks";
import type { PreviewData } from "./types";
import type { Purchase } from "./usePurchase";
import "./premium.css";

function SizeSelect({ product, value, onChange, field, error }: {
  product: PublicProduct; value: Size | null; onChange: (size: Size) => void; field: string; error?: string;
}) {
  return <label className="pdp-size-select" htmlFor={`size-${field}`}>
    <span>Taille</span>
    <select id={`size-${field}`} value={value ?? ""} onChange={e => onChange(e.target.value as Size)} aria-label={field === "single" ? `Taille — ${product.name}` : `Taille de la veste ${Number(field.slice(4)) + 1} — ${product.color.name}`} aria-invalid={!!error || undefined} aria-describedby={error ? `error-${field}` : undefined}>
      <option value="" disabled>Choisir</option>
      {product.sizes.map(size => <option key={size.label} value={size.label} disabled={!size.available}>{size.label}{!size.available ? " · épuisé" : ""}</option>)}
    </select>
  </label>;
}

function CompactSelection({ p, d }: { p: Purchase; d: PreviewData }) {
  const guideSize = p.guideFor === null ? null : p.guideFor < 0 ? p.size : p.slots[p.guideFor]?.size;
  const choices = p.offer === "single"
    ? [{ product: d.product, size: p.size, field: "single", guide: -1, error: p.errors.single }]
    : p.slots.map((slot,i) => ({ product: p.slotProducts[i], size: slot.size, field: `slot${i}`, guide: i, error: p.errors[`slot${i}`] }));
  return <div className="pdp-selection">
    <p className="pdp-micro-label">{p.offer === "single" ? "Couleur & taille" : "Compose ton duo"}</p>
    {choices.map((choice,i) => <div key={choice.field} id={`field-${choice.field}`} className={`pdp-choice ${choice.error ? "has-error" : ""} ${p.offer === "bundle" ? "is-bundle" : ""}`}>
      <div className="pdp-choice-heading">
        <div className="pdp-choice-name">{p.offer === "bundle" && <span>Veste {i + 1} <span aria-hidden="true">/</span> </span>}<strong>{choice.product.color.name}</strong></div>
        <button type="button" className="pdp-guide" onClick={() => p.setGuideFor(choice.guide)} aria-label={p.offer === "single" ? "Trouver ma taille" : `Trouver la taille de la veste ${i + 1}`} title="Guide des tailles"><RulerIcon width={17} height={17}/><span>Guide</span></button>
        <SizeSelect product={choice.product} field={choice.field} value={choice.size} error={choice.error} onChange={size => p.offer === "single" ? p.setSize(size) : p.updateSlot(i,{size})}/>
      </div>
      <div className="pdp-color-choices"><Swatches variant="image" label={p.offer === "single" ? "Couleur" : `Couleur de la veste ${i + 1}`} options={p.offer === "single" ? d.siblings : d.bundleOptions} value={choice.product.id} onSelect={product => p.offer === "single" ? p.goToColour(product) : p.selectSlotColour(i,product)}/></div>
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
  if (!p.bundleAvailable) return null;
  return <fieldset className="pdp-offers"><legend className="pdp-micro-label">Choisis ton offre</legend>
    <div className="pdp-offer-options">{(["single","bundle"] as const).map(offer => {
      const duo = offer === "bundle";
      return <label key={offer} className={`pdp-offer ${p.offer === offer ? "is-selected" : ""}`}>
        <input type="radio" name="offer" value={offer} checked={p.offer === offer} onChange={() => p.setOffer(offer)} aria-label={duo ? "Pack 2 vestes" : "Une veste"}/>
        <span className="pdp-offer-dot" aria-hidden="true"/>
        <span className="pdp-offer-copy"><strong>{duo ? "Le duo · 2 vestes" : "La veste seule"}</strong><span className="pdp-offer-price">{formatEUR(duo ? p.bundlePrice : product.priceCents)}</span>{duo && p.savings > 0 && <span className="pdp-offer-saving">Économise {formatEUR(p.savings)}</span>}</span>
        {duo && p.percent > 0 && <span className="pdp-offer-badge">−{p.percent} %</span>}
      </label>;
    })}</div>
  </fieldset>;
}

function FulfilmentSummary({ d }: { d: PreviewData }) {
  const steps = [{label:"Commande",value:"Aujourd’hui"},{label:"Expédition",value:shortDay(d.plan.dispatchDay)},{label:"Chez toi",value:rangeShort(d.plan.deliveryFrom,d.plan.deliveryTo)}];
  return <div className="pdp-fulfilment">
    <ol className="pdp-timeline" aria-label="Estimation de livraison">{steps.map((step,i) => <li key={step.label}><span className={`pdp-step-dot ${i === 0 ? "is-current" : ""}`} aria-hidden="true">{i === 0 ? <CheckIcon width={12} height={12}/> : i === 2 ? <TruckIcon width={12} height={12}/> : "·"}</span><span>{step.label}</span><strong>{step.value}</strong></li>)}</ol>
    <ul className="pdp-trust" aria-label="Les engagements Rio"><li><TruckIcon width={17} height={17}/><span>{d.freeShipping ? "Livraison offerte" : "Livraison suivie"}</span></li><li><CheckIcon width={17} height={17}/><span>{d.payments.online ? "Paiement en ligne" : "Aucun débit aujourd’hui"}</span></li><li><ReturnIcon width={17} height={17}/><Link href={d.returnsHref}>Retours {d.policy.windowDays} jours</Link></li></ul>
  </div>;
}

export function CompactPurchase({ p, d, zoneRef }: { p: Purchase; d: PreviewData; zoneRef: RefObject<HTMLDivElement | null> }) {
  return <div className="pdp-purchase">
    <header className="pdp-product-heading"><h1 className="display t-title">{d.product.name}</h1><RatingLink summary={d.summary} compact className="pdp-product-rating"/></header>
    <div className="pdp-price-stock"><p><span className="price">{formatEUR(p.total)}</span>{p.offer === "bundle" && p.savings > 0 && <s>{formatEUR(p.bundleFull)}</s>}<span className="pdp-tax">TTC</span></p><StockLine info={d.stock[d.product.id]} size={p.offer === "single" ? p.size : null}/></div>
    <div className="pdp-delivery" aria-label="Livraison estimée">
      <div><span className="pdp-delivery-dot" aria-hidden="true"/><span><span className="pdp-delivery-label">Chez toi entre</span><strong title={rangeLong(d.plan.deliveryFrom,d.plan.deliveryTo)}>{rangeShort(d.plan.deliveryFrom,d.plan.deliveryTo)}</strong></span></div>
      <div><TruckIcon width={21} height={21}/><span><span className="pdp-delivery-label">Livraison</span><strong>{d.freeShipping ? "Offerte & suivie" : "Avec suivi"}</strong></span></div>
    </div>
    <div ref={zoneRef} id="acheter" className="pdp-buy-zone">
      <CompactOffers p={p} product={d.product}/>
      <CompactSelection p={p} d={d}/>
      <CtaButton p={p} className="pdp-add-button"/>
      <p className="pdp-payment-clarity">{d.payments.online ? "Tes coordonnées ici, puis paiement chez notre partenaire externe." : "Demande confirmée par e-mail · rien à payer aujourd’hui."}</p>
    </div>
    <FulfilmentSummary d={d}/>
  </div>;
}
