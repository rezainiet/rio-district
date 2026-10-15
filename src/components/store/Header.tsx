"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useStore } from "./StoreProvider";
import { BagIcon, CloseIcon, MenuIcon } from "@/components/ui/icons";

const NAV = [
  { href: "/#collection", label: "Collection" },
  { href: "/#pack", label: "Pack 2 vestes" },
  { href: "/#details", label: "La veste" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <span className={clsx("display text-[28px] leading-none tracking-[-0.02em] [font-variation-settings:'wdth'_62]", className)}>
      {name}
      <span className="ml-0.5 inline-block size-1.5 translate-y-[-2px] rounded-full bg-brand align-baseline" />
    </span>
  );
}

export function Header() {
  const { config, quote, hydrated, setDrawerOpen } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuTop, setMenuTop] = useState(64);
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
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const count = hydrated ? quote.itemsCount : 0;

  return (
    <>
      <header
        ref={headerRef}
        className={clsx(
          "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
          scrolled || menuOpen ? "border-line bg-paper/95 backdrop-blur-md" : "border-transparent bg-paper",
        )}
      >
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-[72px]">
          <button
            type="button"
            className="-ml-2 grid size-11 place-items-center lg:hidden"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              setMenuTop(headerRef.current?.getBoundingClientRect().bottom ?? 64);
              setMenuOpen((v) => !v);
            }}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <Link href="/" className="lg:mr-8" aria-label={`${config.storeName} — accueil`}>
            <Logo name={config.storeName} />
          </Link>

          <nav aria-label="Navigation principale" className="hidden flex-1 lg:block">
            <ul className="flex items-center gap-7">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="eyebrow link-underline py-1 text-ink-2 hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative -mr-2 flex h-11 items-center gap-2 rounded-full px-2.5 hover:bg-paper-2"
            aria-label={`Ouvrir le panier, ${count} article${count > 1 ? "s" : ""}`}
          >
            <span className="eyebrow hidden sm:inline">Panier</span>
            <BagIcon />
            <span
              className={clsx(
                "absolute right-0.5 top-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-[18px] text-white transition-transform",
                count > 0 ? "scale-100" : "scale-0",
              )}
              aria-hidden
            >
              {count}
            </span>
          </button>
        </div>
      </header>
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-paper lg:hidden"
        style={{ top: menuTop }}
      >
        <nav aria-label="Navigation mobile" className="container-x flex flex-col py-6">
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="display flex items-baseline justify-between border-b border-line py-4 text-5xl"
              style={{ animation: `fade-up .45s ${i * 40}ms var(--ease-out-soft) both` }}
            >
              {item.label}
              <span className="eyebrow text-muted">0{i + 1}</span>
            </Link>
          ))}
          <p className="mt-8 text-sm text-muted">{config.shippingSummary}</p>
        </nav>
      </div>
    </>
  );
}
