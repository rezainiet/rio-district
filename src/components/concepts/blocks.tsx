"use client";

/* Trust & reassurance building blocks for the product-page concepts (Dark Premium). */
import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { formatEUR } from "@/lib/money";
import { returnsHeadline, returnsHowTo, type ReturnsPolicy } from "@/lib/policies";
import type { RatingSummary } from "@/lib/marketing";
import type { Size } from "@/lib/sizes";
import type { PublicProduct } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CheckIcon, MailIcon, ReturnIcon, RulerIcon, TruckIcon } from "@/components/ui/icons";
import { Stars } from "@/components/store/Stars";
import type { Purchase } from "./usePurchase";

export type ConceptData = {
  product: PublicProduct;
  siblings: PublicProduct[];
  bundleOptions: PublicProduct[];
  related: PublicProduct[];
  summary: RatingSummary;
  verifiedCount: number;
  topReview: { author: string; text: string; rating: number; color: string } | null;
  delivery: { range: string; label: string; minDays: number; maxDays: number; free: boolean };
  policy: ReturnsPolicy;
  /** True when ?stock= simulates tracked stock for the concept review. */
  stockSimulated: boolean;
  basePath: string;
  returnsHref: string;
};

/* ---------- Rating line (near the title) ---------- */

export function RatingLine({ summary, verifiedCount, className }: { summary: RatingSummary; verifiedCount: number; className?: string }) {
  if (summary.count === 0) {
    return (
      <a href="#avis" className={clsx("inline-flex items-center gap-2 text-sm text-muted hover:text-ink", className)}>
        <Stars value={0} size={14} label="Aucune note pour le moment" />
        Nouveauté · sois le premier à donner ton avis
      </a>
    );
  }
  return (
    <a href="#avis" className={clsx("group inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm", className)}>
      <Stars value={summary.average} size={15} />
      <span className="font-semibold tabular-nums">{summary.average.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}</span>
      <span className="text-muted underline-offset-4 group-hover:underline">
        {summary.count} avis client{summary.count > 1 ? "s" : ""}
      </span>
      {verifiedCount > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
          <CheckIcon width={13} height={13} /> {verifiedCount} achat{verifiedCount > 1 ? "s" : ""} vérifié{verifiedCount > 1 ? "s" : ""}
        </span>
      )}
    </a>
  );
}

/* ---------- Stock status: real data only (or an explicit simulation tag) ---------- */

export function StockStatus({ product, size, simulated, className }: { product: PublicProduct; size: Size | null; simulated: boolean; className?: string }) {
  const sel = size ? product.sizes.find((s) => s.label === size) : null;
  const low = product.sizes.filter((s) => s.remaining != null);
  let tone: "ok" | "low" | "out" = "ok";
  let text = "En stock · expédiée après confirmation de ta commande";
  if (sel && !sel.available) {
    tone = "out";
    text = `Taille ${sel.label} épuisée`;
  } else if (sel?.remaining != null) {
    tone = "low";
    text = `Il ne reste que ${sel.remaining} article${sel.remaining > 1 ? "s" : ""} disponible${sel.remaining > 1 ? "s" : ""} en ${sel.label}`;
  } else if (!sel && low.length > 0) {
    tone = "low";
    const min = Math.min(...low.map((s) => s.remaining!));
    text = `Stock limité : il ne reste que ${min} article${min > 1 ? "s" : ""} sur certaines tailles`;
  }
  return (
    <p className={clsx("flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm", className)} role="status">
      <span className="relative flex size-2.5 shrink-0" aria-hidden>
        {tone === "low" && <span className="absolute inset-0 rounded-full bg-brand opacity-60 motion-safe:animate-ping" />}
        <span className={clsx("relative size-2.5 rounded-full", tone === "ok" && "bg-[#6fbf8f]", tone === "low" && "bg-brand", tone === "out" && "bg-muted")} />
      </span>
      <span className={clsx("min-w-0 flex-1 basis-[220px]", tone === "low" ? "font-semibold text-ink" : "text-ink-2")}>{text}</span>
      {simulated && <span className="whitespace-nowrap rounded-full border border-line-strong px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-muted">Aperçu · stock simulé</span>}
    </p>
  );
}

/* ---------- Delivery timeline ---------- */

export function DeliveryTimeline({ delivery, compact = false }: { delivery: ConceptData["delivery"]; compact?: boolean }) {
  const steps = [
    { t: "Aujourd'hui", s: "Tu envoies ta demande" },
    { t: "Par e-mail", s: "Confirmation, puis expédition suivie" },
    { t: delivery.range, s: "Livraison chez toi" },
  ];
  return (
    <div className={clsx("rounded-[18px] border border-line bg-paper-2", compact ? "p-4" : "p-5 sm:p-6")}>
      <p className="flex items-start gap-3">
        <TruckIcon width={22} height={22} className="mt-0.5 shrink-0 text-brand" />
        <span>
          <span className="block font-semibold">{delivery.free ? "Livraison offerte et suivie" : "Livraison suivie"}</span>
          <span className="block text-sm text-ink-2">{delivery.label} · {delivery.minDays} à {delivery.maxDays} jours ouvrés après confirmation</span>
        </span>
      </p>
      <ol className="mt-5 grid grid-cols-3 gap-2 text-center" aria-label="Étapes de livraison">
        {steps.map((step, i) => (
          <li key={step.s} className="relative">
            {i > 0 && <span aria-hidden className="absolute right-1/2 top-[9px] h-px w-full bg-line-strong" />}
            <span className={clsx("relative z-10 mx-auto grid size-[18px] place-items-center rounded-full", i === 2 ? "bg-brand" : "bg-ink")} aria-hidden>
              <span className="size-1.5 rounded-full bg-paper" />
            </span>
            <span className="mt-2 block text-[13px] font-semibold">{step.t}</span>
            <span className="block text-xs leading-snug text-muted">{step.s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Returns reassurance ---------- */

export function ReturnsCard({ policy, href, compact = false }: { policy: ReturnsPolicy; href: string; compact?: boolean }) {
  return (
    <div className={clsx("rounded-[18px] border border-line bg-paper-2", compact ? "p-4" : "p-5 sm:p-6")}>
      <p className="flex items-start gap-3">
        <ReturnIcon width={22} height={22} className="mt-0.5 shrink-0 text-brand" />
        <span>
          <span className="block font-semibold">{returnsHeadline(policy)}</span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-2">{returnsHowTo(policy)}</span>
          <Link href={href} className="mt-2 inline-block py-1 text-sm text-ink underline underline-offset-4 hover:text-brand">
            Retours & remboursements
          </Link>
        </span>
      </p>
    </div>
  );
}

/* ---------- Reassurance list (true statements only) ---------- */

export function reassurances(d: ConceptData) {
  return [
    { icon: TruckIcon, title: d.delivery.free ? "Livraison offerte et suivie" : "Livraison suivie", text: `Reçue ${d.delivery.label.replace("Livraison estimée ", "")}` },
    { icon: ReturnIcon, title: `Retour sous ${d.policy.windowDays} jours`, text: "Après réception, avec ton numéro de commande" },
    { icon: CheckIcon, title: "Rien à payer aujourd'hui", text: "Ta demande est confirmée par e-mail avant tout paiement" },
    { icon: MailIcon, title: "Service client à l'écoute", text: "Une question ? On te répond par e-mail" },
  ];
}

export function ReassuranceTicks({ d, className }: { d: ConceptData; className?: string }) {
  return (
    <ul className={clsx("flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2", className)}>
      <li className="flex items-center gap-1.5"><CheckIcon width={15} height={15} className="text-brand" /> {d.delivery.free ? "Livraison offerte" : "Livraison suivie"}</li>
      <li className="flex items-center gap-1.5"><CheckIcon width={15} height={15} className="text-brand" /> Retour {d.policy.windowDays} jours</li>
      <li className="flex items-center gap-1.5"><CheckIcon width={15} height={15} className="text-brand" /> Rien à payer aujourd&apos;hui</li>
    </ul>
  );
}

export function TrustGrid({ d, title = "Commande en toute sérénité." }: { d: ConceptData; title?: string }) {
  return (
    <section aria-labelledby="trust-title" className="container-x py-16 lg:py-20">
      <p className="lab">Nos engagements</p>
      <h2 id="trust-title" className="display mt-3 text-[28px] uppercase sm:text-[40px]">{title}</h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {reassurances(d).map(({ icon: Icon, title: t, text }) => (
          <li key={t} className="rounded-[18px] border border-line bg-paper-2 p-6">
            <Icon width={24} height={24} className="text-brand" />
            <p className="mt-4 font-display text-base font-bold uppercase">{t}</p>
            <p className="mt-1.5 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- CTA + sticky mobile bar ---------- */

export function CtaButton({ p, className }: { p: Purchase; className?: string }) {
  const label = !p.config.acceptingOrders
    ? "Commandes bientôt ouvertes"
    : p.offer === "bundle"
      ? `Ajouter le pack · ${formatEUR(p.total)}`
      : `Ajouter au panier · ${formatEUR(p.total)}`;
  return (
    <Button size="lg" className={clsx("w-full", className)} onClick={p.addToCart} disabled={!p.config.acceptingOrders}>
      {p.added ? (
        <>
          <CheckIcon width={18} height={18} /> Ajouté au panier
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export function StickyBar({ p, d, note }: { p: Purchase; d: ConceptData; note?: ReactNode }) {
  return (
    <div
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden",
        p.barHidden ? "translate-y-full" : "translate-y-0",
      )}
      aria-hidden={p.barHidden}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">
            {p.offer === "bundle" ? p.slotProducts.map((x, i) => `${x.color.name} ${p.slots[i].size ?? "?"}`).join(" + ") : `${d.product.name}${p.size ? ` · ${p.size}` : ""}`}
          </p>
          <p className="price text-xl">{formatEUR(p.total)}</p>
          {note && <p className="truncate text-[11px] text-brand">{note}</p>}
        </div>
        <Button className="shrink-0 px-5" tabIndex={p.barHidden ? -1 : 0} onClick={p.addToCart} disabled={!p.config.acceptingOrders}>
          {p.offer === "bundle" ? "Ajouter le pack" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

export function SizeGuideLink({ onClick, label = "Trouver ma taille" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="-my-3 flex items-center gap-1.5 py-3 text-xs font-medium underline underline-offset-4 hover:text-brand">
      <RulerIcon width={16} height={16} /> {label}
    </button>
  );
}

/** Same short French payment notice as the live page: no payment is taken online yet. */
export function PaymentNote({ className }: { className?: string }) {
  return (
    <p className={clsx("text-xs leading-relaxed text-muted", className)}>
      Paiement en ligne bientôt disponible : ta demande de commande est confirmée par e-mail, rien n&apos;est débité aujourd&apos;hui.
    </p>
  );
}
