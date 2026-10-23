"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { trackCheckoutClick } from "./MarketingPixels";

export function ResumeCheckout({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return <div><Button disabled={busy} variant="outline" onClick={async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Relance impossible.");
      const url = new URL(data.checkout.redirectUrl, location.origin);
      const allowed = data.checkout.mode === "mock" ? url.origin === location.origin && /^\/commande\/paiement-test\/[A-Za-z0-9_-]{24}$/.test(url.pathname)
        : url.protocol === "https:" && url.host === "www.molipy8trk.com" && ["/2J23GL9/TTF23GH/", "/2J23GL9/TRSKRX3/"].includes(url.pathname);
      if (!allowed) throw new Error("Destination refusée.");
      if (data.checkout.mode === "live" && data.order && trackCheckoutClick(data.order.totalCents, data.order.number)) {
        await new Promise(resolve => window.setTimeout(resolve, 300));
      }
      location.assign(url.href);
    } catch (e) { setError(e instanceof Error ? e.message : "Connexion interrompue. Réessaie sans recréer la commande."); setBusy(false); lock.current = false; }
  }}>{busy ? "Préparation…" : "Reprendre le paiement ↗"}</Button>{error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}</div>;
}
