import Link from "next/link";
import { Logo } from "./Logo";
import type { PublicProduct } from "@/lib/types";
import { MarketingConsentSettingsButton } from "./MarketingPixels";
import { LanguageSwitch } from "./LanguageSwitch";
import { getT } from "@/i18n/server";

export async function Footer({ storeName, tagline, contactEmail, products, social, returnsHref }: {
  storeName: string; tagline: string; contactEmail: string; products: PublicProduct[];
  social: { instagram: string; tiktok: string }; returnsHref: string;
}) {
  const { t, href } = await getT();
  return <footer className="rio-footer border-t border-line"><div className="container-x">
    <div className="footer-main">
      <div><Logo name={storeName} /><p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">{tagline}</p><p className="mt-3 text-xs uppercase tracking-[0.18em] text-brand">{t("Une allure. Six expressions.")}</p></div>
      <nav aria-label={t("Les coloris Rio")} className="footer-colors"><p className="lab mb-4">{t("Trouve ta couleur")}</p><ul>{products.map(p => <li key={p.id}><Link href={href("/produit/" + p.slug)}><span style={{background:p.color.hex}} aria-hidden="true" />{p.color.name}<span aria-hidden="true" className="ml-auto text-muted">↗</span></Link></li>)}</ul></nav>
      <div className="footer-contact"><p className="lab">{t("On est là pour toi")}</p><Link href={href("/#contact")} className="footer-contact-cta">{t("Parlons-en.")} <span aria-hidden="true">↗</span></Link><a href={"mailto:" + contactEmail} className="mt-3 inline-block break-all text-sm text-muted hover:text-ink">{contactEmail}</a><div className="mt-5 flex gap-5 text-sm">{social.instagram && <a href={social.instagram} rel="noopener noreferrer" target="_blank">Instagram ↗</a>}{social.tiktok && <a href={social.tiktok} rel="noopener noreferrer" target="_blank">TikTok ↗</a>}</div></div>
    </div>
    <div className="footer-bottom"><p>© {new Date().getFullYear()} {storeName}</p><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><Link href={href("/livraison-retours")}>{t("Livraison")}</Link><Link href={href(returnsHref)}>{t("Retours & remboursements")}</Link><MarketingConsentSettingsButton /><span>{t("Prix TTC")}</span><LanguageSwitch className="-my-1" /></div></div>
  </div></footer>;
}
