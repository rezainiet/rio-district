import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Connexion admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="display text-center text-5xl text-paper [font-variation-settings:'wdth'_62]">
          KALT<span className="text-lime">.</span>
        </p>
        <p className="eyebrow mt-2 text-center text-paper/50">Espace administration</p>
        <div className="mt-8 rounded-[var(--radius-lg)] bg-paper p-6 shadow-[var(--shadow-pop)]">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
