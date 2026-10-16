import Link from "next/link";
import { Logo } from "./Header";
import type { PublicProduct } from "@/lib/types";

export function Footer({
  storeName,
  tagline,
  contactEmail,
  products,
  social,
}: {
  storeName: string;
  tagline: string;
  contactEmail: string;
  products: PublicProduct[];
  social: { instagram: string; tiktok: string };
}) {
  const year = new Date().getFullYear();
  // min-h-11 (44px): comfortable touch targets without changing the visual rhythm.
  const linkCls = "link-underline inline-flex min-h-11 items-center text-ink-2 hover:text-ink";
  return (
    <footer className="mt-auto border-t border-line">
      <div className="container-x grid gap-10 pb-8 pt-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo name={storeName} className="whitespace-nowrap text-[28px] sm:text-[34px] lg:text-[40px]" />
          <p className="mt-3 max-w-sm text-sm text-muted">{tagline}</p>
        </div>

        <nav aria-label="Coloris">
          <p className="lab mb-4">Coloris</p>
          <ul className="grid grid-cols-2 text-sm md:grid-cols-1">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/produit/${p.slug}`} className={`${linkCls} inline-flex items-center gap-2`}>
                  <span className="size-2.5 rounded-full ring-1 ring-white/20" style={{ background: p.color.hex }} aria-hidden />
                  {p.color.name || p.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Aide">
          <p className="lab mb-4">Aide</p>
          <ul className="text-sm">
            <li><Link className={linkCls} href="/livraison-retours">Livraison & retours</Link></li>
            <li><Link className={linkCls} href="/#faq">FAQ</Link></li>
            <li><Link className={linkCls} href="/#contact">Contact</Link></li>
            <li><Link className={linkCls} href="/panier">Panier</Link></li>
          </ul>
        </nav>

        <div>
          <p className="lab mb-4">Suivre</p>
          <ul className="text-sm">
            {social.instagram && <li><a className={linkCls} href={social.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></li>}
            {social.tiktok && <li><a className={linkCls} href={social.tiktok} rel="noopener noreferrer" target="_blank">TikTok</a></li>}
            <li><a href={`mailto:${contactEmail}`} className={`${linkCls} break-all`}>{contactEmail}</a></li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5 text-[12.5px] text-muted sm:flex-row sm:justify-between md:col-span-4">
          <p>© {year} {storeName}. Tous droits réservés.</p>
          <p>Prix TTC · Paiement en ligne bientôt disponible</p>
        </div>
      </div>
    </footer>
  );
}
