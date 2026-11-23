/* Presentational pop-up panels, shared by the storefront and the admin previews. */
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { useT } from "@/i18n/client";

function CloseButton({ onClose, className = "" }: { onClose?: () => void; className?: string }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={t("Fermer")}
      className={`grid size-11 place-items-center rounded-full border border-line-strong bg-paper/80 text-ink backdrop-blur transition-colors hover:bg-paper-3 ${className}`}
    >
      <CloseIcon width={18} height={18} />
    </button>
  );
}

/** Welcome / exit-intent panel: optional spotlit product photo, title, message, one CTA. */
export function PromoPanel({
  eyebrow,
  title,
  text,
  ctaLabel,
  ctaHref,
  imageUrl,
  titleId,
  onClose,
  onCta,
  cta,
}: {
  eyebrow: string;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  titleId: string;
  onClose?: () => void;
  onCta?: () => void;
  /** Lets the caller render the CTA (e.g. a client-side Link). */
  cta?: ReactNode;
}) {
  const { t } = useT();
  return (
    <div className={`relative grid overflow-hidden rounded-[18px] border border-line bg-paper-2 text-ink ${imageUrl ? "sm:grid-cols-[5fr_6fr]" : ""}`}>
      {/* First in DOM order so the dialog's initial focus lands on "Fermer", not on the offer. */}
      <CloseButton onClose={onClose} className="absolute right-3 top-3 z-10" />
      {imageUrl && (
        <div className="shot relative h-48 bg-studio sm:h-auto sm:min-h-[400px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover object-[50%_30%]" />
        </div>
      )}
      <div className="flex flex-col justify-center p-6 pt-7 sm:p-10">
        <p className="lab">{eyebrow}</p>
        <h2 id={titleId} className="display mt-3 pr-10 text-[28px] uppercase sm:text-[36px]">
          {title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{text}</p>
        {(cta || (ctaLabel && ctaHref)) && (
          <div className="mt-8">
            {cta ?? (
              <a href={ctaHref} onClick={onCta} className={buttonClass("primary", "lg", "w-full")}>
                {ctaLabel}
              </a>
            )}
          </div>
        )}
        <button type="button" onClick={onClose} className="mx-auto mt-3 min-h-11 px-4 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          {t("Non merci")}
        </button>
      </div>
    </div>
  );
}

export type ReminderItem = { key: string; label: string; detail: string; image: string };

/** Discreet cart reminder card (non-modal). */
export function CartReminderPanel({
  title,
  text,
  items,
  totalLabel,
  count,
  titleId,
  onOpenCart,
  onClose,
}: {
  title: string;
  text: string;
  items: ReminderItem[];
  totalLabel: string;
  count: number;
  titleId: string;
  onOpenCart?: () => void;
  onClose?: () => void;
}) {
  const { t, locale } = useT();
  const shown = items.slice(0, 2);
  const more = items.length - shown.length;
  // French uses the singular for 0 and 1, Spanish only for 1.
  const oneItem = locale === "fr" ? count <= 1 : count === 1;
  return (
    <div className="relative rounded-[18px] border border-line-strong bg-paper-2 p-5 text-ink shadow-[0_30px_80px_-20px_#000]">
      <p className="lab pr-12">{t("Ton panier")}</p>
      <h2 id={titleId} className="mt-2 pr-12 font-display text-lg font-extrabold uppercase leading-tight sm:text-xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-ink-2">{text}</p>
      <ul className="mt-4 space-y-2.5">
        {shown.map((it) => (
          <li key={it.key} className="flex items-center gap-3">
            <span className="shot relative size-12 shrink-0 rounded-lg bg-studio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image && <img src={it.image} alt="" className="absolute inset-0 size-full object-cover" />}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block truncate font-semibold">{it.label}</span>
              <span className="block truncate text-xs text-muted">{it.detail}</span>
            </span>
          </li>
        ))}
        {more > 0 && <li className="text-xs text-muted">{more === 1 ? t("+ {n} autre article", { n: more }) : t("+ {n} autres articles", { n: more })}</li>}
      </ul>
      <p className="mt-4 flex items-baseline justify-between border-t border-line pt-3 text-sm">
        <span className="text-ink-2">
          {oneItem ? t("{n} article", { n: count }) : t("{n} articles", { n: count })}
        </span>
        <span className="price text-lg">{totalLabel}</span>
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onOpenCart} className={buttonClass("primary", "md", "w-full")}>
          {t("Voir mon panier")}
        </button>
        <button type="button" onClick={onClose} className={buttonClass("ghost", "md", "w-full border border-line-strong hover:bg-paper-3")}>
          {t("Continuer mes achats")}
        </button>
      </div>
      <CloseButton onClose={onClose} className="absolute right-3 top-3" />
    </div>
  );
}
