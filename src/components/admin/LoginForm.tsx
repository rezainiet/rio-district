"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/admin/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
        }).catch(() => null);
        const data = await res?.json().catch(() => null);
        if (res?.ok) {
          router.replace("/admin");
          router.refresh();
        } else {
          setError(data?.error ?? "Connexion impossible.");
          setPending(false);
        }
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
