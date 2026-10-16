"use client";

/* Building blocks shared by the three product-page concepts (Dark Premium). Real data only;
   sample data is always tagged on screen with <PreviewTag>. */
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Fragment, useState, type ReactNode } from "react";
import { useRemaining, type CountdownData } from "@/components/store/Countdown";
import { useStore } from "@/components/store/StoreProvider";
import { SizePicker, Swatches } from "@/components/store/ProductPurchase";
import { SizeGuide } from "@/components/store/SizeGuide";
import dynamic from "next/dynamic";
import { Stars } from "@/components/store/Stars";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, MailIcon, ReturnIcon, RulerIcon, TruckIcon } from "@/components/ui/icons";
import { rangeLong, rangeShort, shortDay, type DeliveryPlan } from "@/lib/delivery-plan";
import { artClass } from "@/lib/image-fit";
import { MIN_REVIEWS_FOR_DISTRIBUTION, countdownParts, formatParisDeadline, type RatingSummary } from "@/lib/marketing";
import { formatEUR } from "@/lib/money";
import type { PublicReview } from "@/lib/reviews";
import type { Size } from "@/lib/sizes";
import { stockMessage, type StockInfo } from "@/lib/stock-status";
import type { PublicProduct } from "@/lib/types";
import type { PreviewData } from "./types";
import type { Purchase } from "./usePurchase";

// The review form (and its validation library) loads only when its window opens.
const ReviewForm = dynamic(() => import("@/components/store/ReviewForm").then((m) => m.ReviewForm));

/* ---------- Small helpers ---------- */

/** "À confirmer" markers and preview tags are for development and client review only. */
const SHOW_PENDING = process.env.NODE_ENV !== "production";

export function PreviewTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex max-w-full items-center rounded-full border border-dashed border-[#7d6a43] px-2 py-0.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#d9bf86]", className)}>
      {children}
    </span>
  );
}

/** Renders "texte [point à confirmer]" with the bracketed part as a visible "À confirmer" marker. */
export function WithPending({ text }: { text: string }) {
  // Production never states an unconfirmed term: the marker is simply dropped.
  if (!SHOW_PENDING) return <>{text.replace(/\s*\[[^\]]+\]/g, "")}</>;
  const parts = text.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("[") ? (
          <span key={i} className="ml-1 rounded-md border border-dashed border-[#7d6a43] px-1.5 py-0.5 text-[12px] text-[#d9bf86] [box-decoration-break:clone]">
            <span className="font-semibold uppercase tracking-[0.08em]">À confirmer</span>{" "}
            <span className="text-[#bfae8a]">{part.slice(1, -1).replace(/^À confirmer\s*:?\s*/i, "")}</span>
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const fr1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ---------- Rating summary (clickable, scrolls to the reviews) ---------- */

export function RatingLink({ summary, className, size = 15, compact = false }: { summary: RatingSummary; className?: string; size?: number; compact?: boolean }) {
  if (summary.count === 0) {
    return (
      <a href="#avis" className={clsx("inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-ink", className)}>
        <Stars value={0} size={size} label="Aucune note pour le moment" />
        Nouveauté · aucun avis publié pour l&apos;instant
      </a>
    );
  }
  return (
    <a
      href="#avis"
      aria-label={`Note moyenne ${fr1(summary.average)} sur 5, ${summary.count} avis — voir les avis`}
      className={clsx("group inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}
    >
      <Stars value={summary.average} size={size} />
      <span className="font-semibold tabular-nums">{fr1(summary.average)}</span>
      <span className="text-muted" aria-hidden>·</span>
      <span className="text-ink-2 underline decoration-line-strong underline-offset-4 group-hover:decoration-ink">
        {compact ? `${summary.count} avis` : `${summary.count} avis client${summary.count > 1 ? "s" : ""}`}
      </span>
    </a>
  );
}

/* ---------- Stock status ---------- */

const TONE = {
  ok: { dot: "bg-[#6fbf8f]", text: "text-ink-2" },
  neutral: { dot: "bg-[#6fbf8f]", text: "text-ink-2" },
  low: { dot: "bg-[#e9a23b]", text: "font-semibold text-[#f2c27a]" },
  out: { dot: "bg-muted", text: "text-muted" },
} as const;

export function StockLine({ info, size, className, pill = false }: { info: StockInfo; size: Size | null; className?: string; pill?: boolean }) {
  const m = stockMessage(info, size);
  const t = TONE[m.tone];
  return (
    <p role="status" className={clsx("flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm", pill && "w-fit rounded-full border border-line bg-paper-2 py-1.5 pl-3 pr-3.5", className)}>
      <span className="relative flex size-2.5 shrink-0" aria-hidden>
        {m.tone === "low" && <span className="absolute inset-0 rounded-full bg-[#e9a23b] opacity-60 motion-safe:animate-ping" />}
        <span className={clsx("relative size-2.5 rounded-full", t.dot)} />
      </span>
      <span className={t.text}>{m.text}</span>
      {info.simulated && <PreviewTag>Aperçu · stock simulé</PreviewTag>}
    </p>
  );
}

/* ---------- Campaign countdown (real admin deadline; sample only in preview, tagged) ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

function useCountdown(data: CountdownData) {
  const parts = countdownParts(useRemaining(data.endsAt, data.serverNow));
  const clock = `${parts.days > 0 ? `${parts.days} j ` : ""}${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
  return { parts, clock, deadline: formatParisDeadline(data.endsAt) };
}

export function CountdownRow({ data, sample, variant = "row", className }: { data: CountdownData; sample: boolean; variant?: "row" | "bar" | "chip"; className?: string }) {
  const { parts, clock, deadline } = useCountdown(data);
  if (parts.done) return null;
  const timer = (
    <span role="timer" aria-label={`Fin de l'offre le ${deadline}`} className="font-display font-bold tabular-nums text-brand [font-variation-settings:'wdth'_90]" suppressHydrationWarning>
      {clock}
    </span>
  );
  if (variant === "chip") {
    return (
      <p className={clsx("inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2", className)}>
        <ClockIcon /> {data.title} · fin dans {timer}
        {sample && <PreviewTag>Aperçu · campagne fictive</PreviewTag>}
      </p>
    );
  }
  if (variant === "bar") {
    return (
      <div className={clsx("border-b border-line bg-[#141210]", className)}>
        <div className="container-x flex min-h-10 items-center justify-center gap-x-2.5 py-1.5 text-[13px]">
          <ClockIcon />
          <span className="min-w-0 truncate font-semibold uppercase tracking-[0.06em]">{data.title}</span>
          <span className="hidden shrink-0 text-muted sm:inline">fin dans</span>
          <span className="shrink-0">{timer}</span>
          {sample && <PreviewTag className="shrink-0">Fictif</PreviewTag>}
        </div>
      </div>
    );
  }
  return (
    <div className={clsx("flex items-center justify-between gap-3 rounded-xl border border-[#3a3326] bg-[#15130f] px-4 py-3", className)}>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <ClockIcon /> {data.title}
          {sample && <PreviewTag>Aperçu · campagne fictive</PreviewTag>}
        </span>
        <span className="mt-0.5 block text-xs text-muted">Jusqu&apos;au {deadline}</span>
      </span>
      <span className="shrink-0 text-lg">{timer}</span>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-brand" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Delivery estimate ---------- */

export function deliveryWords(plan: DeliveryPlan) {
  return { long: rangeLong(plan.deliveryFrom, plan.deliveryTo), short: rangeShort(plan.deliveryFrom, plan.deliveryTo) };
}

export function DeliveryEstimate({ plan, free, variant = "card", className }: { plan: DeliveryPlan; free: boolean; variant?: "card" | "split"; className?: string }) {
  const w = deliveryWords(plan);
  if (variant === "split") {
    return (
      <div className={clsx("flex items-center gap-3.5 rounded-2xl border border-line bg-paper-2 px-4 py-3.5", className)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#16231b] text-[#8fd9ad]" aria-hidden>
          <TruckIcon width={20} height={20} />
        </span>
        <p className="min-w-0">
          <span className="block font-semibold leading-snug">Livrée {w.long}</span>
          <span className="block text-sm leading-snug text-ink-2">
            Pour une commande aujourd&apos;hui · {free ? "livraison offerte et suivie" : "livraison suivie"}
          </span>
        </p>
      </div>
    );
  }
  return (
    <div className={clsx("flex items-start gap-3 rounded-2xl border border-line bg-paper-2 p-4", className)}>
      <TruckIcon width={22} height={22} className="mt-0.5 shrink-0 text-brand" />
      <p>
        <span className="block font-semibold">Livrée {w.long}</span>
        <span className="block text-sm text-ink-2">{free ? "Livraison gratuite et suivie" : "Livraison suivie"} · {plan.minDays} à {plan.maxDays} jours ouvrés</span>
      </p>
    </div>
  );
}

/* ---------- Delivery timeline: COMMANDE → EXPÉDITION → LIVRAISON (estimate, not tracking) ---------- */

function StepIcon({ i }: { i: number }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (i === 0) return <svg {...common}><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>;
  if (i === 1) return <svg {...common}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></svg>;
  return <svg {...common}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></svg>;
}

export function timelineSteps(plan: DeliveryPlan) {
  return [
    { label: "Commande", date: "Aujourd'hui", note: "Demande confirmée par e-mail" },
    { label: "Expédition", date: shortDay(plan.dispatchDay), note: "Suivi envoyé par e-mail" },
    { label: "Livraison", date: rangeShort(plan.deliveryFrom, plan.deliveryTo), note: "Chez toi, sans frais" },
  ];
}

export function DeliveryTimeline({ plan, variant = "card", className }: { plan: DeliveryPlan; variant?: "card" | "compact" | "editorial"; className?: string }) {
  const steps = timelineSteps(plan);
  const caption = (
    <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
      Estimation avant commande, calculée en jours ouvrés (week-ends et jours fériés exclus) — ce n&apos;est pas un suivi de colis.
      {!plan.confirmed && SHOW_PENDING && <PreviewTag>Délais à confirmer</PreviewTag>}
    </p>
  );
  if (variant === "compact") {
    return (
      <div className={clsx("rounded-2xl border border-line bg-paper-2 px-4 py-4", className)}>
        <ol className="grid grid-cols-3" aria-label="Estimation de livraison">
          {steps.map((s, i) => (
            <li key={s.label} className="relative text-center">
              {i > 0 && <span aria-hidden className={clsx("absolute right-1/2 top-[13px] h-[2px] w-full", i === 1 ? "bg-gradient-to-r from-brand to-line-strong" : "bg-line-strong")} />}
              <span className={clsx("relative z-10 mx-auto grid size-7 place-items-center rounded-full", i === 0 ? "bg-brand text-paper" : "border border-line-strong bg-paper text-ink")}>
                <span className="scale-[0.8]"><StepIcon i={i} /></span>
              </span>
              <span className="mt-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">{s.label}</span>
              <span className="block text-[13px] font-semibold">{s.date}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (variant === "editorial") {
    return (
      <div className={className}>
        <ol className="grid gap-px overflow-hidden rounded-[22px] border border-line bg-line sm:grid-cols-3" aria-label="Estimation de livraison">
          {steps.map((s, i) => (
            <li key={s.label} className="relative bg-paper-2 p-6 lg:p-8">
              <span className="flex items-center justify-between">
                <span className="font-display text-[13px] font-bold tracking-[0.2em] text-brand">0{i + 1}</span>
                <span className={clsx("grid size-10 place-items-center rounded-full", i === 2 ? "bg-brand text-paper" : "border border-line-strong text-ink")}><StepIcon i={i} /></span>
              </span>
              <span className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{s.label}</span>
              <span className="price mt-1 block text-[26px] leading-tight lg:text-[30px]">{s.date}</span>
              <span className="mt-1 block text-sm text-ink-2">{s.note}</span>
            </li>
          ))}
        </ol>
        {caption}
      </div>
    );
  }
  return (
    <div className={clsx("rounded-2xl border border-line bg-paper-2 p-5", className)}>
      <ol className="grid grid-cols-3 gap-2" aria-label="Estimation de livraison">
        {steps.map((s, i) => (
          <li key={s.label} className="relative text-center">
            {i > 0 && <span aria-hidden className="absolute right-1/2 top-5 h-px w-full bg-line-strong" />}
            <span className={clsx("relative z-10 mx-auto grid size-10 place-items-center rounded-full", i === 2 ? "bg-brand text-paper" : "border border-line-strong bg-paper-2 text-ink")}>
              <StepIcon i={i} />
            </span>
            <span className="mt-2.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">{s.label}</span>
            <span className="mt-0.5 block text-[13px] font-semibold sm:text-sm">{s.date}</span>
          </li>
        ))}
      </ol>
      {caption}
    </div>
  );
}

/* ---------- Reassurance: Delivery / Payment / Returns (true statements only) ---------- */

function ShieldIcon(p: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={p.width ?? 22} height={p.height ?? 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" className={p.className} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" />
    </svg>
  );
}

export function trustItems(d: PreviewData) {
  const w = deliveryWords(d.plan);
  return [
    {
      key: "delivery",
      icon: TruckIcon,
      title: d.freeShipping ? "Livraison offerte et suivie" : "Livraison suivie",
      text: `${d.plan.minDays} à ${d.plan.maxDays} jours ouvrés après confirmation. Commandée aujourd'hui : livrée ${w.long}.`,
      short: `Livrée ${w.short}`,
    },
    d.payments.online
      ? { key: "payment", icon: ShieldIcon, title: "Paiement en ligne", text: "Réglé à la fin de la commande.", short: "Paiement en ligne" }
      : {
          key: "payment",
          icon: ShieldIcon,
          title: "Rien à payer aujourd'hui",
          text: "Tu envoies une demande de commande : nous la confirmons par e-mail et t'indiquons comment régler. Aucune donnée bancaire n'est demandée sur le site.",
          short: "Paiement après confirmation",
        },
    {
      key: "returns",
      icon: ReturnIcon,
      title: `Retour possible sous ${d.policy.windowDays} jours après réception`,
      text: "Contacte notre service client avec ton numéro de commande pour recevoir les instructions.",
      short: `Retour ${d.policy.windowDays} jours`,
    },
  ];
}

export function TrustCards({ d, variant = "cards", className }: { d: PreviewData; variant?: "cards" | "rows" | "editorial"; className?: string }) {
  const items = trustItems(d);
  if (variant === "rows") {
    return (
      <ul className={clsx("divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper-2", className)}>
        {items.map(({ key, icon: Icon, title, text }) => (
          <li key={key}>
            <details className="group">
              <summary className="flex min-h-14 list-none items-center gap-3 px-4 py-3">
                <Icon width={20} height={20} className="shrink-0 text-brand" />
                <span className="flex-1 text-sm font-semibold">{title}</span>
                <span className="text-lg text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="px-4 pb-4 pl-[52px] text-sm leading-relaxed text-ink-2">
                {text}{" "}
                {key === "returns" && <Link href={d.returnsHref} className="underline underline-offset-4 hover:text-brand">Retours & remboursements</Link>}
              </p>
            </details>
          </li>
        ))}
      </ul>
    );
  }
  if (variant === "cards") {
    return (
      <ul className={clsx("grid gap-2", className)}>
        {items.map(({ key, icon: Icon, title, text }) => (
          <li key={key} className={clsx("flex gap-3.5 rounded-2xl border bg-paper-2 p-4", key === "returns" ? "border-[#4a3f2a]" : "border-line")}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-brand">
              <Icon width={18} height={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-snug">{title}</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
                {text}
                {key === "returns" && (
                  <>
                    {" "}
                    <Link href={d.returnsHref} className="text-ink underline underline-offset-4 hover:text-brand">Retours & remboursements</Link>
                  </>
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={clsx("grid gap-3 md:grid-cols-3 md:gap-4", className)}>
      {items.map(({ key, icon: Icon, title, text }) => (
        <li key={key} className={clsx("relative flex flex-col overflow-hidden rounded-2xl border bg-paper-2 p-6 lg:p-7", key === "returns" ? "border-[#4a3f2a]" : "border-line")}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />
          <span className="grid size-11 place-items-center rounded-full border border-line-strong text-brand">
            <Icon width={22} height={22} />
          </span>
          <span className="mt-4 block font-display text-base font-bold uppercase leading-snug tracking-[0.04em]">{title}</span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-muted">{text}</span>
          {key === "returns" && (
            <Link href={d.returnsHref} className="mt-auto inline-flex min-h-11 items-end pt-2 text-[13px] text-ink underline underline-offset-4 hover:text-brand">
              Retours & remboursements
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/** One-line returns reassurance right under the main button (client requirement). */
export function ReturnsLine({ d, className }: { d: PreviewData; className?: string }) {
  return (
    <p className={clsx("flex items-start gap-2.5 text-sm", className)}>
      <ReturnIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand" />
      <span>
        <span className="font-semibold">Retour possible sous {d.policy.windowDays} jours après réception.</span>{" "}
        <Link href={d.returnsHref} className="text-muted underline underline-offset-4 hover:text-ink">Conditions</Link>
      </span>
    </p>
  );
}

export function PaymentNote({ d, className }: { d: PreviewData; className?: string }) {
  if (d.payments.online) return null;
  return (
    <p className={clsx("text-xs leading-relaxed text-muted", className)}>
      Paiement en ligne bientôt disponible : ta demande de commande est confirmée par e-mail, rien n&apos;est débité aujourd&apos;hui.
    </p>
  );
}

/* ---------- Offer selector ---------- */

function Thumb({ p, className }: { p: PublicProduct; className?: string }) {
  return (
    <span className={clsx("relative block overflow-hidden bg-studio", className)}>
      {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="56px" className={`object-cover ${artClass(p.images[0], "thumb")}`} />}
    </span>
  );
}

export function OfferSelector({ p, d, variant = "cards" }: { p: Purchase; d: PreviewData; variant?: "cards" | "tiles" | "segmented" }) {
  if (!p.bundleAvailable) return null;
  const perJacket = formatEUR(Math.round(p.bundlePrice / p.bundle.quantity));
  const opts = [
    { value: "single" as const, title: "La veste seule", sub: d.product.color.name, price: formatEUR(d.product.priceCents) },
    { value: "bundle" as const, title: p.bundle.label, sub: `Soit ${perJacket} la veste · 2 coloris au choix`, price: formatEUR(p.bundlePrice) },
  ];
  const radio = (o: (typeof opts)[number]) => (
    <input type="radio" name="offer" value={o.value} checked={p.offer === o.value} onChange={() => p.setOffer(o.value)} className="peer sr-only" />
  );

  if (variant === "segmented") {
    return (
      <fieldset>
        <legend className="sr-only">Choisis ton offre</legend>
        <div className="grid grid-cols-2 gap-2">
          {opts.map((o) => {
            const on = p.offer === o.value;
            const bundle = o.value === "bundle";
            return (
              <label
                key={o.value}
                className={clsx(
                  "tap relative flex min-h-[104px] flex-col justify-between rounded-2xl border p-3.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                  on ? "border-brand bg-[#17140f] shadow-[inset_0_0_0_1px_var(--color-brand)]" : "border-line-strong bg-paper-2 hover:border-ink",
                )}
              >
                {radio(o)}
                {bundle && p.percent > 0 && (
                  <span className="absolute -top-3 right-3 rounded-full bg-brand px-2.5 py-0.5 text-[13px] font-bold text-paper">−{p.percent} %</span>
                )}
                <span className="flex items-center gap-2">
                  <span className={clsx("grid size-[18px] shrink-0 place-items-center rounded-full border", on ? "border-brand bg-brand" : "border-line-strong")} aria-hidden>
                    {on && <span className="size-1.5 rounded-full bg-paper" />}
                  </span>
                  <span className="text-[14px] font-semibold uppercase tracking-[0.06em]">{bundle ? "2 vestes" : "1 veste"}</span>
                </span>
                <span>
                  <span className="price block text-[26px] leading-none">{o.price}</span>
                  {bundle ? (
                    <span className="mt-1 block text-xs">
                      <span className="text-muted line-through">{formatEUR(p.bundleFull)}</span>{" "}
                      <span className="font-semibold text-[#6fbf8f]">−{formatEUR(p.savings)}</span>
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs text-muted">{d.product.color.name}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (variant === "tiles") {
    return (
      <fieldset>
        <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Ton offre</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {opts.map((o) => {
            const on = p.offer === o.value;
            const bundle = o.value === "bundle";
            return (
              <label
                key={o.value}
                className={clsx(
                  "relative flex items-center gap-3 rounded-[14px] border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                  on ? "border-ink bg-paper-3" : "border-line hover:border-line-strong",
                )}
              >
                {radio(o)}
                <span className="flex shrink-0 -space-x-4" aria-hidden>
                  {(bundle ? p.slotProducts : [d.product]).map((t, j) => (
                    <Thumb key={t.id + j} p={t} className="h-14 w-11 rounded-md ring-2 ring-paper-2" />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{bundle ? "Le duo" : "La veste"}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="price text-lg">{o.price}</span>
                    {bundle && p.savings > 0 && <span className="text-xs text-muted line-through">{formatEUR(p.bundleFull)}</span>}
                  </span>
                  {bundle && p.savings > 0 && <span className="block text-xs text-brand">{formatEUR(p.savings)} d&apos;économie · −{p.percent} %</span>}
                  {!bundle && <span className="block text-xs text-muted">{d.product.color.name}</span>}
                </span>
                <span className={clsx("grid size-5 shrink-0 place-items-center self-start rounded-full border", on ? "border-ink bg-ink" : "border-line-strong")} aria-hidden>
                  {on && <CheckIcon width={12} height={12} className="text-paper" />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset>
      <legend className="sr-only">Choisis ton offre</legend>
      <div className="grid gap-2.5">
        {opts.map((o) => {
          const on = p.offer === o.value;
          const bundle = o.value === "bundle";
          return (
            <label
              key={o.value}
              className={clsx(
                "tap relative flex min-h-[76px] items-center gap-3.5 rounded-2xl border px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                on ? "border-ink bg-paper-3 shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong bg-paper-2 hover:border-ink",
              )}
            >
              {radio(o)}
              <span className={clsx("grid size-5 shrink-0 place-items-center rounded-full border-2", on ? "border-ink" : "border-line-strong")} aria-hidden>
                {on && <span className="size-2.5 rounded-full bg-ink" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{bundle ? o.title : d.product.name}</span>
                {bundle && p.savings > 0 ? (
                  <span className="mt-1 inline-block rounded-full bg-[#1d3a2a] px-2 py-0.5 text-xs font-semibold text-[#8fd9ad]">{formatEUR(p.savings)} d&apos;économie</span>
                ) : (
                  <span className="block text-xs text-muted">{bundle ? o.sub : "La veste seule"}</span>
                )}
              </span>
              <span className="shrink-0 text-right">
                <span className="price block text-xl">{o.price}</span>
                {bundle && p.savings > 0 && <span className="block text-xs text-muted line-through">{formatEUR(p.bundleFull)}</span>}
              </span>
              {bundle && p.percent > 0 && (
                <span className="absolute -top-3 right-4 rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-bold text-paper">−{p.percent} %</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------- Colour + size selection (single jacket or the two pack jackets) ---------- */

function SizeHeader({ label, value, onGuide }: { label: string; value: Size | null; onGuide: () => void }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label} <span className="text-ink">{value ?? "—"}</span>
      </p>
      <button type="button" onClick={onGuide} className="-my-2 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium underline underline-offset-4 hover:text-brand">
        <RulerIcon width={16} height={16} /> Trouver ma taille
      </button>
    </div>
  );
}

export function Selection({ p, d, compact = false }: { p: Purchase; d: PreviewData; compact?: boolean }) {
  const guideSize = p.guideFor === null ? null : p.guideFor < 0 ? p.size : p.slots[p.guideFor]?.size;
  return (
    <>
      {p.offer === "single" ? (
        <div className={compact ? "space-y-5" : "space-y-6"}>
          {d.siblings.length > 1 && (
            <div>
              <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
                Couleur <span className="text-ink">{d.product.color.name}</span>
              </p>
              <Swatches variant="image" label="Couleur" options={d.siblings} value={d.product.id} onSelect={p.goToColour} />
            </div>
          )}
          <div id="field-single" className="scroll-mt-32">
            <SizeHeader label="Taille" value={p.size} onGuide={() => p.setGuideFor(-1)} />
            <SizePicker product={d.product} name="size" value={p.size} error={!!p.errors.single} onChange={p.setSize} hideRemaining />
            {p.errors.single ? <p className="mt-2 text-sm text-[#f08a7e]" role="alert">{p.errors.single}</p> : p.size && <StockLine info={d.stock[d.product.id]} size={p.size} className="mt-2.5" />}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {p.slots.map((slot, i) => {
            const sp = p.slotProducts[i];
            const err = p.errors[`slot${i}`];
            return (
              <div key={i} id={`field-slot${i}`} className={clsx("scroll-mt-32 rounded-2xl border bg-paper-2", compact ? "p-3.5" : "p-4", err ? "border-[#8a3b33]" : "border-line")}>
                <div className="mb-3 flex items-center gap-3">
                  <Thumb p={sp} className="h-12 w-10 shrink-0 rounded-md" />
                  <p className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Veste {i + 1}</span>
                    <span className="block font-semibold">{sp.color.name}{slot.size ? ` · ${slot.size}` : ""}</span>
                  </p>
                </div>
                <Swatches variant="image" label={`Couleur de la veste ${i + 1}`} options={d.bundleOptions} value={slot.productId} onSelect={(np) => p.selectSlotColour(i, np)} />
                <div className="mt-4">
                  <SizeHeader label="Taille" value={slot.size} onGuide={() => p.setGuideFor(i)} />
                  <SizePicker product={sp} name={`size-${i}`} value={slot.size} error={!!err} onChange={(s) => p.updateSlot(i, { size: s })} hideRemaining />
                  {err ? <p className="mt-2 text-sm text-[#f08a7e]" role="alert">{err}</p> : slot.size && <StockLine info={d.stock[sp.id]} size={slot.size} className="mt-2.5" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <SizeGuide
        key={`${p.guideFor}-${guideSize ?? ""}`}
        open={p.guideFor !== null}
        onClose={() => p.setGuideFor(null)}
        rules={d.sizeRules}
        chart={d.sizeChart}
        onPick={(s) => {
          if (p.guideFor === -1) p.setSize(s);
          else if (p.guideFor !== null) p.updateSlot(p.guideFor, { size: s });
          p.setGuideFor(null);
        }}
      />
    </>
  );
}

/* ---------- Main button + sticky mobile bar ---------- */

export function ctaLabel(p: Purchase) {
  if (!p.config.acceptingOrders) return "Commandes bientôt ouvertes";
  return p.offer === "bundle" ? `Ajouter le pack · ${formatEUR(p.total)}` : `Ajouter au panier · ${formatEUR(p.total)}`;
}

export function CtaButton({ p, className }: { p: Purchase; className?: string }) {
  return (
    <Button size="lg" className={clsx("h-[58px] w-full text-[14px]", className)} onClick={p.addToCart} disabled={!p.config.acceptingOrders}>
      {p.added ? (
        <>
          <CheckIcon width={18} height={18} /> Ajouté au panier
        </>
      ) : (
        ctaLabel(p)
      )}
    </Button>
  );
}

/**
 * Mobile only. Hidden while the options/button block is on screen (it can never
 * cover a control) and over the footer. With a size missing it scrolls to the
 * size picker instead of adding a default size.
 */
export function StickyBar({ p, d, extra }: { p: Purchase; d: PreviewData; extra?: ReactNode }) {
  const needsSize = p.missing.length > 0;
  const go = () => {
    if (needsSize) document.getElementById(`field-${p.missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    else p.addToCart();
  };
  const summary =
    p.offer === "bundle"
      ? p.slotProducts.map((x, i) => `${x.color.name}${p.slots[i].size ? ` ${p.slots[i].size}` : ""}`).join(" + ")
      : `${d.product.name}${p.size ? ` · ${p.size}` : ""}`;
  return (
    <div
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md transition-transform duration-300 md:hidden",
        p.barHidden ? "pointer-events-none translate-y-full" : "translate-y-0",
      )}
      aria-hidden={p.barHidden}
      data-sticky-bar
    >
      {extra}
      <div className="flex items-center gap-3 px-4">
        <Thumb p={p.offer === "bundle" ? p.slotProducts[0] : d.product} className="h-12 w-10 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{summary}</p>
          <p className="flex items-baseline gap-2">
            <span className="price text-xl">{formatEUR(p.total)}</span>
            {p.offer === "bundle" && p.savings > 0 && <span className="text-xs font-semibold text-[#8fd9ad]">−{formatEUR(p.savings)}</span>}
          </p>
        </div>
        <Button className="h-12 shrink-0 px-5" tabIndex={p.barHidden ? -1 : 0} onClick={go} disabled={!p.config.acceptingOrders}>
          {needsSize ? "Choisir ma taille" : p.offer === "bundle" ? "Ajouter le pack" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Reviews ---------- */

export function ReviewSourceNote({ d }: { d: PreviewData }) {
  if (d.reviewSource === "manifest")
    return <PreviewTag>Aperçu · les {d.summary.count} avis publiés en production</PreviewTag>;
  if (d.reviewSource === "forced-empty") return <PreviewTag>Aperçu · état sans avis</PreviewTag>;
  return null;
}

function Distribution({ summary, className }: { summary: RatingSummary; className?: string }) {
  if (summary.count < MIN_REVIEWS_FOR_DISTRIBUTION) return null;
  return (
    <dl className={clsx("grid gap-1.5 text-xs text-ink-2", className)} aria-label="Répartition des notes">
      {([5, 4, 3, 2, 1] as const).map((n) => {
        const c = summary.distribution[n];
        return (
          <div key={n} className="grid grid-cols-[28px_1fr_22px] items-center gap-2">
            <dt className="tabular-nums">{n} ★</dt>
            <dd className="h-1.5 overflow-hidden rounded-full bg-paper-3">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${(c / summary.count) * 100}%` }} />
            </dd>
            <dd className="text-right tabular-nums text-muted">{c}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function RatingPanel({ summary, className }: { summary: RatingSummary; className?: string }) {
  if (summary.count === 0) return null;
  return (
    <div className={clsx("flex items-center gap-5 rounded-2xl border border-line bg-paper-2 p-4 sm:gap-8 sm:p-5", className)}>
      <div>
        <p className="flex items-baseline gap-2">
          <span className="price price-strong text-[44px] leading-none sm:text-[52px]">{fr1(summary.average)}</span>
          <span className="text-ink-2">/ 5</span>
        </p>
        <Stars value={summary.average} size={15} className="mt-2" />
        <p className="mt-1 whitespace-nowrap text-sm text-muted">{summary.count} avis publié{summary.count > 1 ? "s" : ""}</p>
      </div>
      <Distribution summary={summary} className="min-w-0 flex-1 sm:min-w-[220px]" />
    </div>
  );
}

export function ReviewCard({ r, onPhoto, photoTall = false }: { r: PublicReview; onPhoto: (src: string) => void; photoTall?: boolean }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper-2">
      {r.photos[0] && (
        <button type="button" onClick={() => onPhoto(r.photos[0])} className={clsx("relative block w-full overflow-hidden bg-studio", photoTall ? "aspect-[4/5]" : "aspect-square")} aria-label={`Agrandir la photo de ${r.author}`}>
          {/* Customer photos: not run through the image optimizer (gated / external source). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.photos[0]} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
        </button>
      )}
      <div className="flex flex-1 flex-col p-4">
        <Stars value={r.rating} size={14} />
        {r.title && <h3 className="mt-3 font-semibold leading-snug">{r.title}</h3>}
        <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-2">{r.text}</p>
        <p className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-4 text-sm">
          <span className="font-semibold">{r.author}</span>
          {r.color && <span className="text-muted">· {r.color}</span>}
          {r.verified && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8fd9ad]">
              <CheckIcon width={12} height={12} /> Achat vérifié
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

export function useReviewModals(d: PreviewData) {
  const [writing, setWriting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const modals = (
    <>
      <Modal open={writing} onClose={() => setWriting(false)} title="Ton avis" description={d.product.name} className="max-w-xl">
        {writing && <ReviewForm productId={d.product.id} onDone={() => setWriting(false)} />}
      </Modal>
      <Modal open={photo !== null} onClose={() => setPhoto(null)} title="Photo client" className="max-w-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt="Photo partagée par un client" className="max-h-[70dvh] w-full rounded-xl object-contain" />}
      </Modal>
    </>
  );
  return { setWriting, setPhoto, modals };
}

export function EmptyReviews({ onWrite }: { onWrite: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <Stars value={0} size={20} label="Aucune note pour le moment" />
      <p className="mt-4 font-display text-lg font-bold uppercase">Aucun avis publié pour le moment.</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">Les avis sont relus avant publication. Tu as reçu ta veste ? Partage ton ressenti.</p>
      <Button size="lg" className="mt-6" onClick={onWrite}>Écrire un avis</Button>
    </div>
  );
}

/** Grid of photo reviews (masonry-like columns) with "voir plus". */
export function ReviewGrid({ d, pageSize = 6, className }: { d: PreviewData; pageSize?: number; className?: string }) {
  const [shown, setShown] = useState(pageSize);
  const { setWriting, setPhoto, modals } = useReviewModals(d);
  if (d.summary.count === 0) return <div className={className}><EmptyReviews onWrite={() => setWriting(true)} />{modals}</div>;
  const remaining = d.reviews.length - shown;
  return (
    <div className={className}>
      <ul className="columns-2 gap-2.5 sm:gap-4 lg:columns-3 [&>li]:mb-2.5 sm:[&>li]:mb-4">
        {d.reviews.slice(0, shown).map((r) => (
          <li key={r.id} className="break-inside-avoid">
            <ReviewCard r={r} onPhoto={setPhoto} />
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {remaining > 0 && (
          <Button size="lg" variant="ghost" className="w-full border border-line-strong hover:bg-paper-3 sm:w-auto" onClick={() => setShown((s) => s + pageSize)}>
            Voir plus d&apos;avis ({remaining})
          </Button>
        )}
        <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => setWriting(true)}>Écrire un avis</Button>
      </div>
      {modals}
    </div>
  );
}

/** Horizontal, swipeable photo-review carousel (scroll-snap, no library). */
export function ReviewCarousel({ d, className, onSeeAll }: { d: PreviewData; className?: string; onSeeAll?: () => void }) {
  const { setWriting, setPhoto, modals } = useReviewModals(d);
  if (d.summary.count === 0) return <div className={className}><EmptyReviews onWrite={() => setWriting(true)} />{modals}</div>;
  const withPhotos = [...d.reviews].sort((a, b) => b.photos.length - a.photos.length);
  return (
    <div className={className}>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0" aria-label="Avis clients, faire défiler">
        {withPhotos.slice(0, 12).map((r) => (
          <li key={r.id} className="w-[72%] max-w-[300px] shrink-0 snap-start sm:w-[44%] lg:w-[23%]">
            <ReviewCard r={r} onPhoto={setPhoto} photoTall />
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {onSeeAll && (
          <Button size="lg" variant="ghost" className="w-full border border-line-strong hover:bg-paper-3 sm:w-auto" onClick={onSeeAll}>
            Lire les {d.summary.count} avis
          </Button>
        )}
        <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => setWriting(true)}>Écrire un avis</Button>
      </div>
      {modals}
    </div>
  );
}

/* ---------- Customer videos: slot prepared, nothing invented ---------- */

export function VideoSlot({ className }: { className?: string }) {
  return (
    <section aria-labelledby="videos-title" className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="lab">Vidéos clients</p>
        <PreviewTag>Masqué en production</PreviewTag>
      </div>
      <h2 id="videos-title" className="display mt-3 text-[26px] uppercase sm:text-[36px]">En vrai, ça donne ça.</h2>
      <p className="mt-2 max-w-xl text-sm text-muted">Emplacement prêt pour les vidéos de clients, dès qu&apos;elles sont fournies avec leur autorisation. Rien n&apos;est affiché en attendant.</p>
      <ul className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="grid aspect-[9/16] w-[30%] max-w-[150px] shrink-0 place-items-center rounded-2xl border border-dashed border-line-strong bg-paper-2 p-3 text-center text-xs text-muted">
            <span>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-line-strong" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M10 9.5v5l4-2.5-4-2.5z" fill="currentColor" />
              </svg>
              Emplacement vidéo {i + 1}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- FAQ + customer service ---------- */

export function FaqList({ d, className }: { d: PreviewData; className?: string }) {
  return (
    <div className={clsx("faq divide-y divide-line border-y border-line", className)}>
      {d.faq.map((f) => (
        <details key={f.question} className="group">
          <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-4 font-semibold">
            {f.question}
            <span className="faq-icon shrink-0 text-xl text-muted transition-transform" aria-hidden>+</span>
          </summary>
          <p className="pb-5 text-[15px] leading-relaxed text-ink-2">
            <WithPending text={f.answer} />
            {/returner/.test(f.question) && (
              <>
                {" "}
                <Link href={d.returnsHref} className="underline underline-offset-4 hover:text-brand">Retours & remboursements</Link>
              </>
            )}
          </p>
        </details>
      ))}
    </div>
  );
}

export function SupportCard({ d, className }: { d: PreviewData; className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-paper-2 p-5 sm:p-6", className)}>
      <p className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full border border-line-strong text-brand"><MailIcon width={18} height={18} /></span>
        <span className="font-display text-base font-bold uppercase">Une question ?</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Notre service client répond par e-mail, avant comme après ta commande (taille, livraison, retour). Indique ton numéro de commande si tu en as un.
      </p>
      {SHOW_PENDING && <p className="mt-2 text-sm text-ink-2"><WithPending text="[Délai de réponse et horaires du service client]" /></p>}
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <a href={`mailto:${d.contactEmail}`} className="inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4 hover:text-brand">{d.contactEmail}</a>
        <Link href="/#contact" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-brand">Formulaire de contact</Link>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-[13px] text-muted">
        <li><Link href="/livraison-retours" className="inline-flex min-h-11 items-center hover:text-ink">Livraison</Link></li>
        <li><Link href={d.returnsHref} className="inline-flex min-h-11 items-center hover:text-ink">Retours & remboursements</Link></li>
        {SHOW_PENDING && <li className="py-3"><WithPending text="[CGV et mentions légales à créer]" /></li>}
      </ul>
    </div>
  );
}

/* ---------- Product details ---------- */

export function DetailsAccordion({ product, className, openFirst = true }: { product: PublicProduct; className?: string; openFirst?: boolean }) {
  return (
    <div className={clsx("faq divide-y divide-line border-y border-line", className)}>
      <details open={openFirst} className="group">
        <summary className="flex min-h-14 list-none items-center justify-between py-4 text-[14px] font-semibold uppercase tracking-[0.12em]">
          Description <span className="faq-icon text-xl text-muted transition-transform" aria-hidden>+</span>
        </summary>
        <p className="pb-5 text-[15px] leading-relaxed text-ink-2">{product.description}</p>
      </details>
      {(product.details.length > 0 || product.material) && (
        <details className="group">
          <summary className="flex min-h-14 list-none items-center justify-between py-4 text-[14px] font-semibold uppercase tracking-[0.12em]">
            Détails & entretien <span className="faq-icon text-xl text-muted transition-transform" aria-hidden>+</span>
          </summary>
          <ul className="list-disc space-y-1 pb-5 pl-5 text-[15px] text-ink-2">
            {product.details.map((x) => <li key={x}>{x}</li>)}
            {product.material && <li>Composition : {product.material}</li>}
            {product.care && <li>Entretien : {product.care}</li>}
          </ul>
        </details>
      )}
    </div>
  );
}

/* ---------- Other colours ---------- */

export function RelatedColours({ d, basePath, className }: { d: PreviewData; basePath: string; className?: string }) {
  const { bundle } = useStore().config;
  return (
    <ul className={clsx("no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:px-0", className)}>
      {d.related.map((r) => (
        <li key={r.id} className="w-[38%] shrink-0 sm:w-auto">
          <Link href={`${basePath}/${r.slug}`} className="group block">
            <Thumb p={r} className="aspect-[4/5] w-full rounded-xl" />
            <span className="mt-2 block text-sm font-semibold">{r.color.name}</span>
            <span className="block text-xs text-muted">{formatEUR(r.priceCents)}{bundle.enabled && ` · ou 2 pour ${formatEUR(bundle.priceCents)}`}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
