"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { toInput, useStore } from "./StoreProvider";
import { CartSummary } from "./CartSummary";
import { checkoutCustomerSchema, COUNTRIES, type CheckoutCustomer } from "@/lib/validation";
import { formatEUR } from "@/lib/money";
import type { CartQuote } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon, InfoIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";
import { eligibleOffer } from "@/lib/payments/everflow";
import type { z } from "zod";
import { ResumeCheckout } from "./ResumeCheckout";

const KEY_STORAGE = "rd.checkout.key";
const volatileKeys = new Map<string, string>();

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** One idempotency key per cart content: retries reuse it, a changed cart gets a new one. */
function idempotencyKeyFor(signature: string) {
  const memoryKey = volatileKeys.get(signature);
  if (memoryKey) return memoryKey;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY_STORAGE) ?? "null");
    if (saved?.sig === signature && typeof saved.key === "string") { volatileKeys.set(signature, saved.key); return saved.key as string; }
  } catch {}
  const key = newKey();
  volatileKeys.set(signature, key);
  try { sessionStorage.setItem(KEY_STORAGE, JSON.stringify({ sig: signature, key })); } catch {}
  return key;
}

function Field({
  id,
  label,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[15px] font-medium">
        {label}
        {optional && <span className="text-[13px] font-normal text-muted">Facultatif</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const { lines, quote: localQuote, hydrated, config, clear, productMap } = useStore();
  const [serverResult, setServerResult] = useState<{ sig: string; quote: CartQuote | null } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [resumeToken, setResumeToken] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const sending = useRef(false);
  const hosted = !!config.checkout && config.checkout.mode !== "request";
  const mock = config.checkout?.mode === "mock";
  useEffect(() => {
    queueMicrotask(() => { try { const saved = JSON.parse(sessionStorage.getItem("rd.checkout.pending") ?? "null"); if (saved?.token && /^[A-Za-z0-9_-]{24}$/.test(saved.token)) setResumeToken(saved.token); } catch {} });
  }, []);

  const inputs = useMemo(() => lines.map(toInput), [lines]);
  const signature = useMemo(() => JSON.stringify(inputs), [inputs]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutCustomer, unknown, z.output<typeof checkoutCustomerSchema>>({
    resolver: zodResolver(checkoutCustomerSchema),
    mode: "onTouched",
    defaultValues: { country: "FR", address2: "", notes: "" },
  });

  // Ask the server for authoritative prices whenever the cart changes.
  useEffect(() => {
    if (!hydrated || inputs.length === 0) return;
    const ctrl = new AbortController();
    const sig = JSON.stringify(inputs);
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: inputs }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data) => setServerResult({ sig, quote: data?.ok ? data.quote : null }))
      .catch((err) => {
        if (err.name !== "AbortError") setServerResult({ sig, quote: null });
      });
    return () => ctrl.abort();
  }, [hydrated, inputs]);

  const fresh = serverResult?.sig === signature ? serverResult : null;
  const serverQuote = fresh?.quote ?? null;
  const quoteState: "idle" | "loading" | "error" = !fresh ? "loading" : fresh.quote ? "idle" : "error";

  const quote = serverQuote ?? localQuote;
  const cartInvalid = (serverQuote?.errors.length ?? 0) > 0 || localQuote.errors.length > 0;
  let offerError = "";
  if (hosted && !cartInvalid) {
    try { eligibleOffer(quote); } catch (error) { offerError = (error as Error).message; }
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => handleSubmit(async (customer) => {
    if (sending.current || navigating) return;
    sending.current = true;
    try {
    setSubmitError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: idempotencyKeyFor(signature), lines: inputs, customer, marketingConsent, website: "" }),
    }).catch(() => null);

    if (!res) {
      setSubmitError("Connexion impossible. Vérifie ton réseau puis réessaie : ta demande ne sera pas dupliquée.");
      return;
    }
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      if (data.checkout) {
        try { sessionStorage.setItem("rd.checkout.pending", JSON.stringify({ token: data.order.token })); } catch {}
        setResumeToken(data.order.token);
        const destination = new URL(data.checkout.redirectUrl, window.location.origin);
        const valid = data.checkout.mode === "mock"
          ? destination.origin === window.location.origin && /^\/commande\/paiement-test\/[A-Za-z0-9_-]{24}$/.test(destination.pathname)
          : destination.protocol === "https:" && destination.host === "www.molipy8trk.com" && ["/2J23GL9/TTF23GH/", "/2J23GL9/TRSKRX3/"].includes(destination.pathname);
        if (!valid) { setSubmitError("Destination de paiement refusée. Ta commande reste en attente."); return; }
        setNavigating(true);
        window.location.assign(destination.href);
        return;
      }
      try {
        sessionStorage.removeItem(KEY_STORAGE);
      } catch {}
      volatileKeys.delete(signature);
      clear();
      router.replace(`/commande/confirmation/${data.order.token}`);
      return;
    }
    setSubmitError(data?.error ?? "La réponse n’a pas pu être confirmée. Réessaie avec la même demande.");
    } catch { setNavigating(false); setSubmitError("Redirection interrompue. Retrouve ta commande en attente pour réessayer sans la dupliquer."); }
    finally { sending.current = false; }
  })(event);

  if (!hydrated) {
    return (
      <div className="container-x py-16" aria-busy="true">
        <div className="h-12 w-64 animate-pulse rounded bg-paper-2" />
        <div className="mt-8 h-96 animate-pulse rounded-[var(--radius-md)] bg-paper-2" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="display text-[30px] uppercase sm:text-[40px]">Commande</h1>
        <p className="mt-4 text-muted">Ton panier est vide.</p>
        <ButtonLink href="/#collection" className="mt-6">Voir la collection</ButtonLink>
      </div>
    );
  }

  const fieldProps = (name: keyof CheckoutCustomer) => ({
    id: `co-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `co-${name}-error` : undefined,
    ...register(name),
  });

  return (
    <div className="container-x py-6 md:py-12">
      <nav aria-label="Étapes" className="eyebrow flex flex-wrap items-center gap-2 text-muted">
        <Link href="/panier" className="hover:text-ink">Panier</Link>
        <span aria-hidden>→</span>
        <span className="text-ink" aria-current="step">Coordonnées</span>
        <span aria-hidden>→</span>
        <span>{hosted ? "Paiement externe" : "Confirmation"}</span>
      </nav>
      <h1 className="display t-title mt-3 uppercase">Finaliser ma commande</h1>

      <div className="mt-5 flex gap-3 rounded-[var(--radius-md)] border border-[#4a3f2a] bg-[#17140f] p-4 text-[15px] leading-relaxed text-ink-2">
        <InfoIcon className="mt-0.5 shrink-0 text-brand" />
        <p>
          {hosted ? <><strong className="font-semibold text-ink">{mock ? "Simulation locale · aucun paiement réel." : "Un dernier pas vers le paiement."}</strong> {mock ? "Le partenaire est simulé sur ce site. Aucune coordonnée n’est envoyée à Everflow." : "Vous serez redirigé vers notre partenaire de paiement pour finaliser votre commande. Aucune donnée bancaire n’est collectée par Rio District."}</> : <><strong className="font-semibold text-ink">Rien à payer aujourd&apos;hui.</strong> Tu envoies une demande de commande : nous la confirmons par e-mail et t&apos;indiquons comment régler. Aucune donnée bancaire n&apos;est demandée.</>}
        </p>
      </div>

      {hosted && config.checkout?.error && <p role="alert" className="mt-4 rounded-xl border border-danger p-4 text-danger">{config.checkout.error}</p>}
      {hosted && resumeToken && <div className="mt-4 rounded-xl border border-line p-4"><p className="mb-3 text-sm text-ink-2">Une commande est déjà en attente. Vérifie son statut avant de lancer un autre paiement.</p><ResumeCheckout token={resumeToken} /><Link className="mt-3 block text-sm underline" href={`/commande/confirmation/${resumeToken}`}>Retrouver cette commande</Link></div>}
      {!config.acceptingOrders ? (
        <p className="mt-8 rounded-[var(--radius-md)] border border-line p-6 text-muted">{config.closedMessage}</p>
      ) : (
        <>
        {/* Mobile: the order and its total stay visible before the form. */}
        <details className="faq group mt-6 rounded-[var(--radius-md)] border border-line bg-paper-2 lg:hidden">
          <summary className="flex min-h-14 list-none items-center justify-between gap-3 px-4">
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              Ta commande · {quote.itemsCount} article{quote.itemsCount > 1 ? "s" : ""}
              <span className="faq-icon text-lg leading-none text-muted transition-transform" aria-hidden>+</span>
            </span>
            <span className="price text-lg">{formatEUR(quote.totalCents)}</span>
          </summary>
          <ul className="divide-y divide-line border-t border-line px-4 text-[15px]">
            {quote.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-3">
                <span>
                  <span className="font-semibold">{l.label}</span>
                  {l.quantity > 1 && <span className="text-muted"> × {l.quantity}</span>}
                  <span className="block text-sm text-muted">{l.items.map((it) => `${it.name} · ${it.size}`).join(" + ")}</span>
                </span>
                <span className="price">{formatEUR(l.totalCents)}</span>
              </li>
            ))}
          </ul>
          {quote.discountCents > 0 && (
            <p className="border-t border-line px-4 py-2.5 text-sm text-[#8fd9ad]">Remise pack incluse : −{formatEUR(quote.discountCents)}</p>
          )}
          <Link href="/panier" className="flex min-h-11 items-center border-t border-line px-4 text-sm underline underline-offset-4">
            Modifier le panier
          </Link>
        </details>
        <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-7">
            <fieldset>
              <legend className="eyebrow mb-5 text-muted">01 · Tes coordonnées</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="co-firstName" label="Prénom" error={errors.firstName?.message}>
                  <input className="field" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" {...fieldProps("firstName")} />
                </Field>
                <Field id="co-lastName" label="Nom" error={errors.lastName?.message}>
                  <input className="field" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" {...fieldProps("lastName")} />
                </Field>
                <Field id="co-email" label="E-mail" error={errors.email?.message}>
                  <input className="field" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" {...fieldProps("email")} />
                </Field>
                <Field id="co-phone" label="Téléphone" error={errors.phone?.message}>
                  <input className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" enterKeyHint="next" {...fieldProps("phone")} />
                </Field>
              </div>
            </fieldset>

            <fieldset>
              <legend className="eyebrow mb-5 text-muted">02 · Livraison</legend>
              <div className="grid gap-4 sm:grid-cols-6">
                <Field id="co-address" label="Adresse" error={errors.address?.message} className="sm:col-span-6">
                  <input className="field" autoComplete="address-line1" placeholder="Numéro et rue" {...fieldProps("address")} />
                </Field>
                <Field id="co-address2" label="Complément d'adresse" optional error={errors.address2?.message} className="sm:col-span-6">
                  <input className="field" autoComplete="address-line2" placeholder="Bâtiment, étage, digicode…" {...fieldProps("address2")} />
                </Field>
                <Field id="co-postalCode" label="Code postal" error={errors.postalCode?.message} className="sm:col-span-2">
                  <input className="field" autoComplete="postal-code" inputMode="numeric" enterKeyHint="next" {...fieldProps("postalCode")} />
                </Field>
                <Field id="co-city" label="Ville" error={errors.city?.message} className="sm:col-span-4">
                  <input className="field" autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" {...fieldProps("city")} />
                </Field>
                <Field id="co-country" label="Pays" error={errors.country?.message} className="sm:col-span-6">
                  <select className="field" autoComplete="country" {...fieldProps("country")}>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="co-notes" label="Notes de commande" optional error={errors.notes?.message} className="sm:col-span-6">
                  <textarea className="field resize-y" rows={3} placeholder="Une précision pour la livraison ?" {...fieldProps("notes")} />
                </Field>
              </div>
            </fieldset>
            <p className="text-sm leading-relaxed text-muted">
              {hosted ? (mock ? "Utilise uniquement des coordonnées fictives pour cette simulation locale." : "En continuant, tes nom, coordonnées et adresse seront transmis au partenaire via un lien externe sur www.molipy8trk.com. Ces informations peuvent être conservées dans l’historique du navigateur et les journaux du partenaire. Consulte notre politique de confidentialité avant de continuer.") : "Tes informations servent uniquement à traiter ta commande et à te contacter à son sujet. Aucune donnée bancaire n’est demandée."}
            </p>
            {hosted && config.checkout?.advertising && <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} /> J’accepte le suivi publicitaire facultatif du partenaire pour ce paiement. Mon choix n’empêche pas de commander.</label>}
          </div>

          <aside className="lg:col-span-5" aria-label="Ta commande">
            <div className="rounded-[var(--radius-md)] border border-line bg-paper-2 p-5 md:p-6 lg:sticky lg:top-24">
              <h2 className="eyebrow mb-4 text-muted">03 · Ta commande</h2>
              <ul className="divide-y divide-line border-y border-line" aria-busy={quoteState === "loading"}>
                {quote.lines.map((l, i) => (
                  <li key={i} className="flex gap-3 py-3">
                    <div className="flex shrink-0 -space-x-4">
                      {l.items.map((it, j) => (
                        <div key={j} className="relative h-14 w-11 overflow-hidden rounded-[var(--radius-xs)] bg-studio ring-2 ring-paper-2">
                          {(productMap.get(it.productId)?.images[0]?.url ?? it.image) && (
                            <Image src={productMap.get(it.productId)?.images[0]?.url ?? it.image} alt="" fill sizes="44px" className="object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1 text-[15px]">
                      <p className="font-semibold">
                        {l.label} {l.quantity > 1 && <span className="text-muted">× {l.quantity}</span>}
                      </p>
                      <p className="text-sm text-muted">{l.items.map((it) => `${it.name} · ${it.size}`).join(" + ")}</p>
                    </div>
                    <p className="price text-base">{formatEUR(l.totalCents)}</p>
                  </li>
                ))}
              </ul>
              <div className={clsx("mt-4 transition-opacity", quoteState === "loading" && "opacity-60")}>
                <CartSummary quote={quote} />
              </div>
              {quoteState === "error" && (
                <p className="mt-2 text-sm text-warning">Vérification des prix impossible pour l&apos;instant : le total définitif sera calculé à l&apos;envoi.</p>
              )}
              {cartInvalid && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {(serverQuote?.errors[0] ?? localQuote.errors[0])?.message}{" "}
                  <Link href="/panier" className="underline">Modifier le panier</Link>
                </p>
              )}
              {submitError && (
                <p role="alert" className="mt-3 rounded-[var(--radius-sm)] bg-danger/10 p-3 text-sm text-danger">
                  {submitError}
                </p>
              )}
              {offerError && <p role="alert" className="mt-3 text-sm text-danger">{offerError} <Link href="/panier" className="underline">Modifier le panier</Link></p>}
              <Button type="submit" size="lg" className="mt-5 h-14 w-full" disabled={isSubmitting || navigating || cartInvalid || Boolean(offerError) || config.checkout?.available === false}>
                {isSubmitting || navigating ? (hosted ? "Préparation du paiement…" : "Envoi de ta demande…") : hosted ? "Continuer vers le paiement ↗" : `Envoyer ma demande · ${formatEUR(quote.totalCents)}`}
              </Button>
              <p className="mt-3 text-center text-sm text-muted">{hosted ? (mock ? "Mode test · aucun débit possible" : "Paiement sur le site de notre partenaire externe") : "Aucun paiement ne sera prélevé maintenant."}</p>
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Après l&apos;envoi</p>
                <ol className="mt-3 grid gap-2.5 text-[15px] text-ink-2">
                  <li className="flex gap-2.5"><CheckIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand" /> {hosted ? "Ta sélection est enregistrée. Le paiement reste en attente jusqu’à vérification par la boutique." : "Tu reçois un e-mail qui confirme ta commande et t’indique comment régler."}</li>
                  <li className="flex gap-2.5"><TruckIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand" /> Expédition suivie, livraison estimée {config.deliveryEstimate}.</li>
                  <li className="flex gap-2.5"><ReturnIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand" /> Retour possible sous {config.returnsWindowDays} jours après réception.</li>
                </ol>
              </div>
            </div>
          </aside>
        </form>
        </>
      )}
    </div>
  );
}
