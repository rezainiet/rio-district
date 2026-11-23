"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LOCALES, LOCALE_NAME, localizePath, switchLocaleHref, type Locale } from "@/i18n/config";
import { useT } from "@/i18n/client";

const homes = () => Object.fromEntries(LOCALES.map((l) => [l, localizePath("/", l)])) as Record<Locale, string>;

/**
 * FR · ES. Plain links with a full page load: the whole layout (header,
 * footer, cart, metadata) must render again in the other language. Each link
 * points at the same page in the other language (the home page until the
 * browser URL is known, i.e. during server rendering).
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = useT();
  const pathname = usePathname();
  const [targets, setTargets] = useState<Record<Locale, string>>(homes);

  useEffect(() => {
    // The browser URL is the public one (/producto/…); read it after each navigation.
    const here = window.location.pathname + window.location.search;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargets(Object.fromEntries(LOCALES.map((l) => [l, switchLocaleHref(here, l)])) as Record<Locale, string>);
  }, [pathname]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, to: Locale) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const { pathname: path, search, hash } = window.location;
    window.location.assign(switchLocaleHref(path + search + hash, to));
  };

  return (
    <nav aria-label={t("Langue")} className={clsx("inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.12em]", className)}>
      {LOCALES.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1">
          {i > 0 && <span aria-hidden="true" className="opacity-40">·</span>}
          {l === locale ? (
            <span aria-current="true" lang={l} title={LOCALE_NAME[l]} className="px-1 py-1">
              {l.toUpperCase()}
            </span>
          ) : (
            <a href={targets[l]} hrefLang={l} lang={l} title={LOCALE_NAME[l]} onClick={(e) => go(e, l)} className="px-1 py-1 opacity-60 transition-opacity hover:opacity-100">
              {l.toUpperCase()}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}
