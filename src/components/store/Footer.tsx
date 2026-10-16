import Link from "next/link";
import { Logo } from "./Header";
import type { PublicProduct } from "@/lib/types";

export function Footer({
  storeName,
  tagline,
  contactEmail,
  products,
  social,
  returnsHref,
}: {
  storeName: string;
  tagline: string;
  contactEmail: string;
  products: PublicProduct[];
  social: { instagram: string; tiktok: string };
  returnsHref: string;
}) {
  const year = new Date().getFullYear();
  // min-h-11 (44px): comfortable touch targets without changing the visual rhythm.
  const linkCls = "link-underline inline-flex min-h-11 items-center text-ink-2 hover:text-ink";
  return (
    <footer className="mt-auto border-t border-line">
      {/* Tablet: the wordmark (no-wrap) gets its own row; four columns from lg, where it fits. */}
      <div className="container-x grid gap-10 pb-8 pt-12 md:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="md:col-span-3 lg:col-span-1">
          <Logo name={storeName} className="text-[26px] sm:text-[30px] lg:text-[34px]" />
          <p className="mt-3 max-w-sm text-[15px] text-muted">{tagline}</p>
        </div>

        <nav aria-label="Coloris">
          <p className="lab mb-3">Coloris</p>
          <ul className="grid grid-cols-2 text-[15px] md:grid-cols-1">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/produit/${p.slug}`} className={`${linkCls} gap-2.5`}>
                  <span className="size-3 rounded-full ring-1 ring-white/25" style={{ background: p.color.hex }} aria-hidden />
                  {p.color.name || p.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Aide">
          <p className="lab mb-3">Aide</p>
          <ul className="text-[15px]">
            <li><Link className={linkCls} href="/livraison-retours">Livraison</Link></li>
            <li><Link className={linkCls} href={returnsHref}>Retours & remboursements</Link></li>
            <li><Link className={linkCls} href="/#faq">Questions fréquentes</Link></li>
            <li><Link className={linkCls} href="/#contact">Contact</Link></li>
            <li><Link className={linkCls} href="/panier">Panier</Link></li>
          </ul>
        </nav>

        <div>
          <p className="lab mb-3">Nous écrire</p>
          <ul className="text-[15px]">
            <li><a href={`mailto:${contactEmail}`} className={`${linkCls} break-all`}>{contactEmail}</a></li>
            {social.instagram && <li><a className={linkCls} href={social.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></li>}
            {social.tiktok && <li><a className={linkCls} href={social.tiktok} rel="noopener noreferrer" target="_blank">TikTok</a></li>}
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5 text-[13px] text-muted sm:flex-row sm:justify-between md:col-span-3 lg:col-span-4">
          <p>© {year} {storeName}. Tous droits réservés.</p>
          <p>Prix TTC · Paiement en ligne bientôt disponible</p>
        </div>
      </div>
    </footer>
  );
}
