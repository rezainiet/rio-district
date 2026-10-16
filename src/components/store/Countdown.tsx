"use client";

import { useEffect, useState } from "react";
import { countdownParts, formatParisDeadline } from "@/lib/marketing";
import { ButtonLink } from "@/components/ui/Button";
import type { BundleConfig } from "@/lib/types";
import { formatEUR } from "@/lib/money";

export type CountdownData = {
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  /** UTC ISO deadline stored on the server. */
  endsAt: string;
  /** Server clock when the page was rendered (corrects a wrong device clock). */
  serverNow: number;
};

/**
 * Remaining time until a REAL campaign deadline saved by an admin. The end
 * date comes from the database, so reloading never resets it; when it is
 * reached the block disappears. It never changes a price.
 */
export function useRemaining(endsAt: string, serverNow: number) {
  const end = Date.parse(endsAt);
  const [remaining, setRemaining] = useState(end - serverNow);
  useEffect(() => {
    const skew = serverNow - Date.now();
    // First paint uses the server clock; ticks then follow the corrected device clock.
    const t = setInterval(() => setRemaining(end - (Date.now() + skew)), 1000);
    return () => clearInterval(t);
  }, [end, serverNow]);
  return remaining;
}

const UNITS = [
  ["days", "Jours"],
  ["hours", "Heures"],
  ["minutes", "Min"],
  ["seconds", "Sec"],
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export function HeaderOffer({ bundle, data }: { bundle: BundleConfig; data?: CountdownData | null }) {
  return <a href={data?.ctaHref || "/#pack"} className="header-offer">
    <span>{bundle.quantity} vestes <span className="text-brand">· {formatEUR(bundle.priceCents)}</span></span>
    {data ? <HeaderDeadline data={data} /> : <span className="header-offer-note">Le duo, à ta façon</span>}
  </a>;
}

function HeaderDeadline({ data }: { data: CountdownData }) {
  const parts = countdownParts(useRemaining(data.endsAt, data.serverNow));
  if (parts.done) return <span className="header-offer-note">Les coloris au choix</span>;
  return <span className="header-offer-note">Fin dans <span role="timer" aria-label={`Fin de l'offre le ${formatParisDeadline(data.endsAt)}`} className="font-bold tabular-nums text-ink">{parts.days > 0 && `${parts.days}j `}{pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}</span></span>;
}

export function CountdownBand({ data }: { data: CountdownData }) {
  const remaining = useRemaining(data.endsAt, data.serverNow);
  const parts = countdownParts(remaining);
  if (parts.done) return null;
  const deadline = formatParisDeadline(data.endsAt);

  return (
    <section aria-labelledby="campagne-title" className="container-x pt-4 lg:pt-10">
      {/* Container queries: the layout follows the band's own width (storefront or admin preview). */}
      <div className="@container">
        <div className="relative overflow-hidden rounded-[18px] border border-line bg-paper-2 px-6 py-8 @xl:px-10 @5xl:flex @5xl:items-center @5xl:justify-between @5xl:gap-12 @5xl:py-10">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />
          <div className="min-w-0 max-w-xl @5xl:flex-1">
            <p className="lab">Jusqu&apos;au {deadline}</p>
            <h2 id="campagne-title" className="display mt-3 text-[28px] uppercase @xl:text-[36px] @5xl:text-[44px]">
              {data.title}
            </h2>
            {data.text && <p className="mt-3 text-ink-2">{data.text}</p>}
          </div>
          <div className="mt-8 flex flex-col gap-6 @xl:flex-row @xl:items-center @5xl:mt-0 @5xl:shrink-0">
            <div role="timer" aria-label={`Fin de l'offre le ${deadline}`} className="flex items-stretch">
              {UNITS.map(([key, label], i) => (
                <div key={key} className={`min-w-[64px] px-3 text-center @xl:min-w-[76px] ${i > 0 ? "border-l border-line-strong" : "pl-0 @xl:pl-3"}`}>
                  <span aria-hidden className="block font-display text-[34px] font-extrabold leading-none tabular-nums @xl:text-[44px]">
                    {key === "days" ? parts.days : pad(parts[key])}
                  </span>
                  <span aria-hidden className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{label}</span>
                </div>
              ))}
            </div>
            {data.ctaLabel && data.ctaHref && (
              <ButtonLink href={data.ctaHref} size="lg" className="w-full @xl:w-auto">
                {data.ctaLabel}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Slim one-line version for the product page (above the purchase options). */
export function CountdownStrip({ data }: { data: CountdownData }) {
  const remaining = useRemaining(data.endsAt, data.serverNow);
  const parts = countdownParts(remaining);
  if (parts.done) return null;
  const deadline = formatParisDeadline(data.endsAt);
  const body = (
    <>
      <span className="min-w-0">
        <span className="line-clamp-2 block text-sm font-semibold uppercase tracking-[0.08em]">{data.title}</span>
        <span className="block text-xs text-muted">Jusqu&apos;au {deadline}</span>
      </span>
      <span role="timer" aria-label={`Fin de l'offre le ${deadline}`} className="shrink-0 font-display text-lg font-bold tabular-nums text-brand">
        <span aria-hidden>
          {parts.days > 0 && `${parts.days}j `}
          {pad(parts.hours)}h {pad(parts.minutes)}m {pad(parts.seconds)}s
        </span>
      </span>
    </>
  );
  const cls = "mb-6 flex min-h-14 items-center justify-between gap-4 rounded-xl border border-line bg-paper-2 px-4 py-3";
  return data.ctaHref ? (
    <a href={data.ctaHref} className={`${cls} transition-colors hover:border-line-strong`}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  );
}
