"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  isCountdownLive,
  isPopupLive,
  parisLocalToUtc,
  utcToParisLocal,
  type CountdownSettings,
  type PopupSettings,
} from "@/lib/marketing";
import { Button } from "@/components/ui/Button";
import { CountdownBand } from "@/components/store/Countdown";
import { CartReminderPanel, PromoPanel } from "@/components/store/PopupPanels";
import { popupEyebrow } from "@/components/store/MarketingPopups";
import { Card, inputCls, labelCls } from "./ui";

type State = { countdown: CountdownSettings; popups: PopupSettings };
type Img = { url: string; label: string };
type Dated = { enabled: boolean; startsAt: string | null; endsAt: string | null };

/** Status badge computed with the admin's clock (the storefront uses the server clock). */
function status(item: Dated, live: boolean, now: number): [string, string] {
  if (!item.enabled) return ["Désactivé", "bg-stone-200 text-stone-700"];
  if (item.endsAt && now >= Date.parse(item.endsAt)) return ["Terminé", "bg-red-100 text-red-900"];
  if (item.startsAt && now < Date.parse(item.startsAt)) return ["Programmé", "bg-sky-100 text-sky-900"];
  return live ? ["En ligne", "bg-emerald-100 text-emerald-900"] : ["Incomplet", "bg-amber-100 text-amber-900"];
}

function Badge({ value }: { value: [string, string] }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${value[1]}`}>{value[0]}</span>;
}

/** Storefront look for previews (dark theme + Syne/Manrope). */
function StorePreview({ fontClass, children, label }: { fontClass: string; children: ReactNode; label: string }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold text-muted">{label}</p>
      <div className={`store-dark ${fontClass} overflow-hidden rounded-[var(--radius-md)] bg-paper p-3 font-sans sm:p-5`}>{children}</div>
    </div>
  );
}

function DateField({ id, label, value, onChange, error }: { id: string; label: string; value: string | null; onChange: (v: string | null) => void; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input
        id={id}
        type="datetime-local"
        className={inputCls}
        value={utcToParisLocal(value)}
        onChange={(e) => onChange(e.target.value ? parisLocalToUtc(e.target.value) : null)}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-danger">{msg}</p> : null);

export function PromotionsForm({ initial, storeName, images, fontClass }: { initial: State; storeName: string; images: Img[]; fontClass: string }) {
  const router = useRouter();
  const [s, setS] = useState<State>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const cd = s.countdown;
  const setCd = (patch: Partial<CountdownSettings>) => setS((p) => ({ ...p, countdown: { ...p.countdown, ...patch } }));
  const setPopup = <K extends keyof PopupSettings>(k: K, patch: Partial<PopupSettings[K]>) =>
    setS((p) => ({ ...p, popups: { ...p.popups, [k]: { ...p.popups[k], ...patch } } }));
  const f = (path: string) => fields[path];

  const save = async () => {
    setBusy(true);
    setMsg(null);
    setFields({});
    const res = await fetch("/api/admin/promotions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setMsg({ ok: true, text: "Promotions enregistrées et publiées." });
      router.refresh();
    } else {
      setFields(data?.fields ?? {});
      setMsg({ ok: false, text: data?.fields ? "Certains champs sont à corriger (voir en rouge)." : data?.error ?? "Enregistrement impossible." });
    }
  };

  // The preview needs an end date: without one, show a clearly labelled sample deadline.
  const previewEnd = cd.endsAt ?? new Date(now + 3 * 86_400_000 + 5 * 3_600_000).toISOString();

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
        </div>
      )}

      {/* ---------- Countdown ---------- */}
      <Card title="Compte à rebours" actions={<Badge value={status(cd, isCountdownLive(cd, now), now)} />}>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={cd.enabled} onChange={(e) => setCd({ enabled: e.target.checked })} />
          <span>
            <span className="font-semibold">Activer le compte à rebours</span>
            <span className="block text-xs text-muted">
              Uniquement pour une offre qui se termine réellement à la date indiquée. À l&apos;échéance, le bloc disparaît tout seul. Le prix, lui, reste géré par le pack et les fiches produits.
            </span>
          </span>
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cd-title" className={labelCls}>Titre</label>
            <input id="cd-title" className={inputCls} maxLength={80} value={cd.title} onChange={(e) => setCd({ title: e.target.value })} />
            <Err msg={f("countdown.title")} />
          </div>
          <div>
            <label htmlFor="cd-text" className={labelCls}>Description (facultatif)</label>
            <input id="cd-text" className={inputCls} maxLength={240} value={cd.text} onChange={(e) => setCd({ text: e.target.value })} />
          </div>
          <DateField id="cd-start" label="Début (heure de Paris, facultatif)" value={cd.startsAt} onChange={(v) => setCd({ startsAt: v })} />
          <DateField id="cd-end" label="Fin réelle de l'offre (heure de Paris)" value={cd.endsAt} onChange={(v) => setCd({ endsAt: v })} error={f("countdown.endsAt")} />
          <div>
            <label htmlFor="cd-cta" className={labelCls}>Texte du bouton (facultatif)</label>
            <input id="cd-cta" className={inputCls} maxLength={40} value={cd.ctaLabel} onChange={(e) => setCd({ ctaLabel: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cd-href" className={labelCls}>Lien du bouton</label>
            <input id="cd-href" className={inputCls} placeholder="/produit/veste-bresil-noir?offre=pack" value={cd.ctaHref} onChange={(e) => setCd({ ctaHref: e.target.value })} />
            <Err msg={f("countdown.ctaHref")} />
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className={labelCls}>Emplacement</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" checked={cd.placement.home} onChange={(e) => setCd({ placement: { ...cd.placement, home: e.target.checked } })} />
              Accueil (bandeau sous l&apos;en-tête)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" checked={cd.placement.product} onChange={(e) => setCd({ placement: { ...cd.placement, product: e.target.checked } })} />
              Fiches produit (ligne au-dessus des offres)
            </label>
          </div>
          <Err msg={f("countdown.placement")} />
        </fieldset>
        <StorePreview fontClass={fontClass} label={cd.endsAt ? "Aperçu" : "Aperçu — date de fin fictive (aucune date réelle saisie)"}>
          <CountdownBand
            key={`${previewEnd}-${now}`}
            data={{ title: cd.title || "Titre de la campagne", text: cd.text, ctaLabel: cd.ctaLabel, ctaHref: "#", endsAt: previewEnd, serverNow: now }}
          />
        </StorePreview>
      </Card>

      {/* ---------- Welcome + exit intent ---------- */}
      {(["welcome", "exitIntent"] as const).map((k) => {
        const p = s.popups[k];
        const secondsKey = k === "welcome" ? "delaySeconds" : "minSecondsOnPage";
        const seconds = k === "welcome" ? s.popups.welcome.delaySeconds : s.popups.exitIntent.minSecondsOnPage;
        return (
          <Card
            key={k}
            title={k === "welcome" ? "Pop-up de bienvenue" : "Pop-up d'intention de sortie (ordinateur)"}
            actions={<Badge value={status(p, isPopupLive(p, now), now)} />}
          >
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 size-4" checked={p.enabled} onChange={(e) => setPopup(k, { enabled: e.target.checked })} />
              <span>
                <span className="font-semibold">Activer</span>
                <span className="block text-xs text-muted">
                  {k === "welcome"
                    ? "Affiché une seule fois par visite, après le délai choisi, jamais sur le panier ni la commande, ni si le visiteur a déjà un panier."
                    : "Sur ordinateur uniquement, quand la souris quitte la fenêtre par le haut. Jamais de fausse urgence : ne promets pas une remise qui n'existe pas."}
                </span>
              </span>
            </label>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor={`${k}-title`} className={labelCls}>Titre</label>
                <input id={`${k}-title`} className={inputCls} maxLength={80} value={p.title} onChange={(e) => setPopup(k, { title: e.target.value })} />
                <Err msg={f(`popups.${k}.title`)} />
              </div>
              <div>
                <label htmlFor={`${k}-img`} className={labelCls}>Image produit</label>
                <select id={`${k}-img`} className={inputCls} value={p.imageUrl} onChange={(e) => setPopup(k, { imageUrl: e.target.value })}>
                  <option value="">Sans image</option>
                  {images.map((img) => <option key={img.url} value={img.url}>{img.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`${k}-text`} className={labelCls}>Message</label>
                <textarea id={`${k}-text`} rows={2} className={inputCls} maxLength={280} value={p.text} onChange={(e) => setPopup(k, { text: e.target.value })} />
                <Err msg={f(`popups.${k}.text`)} />
              </div>
              <div>
                <label htmlFor={`${k}-cta`} className={labelCls}>Texte du bouton</label>
                <input id={`${k}-cta`} className={inputCls} maxLength={40} value={p.ctaLabel} onChange={(e) => setPopup(k, { ctaLabel: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`${k}-href`} className={labelCls}>Lien du bouton</label>
                <input id={`${k}-href`} className={inputCls} placeholder="/#collection" value={p.ctaHref} onChange={(e) => setPopup(k, { ctaHref: e.target.value })} />
                <Err msg={f(`popups.${k}.ctaHref`)} />
              </div>
              <div>
                <label htmlFor={`${k}-sec`} className={labelCls}>
                  {k === "welcome" ? "Délai avant affichage (secondes)" : "Temps minimum sur le site (secondes)"}
                </label>
                <input id={`${k}-sec`} type="number" min={5} className={inputCls} value={seconds} onChange={(e) => setPopup(k, { [secondsKey]: Number(e.target.value) })} />
                <Err msg={f(`popups.${k}.${secondsKey}`)} />
              </div>
              <div>
                <label htmlFor={`${k}-freq`} className={labelCls}>Ne pas réafficher pendant (jours)</label>
                <input id={`${k}-freq`} type="number" min={1} className={inputCls} value={p.frequencyDays} onChange={(e) => setPopup(k, { frequencyDays: Number(e.target.value) })} />
                <Err msg={f(`popups.${k}.frequencyDays`)} />
              </div>
              <DateField id={`${k}-start`} label="Début (heure de Paris, facultatif)" value={p.startsAt} onChange={(v) => setPopup(k, { startsAt: v })} />
              <DateField id={`${k}-end`} label="Fin (heure de Paris, facultatif)" value={p.endsAt} onChange={(v) => setPopup(k, { endsAt: v })} error={f(`popups.${k}.endsAt`)} />
            </div>
            <StorePreview fontClass={fontClass} label="Aperçu">
              <div className={p.imageUrl ? "max-w-[760px]" : "max-w-[480px]"}>
                <PromoPanel
                  eyebrow={popupEyebrow(k, storeName)}
                  title={p.title || "Titre"}
                  text={p.text || "Message"}
                  ctaLabel={p.ctaLabel}
                  ctaHref="#"
                  imageUrl={p.imageUrl}
                  titleId={`preview-${k}`}
                />
              </div>
            </StorePreview>
          </Card>
        );
      })}

      {/* ---------- Cart reminder ---------- */}
      <Card title="Rappel de panier" actions={<Badge value={status(s.popups.cartReminder, isPopupLive(s.popups.cartReminder, now), now)} />}>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={s.popups.cartReminder.enabled} onChange={(e) => setPopup("cartReminder", { enabled: e.target.checked })} />
          <span>
            <span className="font-semibold">Activer</span>
            <span className="block text-xs text-muted">
              Petite carte discrète (non bloquante) quand un visiteur revient sur le site avec des articles dans son panier. Affiche ses vrais articles et le vrai total. Jamais sur le panier ni la commande.
            </span>
          </span>
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cr-title" className={labelCls}>Titre</label>
            <input id="cr-title" className={inputCls} maxLength={80} value={s.popups.cartReminder.title} onChange={(e) => setPopup("cartReminder", { title: e.target.value })} />
            <Err msg={f("popups.cartReminder.title")} />
          </div>
          <div>
            <label htmlFor="cr-text" className={labelCls}>Message</label>
            <input id="cr-text" className={inputCls} maxLength={280} value={s.popups.cartReminder.text} onChange={(e) => setPopup("cartReminder", { text: e.target.value })} />
            <Err msg={f("popups.cartReminder.text")} />
          </div>
          <div>
            <label htmlFor="cr-sec" className={labelCls}>Délai avant affichage (secondes)</label>
            <input id="cr-sec" type="number" min={3} className={inputCls} value={s.popups.cartReminder.delaySeconds} onChange={(e) => setPopup("cartReminder", { delaySeconds: Number(e.target.value) })} />
            <Err msg={f("popups.cartReminder.delaySeconds")} />
          </div>
          <div>
            <label htmlFor="cr-freq" className={labelCls}>Ne pas réafficher pendant (jours)</label>
            <input id="cr-freq" type="number" min={1} className={inputCls} value={s.popups.cartReminder.frequencyDays} onChange={(e) => setPopup("cartReminder", { frequencyDays: Number(e.target.value) })} />
          </div>
          <DateField id="cr-start" label="Début (heure de Paris, facultatif)" value={s.popups.cartReminder.startsAt} onChange={(v) => setPopup("cartReminder", { startsAt: v })} />
          <DateField id="cr-end" label="Fin (heure de Paris, facultatif)" value={s.popups.cartReminder.endsAt} onChange={(v) => setPopup("cartReminder", { endsAt: v })} error={f("popups.cartReminder.endsAt")} />
        </div>
        <StorePreview fontClass={fontClass} label="Aperçu — articles d'exemple (le site affiche le vrai panier du visiteur)">
          <div className="max-w-[380px]">
            <CartReminderPanel
              title={s.popups.cartReminder.title || "Titre"}
              text={s.popups.cartReminder.text || "Message"}
              items={images.slice(0, 1).map((img) => ({ key: img.url, label: img.label, detail: "Taille M", image: img.url }))}
              count={1}
              totalLabel="—"
              titleId="preview-cart"
            />
          </div>
        </StorePreview>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer et publier"}</Button>
      </div>
    </form>
  );
}
