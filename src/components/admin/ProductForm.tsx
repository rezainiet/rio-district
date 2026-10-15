"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { centsToInput, inputToCents } from "@/lib/money";
import type { Size } from "@/lib/sizes";
import { Button } from "@/components/ui/Button";
import { Card, inputCls, labelCls } from "./ui";

export type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  group: string;
  categoryId: string;
  color: { name: string; hex: string };
  tagline: string;
  description: string;
  details: string[];
  material: string;
  care: string;
  priceCents: number;
  compareAtCents: number | null;
  images: { url: string; alt: string; kind: "photo" | "placeholder" }[];
  sizes: { label: Size; enabled: boolean; stock: number | null }[];
  status: "active" | "draft" | "archived";
  bundleEligible: boolean;
  sortOrder: number;
  seo: { title: string; description: string };
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ProductForm({
  initial,
  categories,
  canDelete = false,
}: {
  initial: ProductFormValue;
  categories: { id: string; name: string }[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [price, setPrice] = useState(centsToInput(initial.priceCents));
  const [compareAt, setCompareAt] = useState(initial.compareAtCents ? centsToInput(initial.compareAtCents) : "");
  const [details, setDetails] = useState(initial.details.join("\n"));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-danger">{errors[k]}</p>;

  const submit = async (statusOverride?: ProductFormValue["status"]) => {
    setBusy(true);
    setMessage(null);
    setErrors({});
    const priceCents = inputToCents(price);
    const compareAtCents = compareAt.trim() ? inputToCents(compareAt) : null;
    if (Number.isNaN(priceCents) || (compareAtCents !== null && Number.isNaN(compareAtCents))) {
      setErrors({ priceCents: "Prix invalide (ex. 19,99)." });
      setBusy(false);
      return;
    }
    const payload = {
      ...v,
      id: undefined,
      status: statusOverride ?? v.status,
      priceCents,
      compareAtCents,
      details: details.split("\n").map((d) => d.trim()).filter(Boolean),
    };
    const res = await fetch(v.id ? `/api/admin/products/${v.id}` : "/api/admin/products", {
      method: v.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setErrors(data?.fields ?? {});
      setMessage({ tone: "err", text: data?.error ?? "Enregistrement impossible." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (statusOverride) set("status", statusOverride);
    setMessage({ tone: "ok", text: "Produit enregistré." });
    if (!v.id && data?.id) router.replace(`/admin/produits/${data.id}`);
    router.refresh();
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: ProductFormValue["images"] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (res?.ok && data?.url) added.push({ url: data.url, alt: v.name, kind: "photo" });
      else setMessage({ tone: "err", text: data?.error ?? `Échec de l'envoi de ${file.name}.` });
    }
    setV((p) => ({ ...p, images: [...p.images, ...added] }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const moveImage = (i: number, dir: -1 | 1) => {
    const imgs = [...v.images];
    const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    set("images", imgs);
  };

  const remove = async () => {
    if (!v.id) return;
    const hard = canDelete && confirm("Supprimer définitivement ce produit ? (Aucune commande ne le référence.)\nAnnuler = l'archiver à la place.");
    if (!hard && !confirm("Archiver ce produit ? Il disparaîtra de la boutique mais restera dans l'historique des commandes.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/products/${v.id}${hard ? "?hard=1" : ""}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.replace("/admin/produits");
      router.refresh();
    } else {
      const data = await res?.json().catch(() => null);
      setMessage({ tone: "err", text: data?.error ?? "Action impossible." });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-6 lg:grid-cols-3"
      noValidate
    >
      {message && (
        <p role={message.tone === "err" ? "alert" : "status"} className={`rounded-[var(--radius-sm)] p-3 text-sm lg:col-span-3 ${message.tone === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-danger/10 text-danger"}`}>
          {message.text}
        </p>
      )}

      <div className="space-y-6 lg:col-span-2">
        <Card title="Informations">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="p-name" className={labelCls}>Nom</label>
              <input
                id="p-name"
                className={inputCls}
                value={v.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setV((p) => ({ ...p, name, slug: slugTouched ? p.slug : slugify(name) }));
                }}
                required
              />
              {err("name")}
            </div>
            <div>
              <label htmlFor="p-slug" className={labelCls}>Slug (URL /produit/…)</label>
              <input id="p-slug" className={inputCls} value={v.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
              {err("slug")}
            </div>
            <div>
              <label htmlFor="p-cat" className={labelCls}>Catégorie</label>
              <select id="p-cat" className={inputCls} value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Aucune</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-tagline" className={labelCls}>Accroche</label>
              <input id="p-tagline" className={inputCls} value={v.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={200} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-desc" className={labelCls}>Description</label>
              <textarea id="p-desc" rows={5} className={inputCls} value={v.description} onChange={(e) => set("description", e.target.value)} />
              {err("description")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-details" className={labelCls}>Détails (un par ligne)</label>
              <textarea id="p-details" rows={4} className={inputCls} value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
            <div>
              <label htmlFor="p-material" className={labelCls}>Composition</label>
              <input id="p-material" className={inputCls} value={v.material} onChange={(e) => set("material", e.target.value)} placeholder="Ex. 100 % polyester" />
            </div>
            <div>
              <label htmlFor="p-care" className={labelCls}>Entretien</label>
              <input id="p-care" className={inputCls} value={v.care} onChange={(e) => set("care", e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title="Images">
          {v.images.length === 0 && <p className="mb-3 text-sm text-muted">Aucune image. La première image sert de vignette.</p>}
          <ul className="grid gap-3">
            {v.images.map((img, i) => (
              <li key={img.url + i} className="flex gap-3 rounded-[var(--radius-sm)] border border-line p-2">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-paper-2">
                  {/* Plain <img>: previews arbitrary URLs before they are validated and saved. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="size-full object-cover" />
                </div>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <input aria-label="URL de l'image" className={inputCls} value={img.url} onChange={(e) => set("images", v.images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <input aria-label="Texte alternatif" placeholder="Texte alternatif" className={inputCls} value={img.alt} onChange={(e) => set("images", v.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={img.kind === "placeholder"} onChange={(e) => set("images", v.images.map((x, j) => (j === i ? { ...x, kind: e.target.checked ? "placeholder" : "photo" } : x)))} />
                    Visuel provisoire (affiche une mention sur la fiche)
                  </label>
                  {err(`images.${i}.url`)}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" className="rounded border border-line px-2 text-xs disabled:opacity-30" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
                  <button type="button" className="rounded border border-line px-2 text-xs disabled:opacity-30" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1} aria-label="Descendre">↓</button>
                  <button type="button" className="rounded border border-line px-2 text-xs text-danger" onClick={() => set("images", v.images.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" id="p-upload" onChange={(e) => upload(e.target.files)} />
            <label htmlFor="p-upload" className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-ink px-3 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper">
              {uploading ? "Envoi…" : "Téléverser des images"}
            </label>
            <Button size="sm" variant="ghost" onClick={() => set("images", [...v.images, { url: "https://", alt: "", kind: "photo" }])}>
              + Ajouter une URL
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">JPG, PNG, WebP ou AVIF, 5 Mo max. Format conseillé : portrait 4:5.</p>
        </Card>

        <Card title="Tailles & stock">
          <p className="mb-3 text-xs text-muted">Laisse le stock vide pour ne pas le suivre (disponibilité illimitée). À 0, la taille apparaît « épuisée ».</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="py-1 font-medium">Taille</th><th className="py-1 font-medium">Proposée</th><th className="py-1 font-medium">Stock</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {v.sizes.map((s, i) => (
                  <tr key={s.label}>
                    <th scope="row" className="py-2 text-left font-semibold">{s.label}</th>
                    <td className="py-2">
                      <input type="checkbox" aria-label={`Proposer la taille ${s.label}`} checked={s.enabled} onChange={(e) => set("sizes", v.sizes.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))} />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Stock ${s.label}`}
                        placeholder="Non suivi"
                        className={`${inputCls} w-32`}
                        value={s.stock ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Math.max(0, Math.trunc(Number(e.target.value)));
                          set("sizes", v.sizes.map((x, j) => (j === i ? { ...x, stock: val } : x)));
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Référencement (SEO)">
          <div className="grid gap-4">
            <div>
              <label htmlFor="p-seo-title" className={labelCls}>Titre ({v.seo.title.length}/70)</label>
              <input id="p-seo-title" className={inputCls} maxLength={70} value={v.seo.title} onChange={(e) => set("seo", { ...v.seo, title: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-seo-desc" className={labelCls}>Description ({v.seo.description.length}/170)</label>
              <textarea id="p-seo-desc" rows={2} className={inputCls} maxLength={170} value={v.seo.description} onChange={(e) => set("seo", { ...v.seo, description: e.target.value })} />
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Publication">
          <label htmlFor="p-status" className={labelCls}>Statut</label>
          <select id="p-status" className={inputCls} value={v.status} onChange={(e) => set("status", e.target.value as ProductFormValue["status"])}>
            <option value="active">En ligne</option>
            <option value="draft">Brouillon (masqué)</option>
            <option value="archived">Archivé</option>
          </select>
          <label htmlFor="p-sort" className={`${labelCls} mt-4`}>Ordre d&apos;affichage</label>
          <input id="p-sort" type="number" className={inputCls} value={v.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
          <div className="mt-5 grid gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
            {v.id && (
              <Button variant="ghost" size="sm" className="border border-line text-danger" onClick={remove} disabled={busy}>
                {canDelete ? "Supprimer / archiver" : "Archiver"}
              </Button>
            )}
          </div>
        </Card>

        <Card title="Prix">
          <label htmlFor="p-price" className={labelCls}>Prix (€ TTC)</label>
          <input id="p-price" inputMode="decimal" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
          {err("priceCents")}
          <label htmlFor="p-compare" className={`${labelCls} mt-4`}>Prix barré (€, facultatif)</label>
          <input id="p-compare" inputMode="decimal" className={inputCls} value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="Uniquement un ancien prix réel" />
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={v.bundleEligible} onChange={(e) => set("bundleEligible", e.target.checked)} />
            <span>Éligible au pack (prix du pack dans Réglages)</span>
          </label>
        </Card>

        <Card title="Coloris">
          <label htmlFor="p-color-name" className={labelCls}>Nom de la couleur</label>
          <input id="p-color-name" className={inputCls} value={v.color.name} onChange={(e) => set("color", { ...v.color, name: e.target.value })} />
          <label htmlFor="p-color-hex" className={`${labelCls} mt-4`}>Pastille</label>
          <div className="flex gap-2">
            <input type="color" aria-label="Choisir la couleur" value={/^#[0-9a-f]{6}$/i.test(v.color.hex) ? v.color.hex : "#000000"} onChange={(e) => set("color", { ...v.color, hex: e.target.value })} className="h-10 w-12 rounded border border-line-strong" />
            <input id="p-color-hex" className={inputCls} value={v.color.hex} onChange={(e) => set("color", { ...v.color, hex: e.target.value })} />
          </div>
          {err("color.hex")}
          <label htmlFor="p-group" className={`${labelCls} mt-4`}>Modèle (groupe de coloris)</label>
          <input id="p-group" className={inputCls} value={v.group} onChange={(e) => set("group", e.target.value)} placeholder="ex. veste-bresil" />
          <p className="mt-1 text-xs text-muted">Les produits d&apos;un même groupe s&apos;affichent comme coloris d&apos;un même modèle.</p>
        </Card>
      </div>
    </form>
  );
}
