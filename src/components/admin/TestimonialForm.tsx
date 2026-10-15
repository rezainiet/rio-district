"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputCls, labelCls } from "./ui";

export function TestimonialForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setBusy(true);
        setError("");
        const res = await fetch("/api/admin/testimonials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            author: fd.get("author"),
            text: fd.get("text"),
            rating: Number(fd.get("rating")),
            source: fd.get("source"),
            verified: fd.get("verified") === "on",
            published: fd.get("published") === "on",
          }),
        }).catch(() => null);
        setBusy(false);
        if (res?.ok) {
          form.reset();
          router.refresh();
        } else {
          const data = await res?.json().catch(() => null);
          setError(data?.error ?? "Ajout impossible.");
        }
      }}
    >
      <div>
        <label htmlFor="t-author" className={labelCls}>Auteur</label>
        <input id="t-author" name="author" required className={inputCls} placeholder="Prénom N." />
      </div>
      <div>
        <label htmlFor="t-text" className={labelCls}>Avis</label>
        <textarea id="t-text" name="text" required rows={4} className={inputCls} />
      </div>
      <div>
        <label htmlFor="t-rating" className={labelCls}>Note</label>
        <select id="t-rating" name="rating" defaultValue="5" className={inputCls}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="t-source" className={labelCls}>Source</label>
        <input id="t-source" name="source" className={inputCls} placeholder="ex. e-mail client du 12/10" />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="verified" /> Achat vérifié</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" /> Publier</label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="sm" disabled={busy}>Ajouter</Button>
    </form>
  );
}
