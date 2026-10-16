"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useStore } from "./StoreProvider";
import { formatEUR } from "@/lib/money";
import { BagIcon, CloseIcon, MenuIcon } from "@/components/ui/icons";
import { Logo } from "./Logo";
import { HeaderOffer, type CountdownData } from "./Countdown";

export function Header({ countdown }: { countdown?: CountdownData | null }) {
  const { config, products, quote, hydrated, setDrawerOpen } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuTop, setMenuTop] = useState(56);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // Close the mobile menu when the route changes (adjusting state during render).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const count = hydrated ? quote.itemsCount : 0;
  const close = () => setMenuOpen(false);

  return (
    <>
      <header
        ref={headerRef}
        className={clsx(
          "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200",
          scrolled || menuOpen ? "border-line bg-paper/92 backdrop-blur-md" : "border-transparent bg-paper",
        )}
      >
        <div className="container-x header-main">
          <Link href="/" className="inline-flex h-11 items-center" aria-label={`${config.storeName} — accueil`}>
            <Logo name={config.storeName} />
          </Link>

          <div className="header-offer-slot">{config.bundle.enabled && <HeaderOffer bundle={config.bundle} data={countdown} />}</div>
          <div className="-mr-2 flex items-center justify-self-end">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-paper-2"
              aria-label={`Ouvrir le panier, ${count} article${count > 1 ? "s" : ""}`}
            >
              <BagIcon width={22} height={22} />
              <span
                key={count}
                className={clsx(
                  "absolute right-0.5 top-0.5 grid h-[19px] min-w-[19px] place-items-center rounded-full px-1 text-[11px] font-bold tabular-nums",
                  count > 0 ? "anim-pop bg-brand text-paper" : "bg-paper-3 text-muted",
                )}
                aria-hidden
              >
                {count}
              </span>
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-paper-2 lg:hidden"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => {
                setMenuTop(headerRef.current?.getBoundingClientRect().bottom ?? 56);
                setMenuOpen((v) => !v);
              }}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu: shopping first (the six colours), then help. */}
      <div id="mobile-menu" hidden={!menuOpen} className="anim-fade fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain bg-paper lg:hidden" style={{ top: menuTop }}>
        <nav aria-label="Navigation mobile" className="container-x pb-[max(24px,env(safe-area-inset-bottom))] pt-5">
          <p className="lab">Les vestes · {formatEUR(products[0]?.priceCents ?? 0)}</p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/produit/${p.slug}`} onClick={close} className="tap group block rounded-xl border border-line bg-paper-2 p-1.5 hover:border-line-strong">
                  <span className="shot relative block aspect-square overflow-hidden rounded-lg">
                    {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="120px" className="object-cover" />}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 px-1 pb-0.5 text-[13px] font-semibold">
                    <span className="size-2.5 shrink-0 rounded-full ring-1 ring-white/25" style={{ background: p.color.hex }} aria-hidden />
                    {p.color.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {config.bundle.enabled && products[0] && (
            <Link
              href={`/produit/${products[0].slug}?offre=pack#acheter`}
              onClick={close}
              className="tap mt-3 flex min-h-14 items-center justify-between rounded-xl border border-[#4a3f2a] bg-[#17140f] px-4"
            >
              <span>
                <span className="block font-semibold">{config.bundle.label}</span>
                <span className="block text-[13px] text-muted">2 coloris au choix</span>
              </span>
              <span className="price text-2xl text-brand">{formatEUR(config.bundle.priceCents)}</span>
            </Link>
          )}
          <ul className="mt-6 divide-y divide-line border-y border-line text-[17px]">
            {[
              { href: "/#avis", label: "Avis clients" },
              { href: "/#faq", label: "Questions fréquentes" },
              { href: "/livraison-retours", label: "Livraison" },
              { href: "/retours-remboursements", label: "Retours & remboursements" },
              { href: "/#contact", label: "Contact" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={close} className="flex min-h-[52px] items-center justify-between font-medium">
                  {item.label} <span className="text-muted" aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-6 grid gap-2 text-sm text-ink-2">
            <li>{config.shippingSummary}</li>
            <li>Retour possible sous {config.returnsWindowDays} jours après réception</li>
            {config.contactEmail && <li className="break-all text-muted">{config.contactEmail}</li>}
          </ul>
        </nav>
      </div>
    </>
  );
}
