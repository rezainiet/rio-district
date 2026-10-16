"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const MAX_PHOTOS = 3;
const MAX_BYTES = 6 * 1024 * 1024;
const RATING_LABELS = ["", "Décevante", "Moyenne", "Bien", "Très bien", "Excellente"];

const fieldCls = "field rounded-xl border-transparent bg-paper-3";
const labelCls = "mb-1.5 block text-sm font-semibold text-ink-2";
const errCls = "mt-1.5 text-xs text-[#f08a7b]";

/** Customer review form. Submissions go to moderation; nothing is published automatically. */
export function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ verified: boolean } | null>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // Object URLs only exist in the browser, after the files were picked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  if (done) {
    return (
      <div role="status" className="py-4 text-center">
        <p className="display text-3xl uppercase text-brand">Merci !</p>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-2">
          Ton avis a bien été envoyé. Il sera publié après relecture par notre équipe.
          {done.verified && " Ta commande a été retrouvée : il portera la mention « Achat vérifié »."}
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={onDone}>Fermer</Button>
      </div>
    );
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, MAX_PHOTOS);
    const tooBig = next.find((f) => f.size > MAX_BYTES);
    setErrors((e) => ({ ...e, photos: tooBig ? "6 Mo maximum par photo." : "" }));
    setFiles(next.filter((f) => f.size <= MAX_BYTES));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const local: Record<string, string> = {};
    if (!rating) local.rating = "Choisis une note.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    fd.set("rating", String(rating));
    fd.set("productId", productId);
    fd.delete("photos");
    files.forEach((f) => fd.append("photos", f));
    setBusy(true);
    setServerError("");
    const res = await fetch("/api/reviews", { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setDone({ verified: Boolean(data?.verified) });
      return;
    }
    setErrors(data?.fields ?? {});
    setServerError(data?.fields ? "" : data?.error ?? "Envoi impossible. Réessaie dans un instant.");
  };

  const err = (k: string) => (errors[k] ? <p id={`rv-${k}-error`} className={errCls}>{errors[k]}</p> : null);
  const aria = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `rv-${k}-error` } : {});
  const shownRating = hover || rating;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <fieldset>
        <legend className={labelCls}>Ta note</legend>
        <div className="flex items-center gap-3" onMouseLeave={() => setHover(0)}>
          <div className="flex" role="radiogroup" aria-label="Note sur 5" {...aria("rating")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="grid size-11 cursor-pointer place-items-center text-brand" onMouseEnter={() => setHover(n)}>
                <input
                  type="radio"
                  name="rating-choice"
                  value={n}
                  checked={rating === n}
                  onChange={() => { setRating(n); setErrors((e) => ({ ...e, rating: "" })); }}
                  className="peer sr-only"
                  aria-label={`${n} étoile${n > 1 ? "s" : ""} sur 5`}
                />
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden className="rounded-full peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-brand">
                  <path
                    d="M12 2.8l2.75 5.7 6.25.9-4.5 4.4 1.05 6.2L12 17.05 6.45 20l1.05-6.2L3 9.4l6.25-.9z"
                    fill={n <= shownRating ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeOpacity={n <= shownRating ? 1 : 0.4}
                    strokeWidth={1.3}
                    strokeLinejoin="round"
                  />
                </svg>
              </label>
            ))}
          </div>
          <span className="text-sm text-muted" aria-live="polite">{RATING_LABELS[shownRating]}</span>
        </div>
        {err("rating")}
      </fieldset>

      <div>
        <label htmlFor="rv-title" className={labelCls}>Titre</label>
        <input id="rv-title" name="title" maxLength={80} required className={fieldCls} placeholder="Ex. Parfaite pour la mi-saison" {...aria("title")} />
        {err("title")}
      </div>

      <div>
        <label htmlFor="rv-text" className={labelCls}>Ton avis</label>
        <textarea id="rv-text" name="text" rows={5} maxLength={1500} required className={`${fieldCls} resize-y`} placeholder="Coupe, taille choisie, matière, livraison…" {...aria("text")} />
        {err("text")}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="rv-name" className={labelCls}>Prénom et nom</label>
          <input id="rv-name" name="name" autoComplete="name" maxLength={40} required className={fieldCls} {...aria("name")} />
          <p className="mt-1.5 text-xs text-muted">Affiché sous la forme « Prénom N. »</p>
          {err("name")}
        </div>
        <div>
          <label htmlFor="rv-email" className={labelCls}>E-mail</label>
          <input id="rv-email" name="email" type="email" autoComplete="email" required className={fieldCls} {...aria("email")} />
          <p className="mt-1.5 text-xs text-muted">Jamais publié.</p>
          {err("email")}
        </div>
      </div>

      <div>
        <label htmlFor="rv-order" className={labelCls}>
          N° de commande <span className="font-normal text-muted">— facultatif</span>
        </label>
        <input id="rv-order" name="orderNumber" maxLength={20} className={`${fieldCls} uppercase`} placeholder="RD-10012" {...aria("orderNumber")} />
        <p className="mt-1.5 text-xs text-muted">Avec l&apos;e-mail de ta commande livrée, ton avis porte la mention « Achat vérifié ».</p>
        {err("orderNumber")}
      </div>

      <div>
        <span className={labelCls}>Photos <span className="font-normal text-muted">— facultatif, {MAX_PHOTOS} max.</span></span>
        <div className="flex flex-wrap items-center gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative size-16 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 grid size-6 place-items-center rounded-full bg-paper/85 text-xs"
                aria-label={`Retirer la photo ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <label className="grid size-16 cursor-pointer place-items-center rounded-xl border border-dashed border-line-strong text-2xl text-muted transition-colors hover:border-ink hover:text-ink focus-within:border-brand">
              +
              <input
                type="file"
                name="photos"
                accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
                multiple
                className="sr-only"
                aria-label="Ajouter des photos"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </label>
          )}
        </div>
        {err("photos")}
      </div>

      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" {...aria("consent")} />
        <span>J&apos;accepte que mon avis (prénom et initiale, note, texte et photos) soit publié après relecture.</span>
      </label>
      {err("consent")}

      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>Site web<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {serverError && <p role="alert" className="text-sm text-[#f08a7b]">{serverError}</p>}
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Envoi…" : "Envoyer mon avis"}
      </Button>
      <p className="-mt-2 text-center text-xs text-muted">Les avis sont relus avant publication. Aucun avis n&apos;est modifié.</p>
    </form>
  );
}
