"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/avis", label: "Avis" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/reglages", label: "Réglages" },
];

export function AdminNav({
  storeName,
  email,
  newMessages,
  pendingOrders,
  pendingReviews,
}: {
  storeName: string;
  email: string;
  newMessages: number;
  pendingOrders: number;
  pendingReviews: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const counts: Record<string, number> = { "/admin/messages": newMessages, "/admin/commandes": pendingOrders, "/admin/avis": pendingReviews };

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <aside className="border-b border-paper/10 bg-ink text-paper md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-b-0 md:border-r">
      <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-5">
        <Link href="/admin" className="display whitespace-nowrap text-[26px] [font-variation-settings:'wdth'_62]">
          <span className="uppercase">{storeName}</span>
          <span className="text-lime">.</span> <span className="eyebrow align-middle text-[10px] text-paper/50">admin</span>
        </Link>
        <button onClick={logout} className="text-xs text-paper/60 underline underline-offset-4 hover:text-paper md:hidden">
          Déconnexion
        </button>
      </div>
      <nav aria-label="Administration" className="no-scrollbar overflow-x-auto px-2 pb-2 md:px-3 md:pb-0">
        <ul className="flex gap-1 md:flex-col">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const count = counts[item.href] ?? 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center justify-between gap-3 whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                    active ? "bg-paper text-ink" : "text-paper/75 hover:bg-white/10 hover:text-paper",
                  )}
                >
                  {item.label}
                  {count > 0 && (
                    <span className={clsx("rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-ink text-paper" : "bg-lime text-ink")}>
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="hidden px-5 md:absolute md:inset-x-0 md:bottom-0 md:block md:pb-5">
        <Link href="/" target="_blank" className="block text-xs text-paper/60 hover:text-paper">Voir la boutique ↗</Link>
        <p className="mt-4 truncate text-xs text-paper/50">{email}</p>
        <button onClick={logout} className="mt-1 text-xs text-paper/80 underline underline-offset-4 hover:text-paper">
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
