"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { popupsAllowedOn, type LivePopup, type LivePopups } from "@/lib/marketing";
import { formatEUR } from "@/lib/money";
import { buttonClass } from "@/components/ui/Button";
import { useStore } from "./StoreProvider";
import { CartReminderPanel, PromoPanel } from "./PopupPanels";

type Kind = "welcome" | "exitIntent" | "cartReminder";

export const popupEyebrow = (kind: "welcome" | "exitIntent", storeName: string) =>
  kind === "welcome" ? `Bienvenue chez ${storeName}` : "Avant de partir";

/* ---------- Frequency memory (per browser). Storage can be unavailable: fail closed. ---------- */

const LAST_KEY = (k: Kind) => `rd.popup.${k}`;
const SESSION_SHOWN = "rd.popup.session";
const SESSION_VISIT = "rd.visit";
const DAY = 86_400_000;

function read(store: "local" | "session", key: string) {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return "blocked";
  }
}
function write(store: "local" | "session", key: string, value: string) {
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Not shown in this session yet, and not within the configured frequency window. */
function eligible(kind: Kind, popup: LivePopup) {
  if (read("session", SESSION_SHOWN)) return false;
  const last = read("local", LAST_KEY(kind));
  if (last === "blocked") return false;
  return !last || Date.now() - Number(last) >= popup.frequencyDays * DAY;
}

/** Another overlay (cart drawer, mobile menu, size guide, review form…) is open. */
function overlayOpen() {
  return Boolean(
    document.querySelector("dialog[open]") ||
      document.querySelector('[aria-controls="mobile-menu"][aria-expanded="true"]') ||
      document.querySelector('[aria-labelledby="cart-title"]'),
  );
}

/**
 * Marketing pop-ups. Rules:
 * - only campaigns an admin enabled AND filled in reach this component;
 * - never on the cart or checkout pages; never over another overlay;
 * - at most one pop-up per visit, and each respects its frequency window;
 * - the exit-intent pop-up needs a real exit gesture on a desktop pointer;
 * - the cart reminder only greets a RETURNING visit with items in the cart.
 */
export function MarketingPopups({ popups }: { popups: LivePopups }) {
  const pathname = usePathname();
  const { lines, quote, hydrated, setDrawerOpen, config } = useStore();
  const [open, setOpen] = useState<Kind | null>(null);
  const pathRef = useRef(pathname);
  const linesRef = useRef(lines.length);
  const openRef = useRef<Kind | null>(null);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  useEffect(() => {
    linesRef.current = lines.length;
  }, [lines.length]);

  /** Shows a pop-up if every rule allows it. Returns false when it should be retried later. */
  const tryShow = useCallback(
    (kind: Kind) => {
      const popup = popups[kind];
      if (!popup || openRef.current || !eligible(kind, popup)) return true;
      if (!popupsAllowedOn(pathRef.current)) return false;
      if (kind === "cartReminder" && linesRef.current === 0) return true;
      if (kind === "welcome" && linesRef.current > 0) return true; // already shopping: no welcome
      if (overlayOpen()) return false;
      openRef.current = kind;
      setOpen(kind);
      write("session", SESSION_SHOWN, kind);
      write("local", LAST_KEY(kind), String(Date.now()));
      return true;
    },
    [popups],
  );

  /** Delayed pop-up; if the page is busy at that moment, retry every 3 s for one minute. */
  const schedule = useCallback(
    (kind: Kind, seconds: number) => {
      let retry: ReturnType<typeof setInterval> | undefined;
      const timer = setTimeout(() => {
        if (tryShow(kind)) return;
        let tries = 0;
        retry = setInterval(() => {
          if (tryShow(kind) || ++tries >= 20) clearInterval(retry);
        }, 3000);
      }, seconds * 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(retry);
      };
    },
    [tryShow],
  );

  // Cart reminder (returning visit with a cart) has priority over the welcome pop-up.
  useEffect(() => {
    if (!hydrated) return;
    const returning = read("session", SESSION_VISIT) === null && read("local", "rd.seen") !== null;
    write("session", SESSION_VISIT, "1");
    write("local", "rd.seen", "1");
    if (returning && popups.cartReminder && linesRef.current > 0) return schedule("cartReminder", popups.cartReminder.seconds);
    if (popups.welcome) return schedule("welcome", popups.welcome.seconds);
    // Runs once per page load, after the cart has been read from storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Exit intent: desktop pointer leaving through the top edge of the window.
  useEffect(() => {
    const popup = popups.exitIntent;
    if (!popup) return;
    if (!window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) return;
    const since = Date.now();
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget || e.clientY > 0) return;
      if (Date.now() - since < popup.seconds * 1000) return;
      if (tryShow("exitIntent")) document.removeEventListener("mouseout", onOut);
    };
    document.addEventListener("mouseout", onOut);
    return () => document.removeEventListener("mouseout", onOut);
  }, [popups.exitIntent, tryShow]);

  const close = useCallback(() => {
    openRef.current = null;
    setOpen(null);
  }, []);

  // Never rendered on the cart or checkout pages, even if one was open before navigating.
  if (!open || !popupsAllowedOn(pathname)) return null;
  if (open === "cartReminder") {
    return (
      <CartReminder
        popup={popups.cartReminder!}
        onClose={close}
        onOpenCart={() => {
          close();
          setDrawerOpen(true);
        }}
        items={quote.lines.map((l, i) => ({
          key: `${i}`,
          label: l.kind === "bundle" ? l.label : l.items[0]?.name ?? "",
          detail: `${l.items.map((it) => (l.kind === "bundle" ? `${it.color} ${it.size}` : `Taille ${it.size}`)).join(" + ")}${l.quantity > 1 ? ` · ×${l.quantity}` : ""}`,
          image: l.items[0]?.image ?? "",
        }))}
        count={quote.itemsCount}
        totalLabel={formatEUR(quote.totalCents)}
        onProductPage={pathname.startsWith("/produit/")}
      />
    );
  }
  return <PromoDialog kind={open} popup={popups[open]!} storeName={config.storeName} onClose={close} />;
}

function PromoDialog({ kind, popup, storeName, onClose }: { kind: "welcome" | "exitIntent"; popup: LivePopup; storeName: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null;
    // showModal(): focus trap, Escape to close and inert background come from the browser.
    if (!el.open) el.showModal();
    // No el.close() here: its "close" event would dismiss the pop-up on a
    // re-run of this effect. Unmounting removes the dialog anyway.
    return () => previous?.focus?.();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-24px)] bg-transparent p-0 backdrop:bg-black/70 motion-safe:animate-fade-up motion-safe:backdrop:backdrop-blur-sm ${popup.imageUrl ? "max-w-[760px]" : "max-w-[480px]"}`}
    >
      <PromoPanel
        eyebrow={popupEyebrow(kind, storeName)}
        title={popup.title}
        text={popup.text}
        ctaLabel={popup.ctaLabel}
        ctaHref={popup.ctaHref}
        imageUrl={popup.imageUrl}
        titleId={titleId}
        onClose={onClose}
        cta={
          popup.ctaLabel && popup.ctaHref ? (
            popup.ctaHref.startsWith("/") ? (
              <Link href={popup.ctaHref} onClick={onClose} className={buttonClass("primary", "lg", "w-full")}>
                {popup.ctaLabel}
              </Link>
            ) : (
              <a href={popup.ctaHref} onClick={onClose} className={buttonClass("primary", "lg", "w-full")}>
                {popup.ctaLabel}
              </a>
            )
          ) : undefined
        }
      />
    </dialog>
  );
}

function CartReminder({
  popup,
  items,
  count,
  totalLabel,
  onClose,
  onOpenCart,
  onProductPage,
}: {
  popup: LivePopup;
  items: { key: string; label: string; detail: string; image: string }[];
  count: number;
  totalLabel: string;
  onClose: () => void;
  onOpenCart: () => void;
  onProductPage: boolean;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (count === 0) return null;

  // Non-modal: the page stays usable and focus is not stolen. On the product
  // page it sits above the sticky add-to-cart bar instead of covering it.
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={`fixed inset-x-3 z-40 motion-safe:animate-fade-up sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] ${onProductPage ? "bottom-[96px]" : "bottom-3"}`}
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <CartReminderPanel
        title={popup.title}
        text={popup.text}
        items={items}
        count={count}
        totalLabel={totalLabel}
        titleId={titleId}
        onClose={onClose}
        onOpenCart={onOpenCart}
      />
    </div>
  );
}
