"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StoreSettings } from "@/lib/defaults";
import { centsToInput, inputToCents } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Card, inputCls, labelCls } from "./ui";

type PaymentInfo = {
  status: string;
  mode: "request" | "mock" | "live";
  error?: string;
  domain: string;
  singleUrl: string;
  bundleUrl: string;
  approvedDomain: string;
  approvedSingleUrl: string;
  approvedBundleUrl: string;
};

const redirectFields = [
  ["sub10", "Prénom"], ["adv3", "Nom"], ["sub3", "Code postal"],
  ["sub4", "E-mail"], ["sub6", "Ville"], ["sub7", "Adresse et complément"],
  ["sub8", "Téléphone"], ["adv1", "Nom du produit ou du pack"],
  ["adv2", "URL de la photo produit"],
] as const;

export function SettingsForm({ initial, paymentInfo }: { initial: StoreSettings; paymentInfo: PaymentInfo }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [bundlePrice, setBundlePrice] = useState(centsToInput(initial.bundle.priceCents));
  const [shipPrice, setShipPrice] = useState(centsToInput(initial.shipping.priceCents));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; fields?: Record<string, string> } | null>(null);

  const up = <K extends keyof StoreSettings>(k: K, patch: Partial<StoreSettings[K]>) =>
    setS((p) => ({ ...p, [k]: { ...(p[k] as object), ...patch } }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const payload: StoreSettings = {
      ...s,
      bundle: { ...s.bundle, priceCents: inputToCents(bundlePrice) },
      shipping: { ...s.shipping, priceCents: inputToCents(shipPrice) },
    };
    if (Number.isNaN(payload.bundle.priceCents) || Number.isNaN(payload.shipping.priceCents)) {
      setMsg({ ok: false, text: "Prix invalide (ex. 24,95)." });
      setBusy(false);
      return;
    }
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setMsg({ ok: true, text: "Réglages enregistrés." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: data?.error ?? "Enregistrement impossible.", fields: data?.fields });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
      noValidate
    >
      {msg && (
        <div role={msg.ok ? "status" : "alert"} className={`rounded-[var(--radius-sm)] p-3 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-danger/10 text-danger"}`}>
          {msg.text}
          {msg.fields && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {Object.entries(msg.fields).map(([k, v]) => <li key={k}>{k} : {v}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Commandes & paiement">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 size-4" checked={s.orders.acceptingOrders} onChange={(e) => up("orders", { acceptingOrders: e.target.checked })} />
            <span>
              <span className="font-semibold">Accepter les demandes de commande</span>
              <span className="block text-xs text-muted">Décoché : le catalogue reste visible mais l&apos;envoi de commande est bloqué (côté site et serveur).</span>
            </span>
          </label>
          <label htmlFor="s-closed" className={`${labelCls} mt-4`}>Message quand les commandes sont fermées</label>
          <textarea id="s-closed" rows={2} className={inputCls} value={s.orders.closedMessage} onChange={(e) => up("orders", { closedMessage: e.target.value })} />
          <label htmlFor="s-paynotice" className={`${labelCls} mt-4`}>Mention paiement (panier, commande, confirmation)</label>
          <textarea id="s-paynotice" rows={4} className={inputCls} value={s.orders.paymentNotice} onChange={(e) => up("orders", { paymentNotice: e.target.value })} />
          <div className="mt-5 rounded-[var(--radius-sm)] border border-line p-4 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 size-4" checked={s.paymentRedirect.enabled} onChange={(e) => up("paymentRedirect", { enabled: e.target.checked })} />
              <span><span className="font-semibold">Autoriser la redirection vers le paiement</span>
                <span className="block text-xs text-muted">Enregistrer les réglages pour appliquer ce changement. Le serveur doit aussi disposer d’une configuration Everflow valide.</span>
              </span>
            </label>
            <p className="mt-3 text-xs">État enregistré : <strong>{paymentInfo.status}</strong>{paymentInfo.mode === "mock" ? " · simulation locale" : paymentInfo.mode === "live" ? " · mode réel" : ""}</p>
            {paymentInfo.error && <p className="mt-2 text-xs text-danger">{paymentInfo.error}</p>}
            <p className="mt-2 text-xs text-muted">La redirection ne confirme pas le paiement. Vérifie chaque transaction auprès du partenaire.</p>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <p><strong>Domaine autorisé par l’application :</strong> <span className="break-all">{paymentInfo.approvedDomain}</span></p>
            <p><strong>Domaine configuré :</strong> <span className="break-all">{paymentInfo.domain}</span></p>
            <p><strong>Veste seule (19,99 €) :</strong> <span className="break-all">{paymentInfo.singleUrl || "Non configurée"}</span></p>
            <p className="pl-3 text-muted">URL requise par l’application : {paymentInfo.approvedSingleUrl}</p>
            <p><strong>Pack de 2 (24,95 €) :</strong> <span className="break-all">{paymentInfo.bundleUrl || "Non configurée"}</span></p>
            <p className="pl-3 text-muted">URL requise par l’application : {paymentInfo.approvedBundleUrl}</p>
            <p className="text-muted">Ces destinations sont définies sur le serveur et ne peuvent pas être modifiées ici. En mode test, le navigateur est redirigé vers la page de simulation locale.</p>
            <p className="font-semibold">Champs ajoutés à l’URL de redirection</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {redirectFields.map(([parameter, field]) => <div key={parameter} className="contents"><dt className="font-mono">{parameter}</dt><dd>{field}</dd></div>)}
            </dl>
            <p className="text-muted">Selon la configuration et le consentement : source_id peut être ajouté ; un vrai identifiant de clic Meta est transmis dans sub1 et fbclid ; à défaut, un identifiant de clic Snapchat est transmis dans sub1 et ScCid. Aucun sub5 n’est envoyé. Les données personnelles figurent dans l’URL envoyée au partenaire.</p>
          </div>
        </Card>

        <Card title="Boutique">
          <label htmlFor="s-name" className={labelCls}>Nom de la boutique</label>
          <input id="s-name" className={inputCls} value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} />
          <label htmlFor="s-tagline" className={`${labelCls} mt-4`}>Signature (pied de page)</label>
          <input id="s-tagline" className={inputCls} value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} />
          <label htmlFor="s-email" className={`${labelCls} mt-4`}>E-mail de contact</label>
          <input id="s-email" type="email" className={inputCls} value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-ig" className={labelCls}>Instagram (URL)</label>
              <input id="s-ig" className={inputCls} value={s.social.instagram} onChange={(e) => up("social", { instagram: e.target.value })} />
            </div>
            <div>
              <label htmlFor="s-tt" className={labelCls}>TikTok (URL)</label>
              <input id="s-tt" className={inputCls} value={s.social.tiktok} onChange={(e) => up("social", { tiktok: e.target.value })} />
            </div>
          </div>
        </Card>

        <Card title="Pack & promotion">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={s.bundle.enabled} onChange={(e) => up("bundle", { enabled: e.target.checked })} />
            <span className="font-semibold">Offre pack active</span>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-bprice" className={labelCls}>Prix du pack de 2 (€)</label>
              <input id="s-bprice" inputMode="decimal" className={inputCls} value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} />
            </div>
            <div>
              <label htmlFor="s-blabel" className={labelCls}>Nom de l&apos;offre</label>
              <input id="s-blabel" className={inputCls} value={s.bundle.label} onChange={(e) => up("bundle", { label: e.target.value })} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">Le prix est recalculé côté serveur à chaque commande ; il ne dépasse jamais la somme des deux vestes.</p>
          <hr className="my-5 border-line" />
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={s.promotion.enabled} onChange={(e) => up("promotion", { enabled: e.target.checked })} />
            <span className="font-semibold">Afficher le bloc promotion sur l&apos;accueil</span>
          </label>
          <label htmlFor="s-phead" className={`${labelCls} mt-4`}>Titre</label>
          <input id="s-phead" className={inputCls} value={s.promotion.headline} onChange={(e) => up("promotion", { headline: e.target.value })} />
          <label htmlFor="s-ptext" className={`${labelCls} mt-4`}>Texte</label>
          <textarea id="s-ptext" rows={2} className={inputCls} value={s.promotion.text} onChange={(e) => up("promotion", { text: e.target.value })} />
          <p className="mt-3 text-xs text-muted">
            Une offre limitée dans le temps ? Configure son compte à rebours dans{" "}
            <a href="/admin/promotions" className="underline">Promotions</a>.
          </p>
        </Card>

        <Card title="Bandeau d'annonce">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={s.announcement.enabled} onChange={(e) => up("announcement", { enabled: e.target.checked })} />
            <span className="font-semibold">Afficher le bandeau</span>
          </label>
          <label htmlFor="s-ann" className={`${labelCls} mt-4`}>Texte (séparer les messages par « · »)</label>
          <input id="s-ann" className={inputCls} value={s.announcement.text} onChange={(e) => up("announcement", { text: e.target.value })} />
        </Card>

        <Card title="Livraison">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="s-ship" className={labelCls}>Frais (€)</label>
              <input id="s-ship" inputMode="decimal" className={inputCls} value={shipPrice} onChange={(e) => setShipPrice(e.target.value)} />
            </div>
            <div>
              <label htmlFor="s-min" className={labelCls}>Délai min (jours ouvrés)</label>
              <input id="s-min" type="number" min={0} className={inputCls} value={s.shipping.minDays} onChange={(e) => up("shipping", { minDays: Number(e.target.value) })} />
            </div>
            <div>
              <label htmlFor="s-max" className={labelCls}>Délai max</label>
              <input id="s-max" type="number" min={0} className={inputCls} value={s.shipping.maxDays} onChange={(e) => up("shipping", { maxDays: Number(e.target.value) })} />
            </div>
          </div>
          <label htmlFor="s-shipsum" className={`${labelCls} mt-4`}>Résumé</label>
          <input id="s-shipsum" className={inputCls} value={s.shipping.summary} onChange={(e) => up("shipping", { summary: e.target.value })} />
          <label htmlFor="s-shipdet" className={`${labelCls} mt-4`}>Conditions détaillées</label>
          <textarea id="s-shipdet" rows={4} className={inputCls} value={s.shipping.details} onChange={(e) => up("shipping", { details: e.target.value })} />
        </Card>

        <Card title="Retours">
          <label htmlFor="s-retsum" className={labelCls}>Résumé</label>
          <input id="s-retsum" className={inputCls} value={s.returns.summary} onChange={(e) => up("returns", { summary: e.target.value })} />
          <label htmlFor="s-retdet" className={`${labelCls} mt-4`}>Politique de retour</label>
          <textarea id="s-retdet" rows={5} className={inputCls} value={s.returns.details} onChange={(e) => up("returns", { details: e.target.value })} />
        </Card>
      </div>

      <Card title="FAQ">
        <ul className="space-y-4">
          {s.faq.map((f, i) => (
            <li key={i} className="grid gap-2 rounded-[var(--radius-sm)] border border-line p-3">
              <div className="flex gap-2">
                <input aria-label={`Question ${i + 1}`} className={inputCls} value={f.question} onChange={(e) => setS({ ...s, faq: s.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} />
                <button type="button" className="rounded border border-line px-2 text-xs disabled:opacity-30" disabled={i === 0} onClick={() => { const a = [...s.faq]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setS({ ...s, faq: a }); }} aria-label="Monter">↑</button>
                <button type="button" className="rounded border border-line px-2 text-xs text-danger" onClick={() => setS({ ...s, faq: s.faq.filter((_, j) => j !== i) })} aria-label="Supprimer">✕</button>
              </div>
              <textarea aria-label={`Réponse ${i + 1}`} rows={2} className={inputCls} value={f.answer} onChange={(e) => setS({ ...s, faq: s.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })} />
            </li>
          ))}
        </ul>
        <Button size="sm" variant="ghost" className="mt-3 border border-line" onClick={() => setS({ ...s, faq: [...s.faq, { question: "", answer: "" }] })}>
          + Ajouter une question
        </Button>
      </Card>

      <Card title="Guide des tailles (provisoire)">
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Score = poids (kg) + (taille (cm) − 170). La taille conseillée est la première dont le score est inférieur au seuil.
          Barème calibré sur le simulateur du site de référence ; à remplacer par les règles du fabricant.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-medium">Taille</th>
                <th className="py-1 font-medium">Seuil score</th>
                <th className="py-1 font-medium">Poitrine</th>
                <th className="py-1 font-medium">Tour de taille</th>
                <th className="py-1 font-medium">Dos</th>
                <th className="py-1 font-medium">Manche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.sizeRules.map((r, i) => {
                const row = s.sizeChart.find((c) => c.size === r.size);
                const setRow = (patch: Partial<NonNullable<typeof row>>) =>
                  setS({ ...s, sizeChart: s.sizeChart.map((c) => (c.size === r.size ? { ...c, ...patch } : c)) });
                return (
                  <tr key={r.size}>
                    <th scope="row" className="py-2 pr-2 text-left">{r.size}</th>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        aria-label={`Seuil ${r.size}`}
                        className={`${inputCls} w-24`}
                        placeholder="∞"
                        value={r.maxScore ?? ""}
                        onChange={(e) => setS({ ...s, sizeRules: s.sizeRules.map((x, j) => (j === i ? { ...x, maxScore: e.target.value === "" ? null : Number(e.target.value) } : x)) })}
                      />
                    </td>
                    {row ? (
                      <>
                        <td className="py-2 pr-2"><input aria-label={`Poitrine ${r.size}`} className={`${inputCls} w-28`} value={row.chest} onChange={(e) => setRow({ chest: e.target.value })} /></td>
                        <td className="py-2 pr-2"><input aria-label={`Tour de taille ${r.size}`} className={`${inputCls} w-28`} value={row.waist} onChange={(e) => setRow({ waist: e.target.value })} /></td>
                        <td className="py-2 pr-2"><input type="number" aria-label={`Dos ${r.size}`} className={`${inputCls} w-20`} value={row.back} onChange={(e) => setRow({ back: Number(e.target.value) })} /></td>
                        <td className="py-2"><input type="number" aria-label={`Manche ${r.size}`} className={`${inputCls} w-20`} value={row.sleeve} onChange={(e) => setRow({ sleeve: Number(e.target.value) })} /></td>
                      </>
                    ) : (
                      <td colSpan={4} />
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer les réglages"}</Button>
      </div>
    </form>
  );
}
