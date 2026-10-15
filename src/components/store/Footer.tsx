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
  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <Logo name={storeName} className="text-[64px] [font-variation-settings:'wdth'_62] md:text-[96px]" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/70">{tagline}</p>
        </div>

        <nav aria-label="Coloris" className="md:col-span-3">
          <p className="eyebrow mb-4 text-paper/50">Coloris</p>
          <ul className="grid grid-cols-2 gap-y-2.5 text-sm md:grid-cols-1">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/produit/${p.slug}`} className="link-underline inline-flex items-center gap-2 text-paper/85 hover:text-paper">
                  <span className="size-2.5 rounded-full ring-1 ring-paper/30" style={{ background: p.color.hex }} aria-hidden />
                  {p.color.name || p.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Aide" className="md:col-span-2">
          <p className="eyebrow mb-4 text-paper/50">Aide</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="link-underline text-paper/85 hover:text-paper" href="/livraison-retours">Livraison & retours</Link></li>
            <li><Link className="link-underline text-paper/85 hover:text-paper" href="/#faq">FAQ</Link></li>
            <li><Link className="link-underline text-paper/85 hover:text-paper" href="/#contact">Contact</Link></li>
            <li><Link className="link-underline text-paper/85 hover:text-paper" href="/panier">Panier</Link></li>
          </ul>
        </nav>

        <div className="md:col-span-2">
          <p className="eyebrow mb-4 text-paper/50">Contact</p>
          <a href={`mailto:${contactEmail}`} className="link-underline break-all text-sm text-paper/85 hover:text-paper">
            {contactEmail}
          </a>
          {(social.instagram || social.tiktok) && (
            <ul className="mt-4 flex gap-4 text-sm">
              {social.instagram && <li><a className="link-underline" href={social.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></li>}
              {social.tiktok && <li><a className="link-underline" href={social.tiktok} rel="noopener noreferrer" target="_blank">TikTok</a></li>}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {storeName}. Tous droits réservés.</p>
          <p>Prix TTC en euros · Paiement en ligne bientôt disponible</p>
        </div>
      </div>
    </footer>
  );
}
