"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { toInput, useStore } from "./StoreProvider";
import { CartSummary } from "./CartSummary";
import { checkoutCustomerSchema, COUNTRIES, type CheckoutCustomer } from "@/lib/validation";
import { formatEUR } from "@/lib/money";
import type { CartLineInput, CartQuote } from "@/lib/types";
import { priceCart } from "@/lib/pricing";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PlusIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";
import { eligibleOffer } from "@/lib/payments/everflow";
import type { z } from "zod";
import { ResumeCheckout } from "./ResumeCheckout";
import "./checkout.css";
import { PhoneInput } from "./PhoneInput";
import { DEFAULT_PHONE_COUNTRY, supportedPhoneCountry } from "@/lib/phone";

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
    <div className={clsx("checkout-field", className)}>
      <label htmlFor={id} className="checkout-field-label">
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

export function CheckoutView({ directLine = null }: { directLine?: CartLineInput | null }) {
  const { lines, quote: cartQuote, hydrated, config, productMap } = useStore();
  const [serverResult, setServerResult] = useState<{ sig: string; quote: CartQuote | null } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [resumeToken, setResumeToken] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const sending = useRef(false);
  const manuallySelectedPhoneCountry = useRef(false);
  const phoneEdited = useRef(false);
  const hosted = !!config.checkout && config.checkout.mode !== "request";
  const paymentAvailable = hosted && config.checkout?.available === true;
  const mock = config.checkout?.mode === "mock";
  useEffect(() => {
    queueMicrotask(() => { try { const saved = JSON.parse(sessionStorage.getItem("rd.checkout.pending") ?? "null"); if (saved?.token && /^[A-Za-z0-9_-]{24}$/.test(saved.token)) setResumeToken(saved.token); } catch {} });
  }, []);

  const inputs = useMemo(() => directLine ? [directLine] : lines.map(toInput), [directLine, lines]);
  const localQuote = useMemo(() => directLine ? priceCart(inputs, productMap, config.bundle, config.shippingCents) : cartQuote,
    [directLine, inputs, productMap, config.bundle, config.shippingCents, cartQuote]);
  const signature = useMemo(() => JSON.stringify(inputs), [inputs]);

  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutCustomer, unknown, z.output<typeof checkoutCustomerSchema>>({
    resolver: zodResolver(checkoutCustomerSchema),
    mode: "onTouched",
    defaultValues: { country: "FR", phoneCountry: DEFAULT_PHONE_COUNTRY, address2: "", notes: "" },
  });
  const selectedPhoneCountry = useWatch({ control, name: "phoneCountry" });
  const phoneCountry = supportedPhoneCountry(selectedPhoneCountry) ? selectedPhoneCountry : DEFAULT_PHONE_COUNTRY;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/geo/country", { signal: controller.signal, credentials: "same-origin" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (supportedPhoneCountry(data?.country) && !manuallySelectedPhoneCountry.current && !phoneEdited.current && !getValues("phone")) {
          setValue("phoneCountry", data.country);
        }
      }).catch(() => {});
    return () => controller.abort();
  }, [getValues, setValue]);

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
  if (!cartInvalid) {
    try { eligibleOffer(quote); } catch (error) { offerError = (error as Error).message; }
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => handleSubmit(async (customer) => {
    if (sending.current || navigating) return;
    if (!paymentAvailable) {
      setSubmitError("Le paiement est momentanément indisponible. Réessaie plus tard.");
      return;
    }
    sending.current = true;
    try {
    setSubmitError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: idempotencyKeyFor(directLine ? `direct:${signature}` : signature), lines: inputs, customer, marketingConsent, requireCheckout: true, website: "" }),
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
      setSubmitError("Le paiement est momentanément indisponible. Réessaie avec la même commande.");
      return;
    }
    setSubmitError(data?.error ?? "La réponse n’a pas pu être confirmée. Réessaie avec la même demande.");
    } catch { setNavigating(false); setSubmitError("Redirection interrompue. Retrouve ta commande en attente pour réessayer sans la dupliquer."); }
    finally { sending.current = false; }
  }, (invalid) => {
    if (invalid.address2 || invalid.notes) setOptionalOpen(true);
  })(event);

  if (!hydrated) {
    return (
      <div className="container-x py-16" aria-busy="true">
        <div className="h-12 w-64 animate-pulse rounded bg-paper-2" />
        <div className="mt-8 h-96 animate-pulse rounded-[var(--radius-md)] bg-paper-2" />
      </div>
    );
  }

  if (inputs.length === 0) {
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
  const showOptional = optionalOpen || Boolean(errors.address2 || errors.notes);
  const firstItem = quote.lines[0]?.items[0];
  const selectionParams = new URLSearchParams();
  if (directLine?.kind === "bundle") selectionParams.set("offre", "pack");
  if (firstItem) selectionParams.set("taille", firstItem.size);
  const selectionHref = directLine
    ? firstItem ? `/produit/${firstItem.slug}?${selectionParams}` : "/#collection"
    : "/panier";
  const selectionLabel = directLine ? "Modifier la sélection" : "Modifier le panier";

  return (
    <div className="container-x checkout-page">
      <nav aria-label="Étapes" className="checkout-steps flex flex-wrap items-center gap-2 text-muted">
        <Link href={selectionHref} className="hover:text-ink">{directLine ? "Sélection" : "Panier"}</Link>
        <span aria-hidden>→</span>
        <span className="text-ink" aria-current="step">Coordonnées</span>
        <span aria-hidden>→</span>
        <span>Paiement</span>
      </nav>
      <h1 className="display checkout-title">Finaliser ma commande</h1>

      {hosted && config.checkout?.error && <p role="alert" className="mt-4 rounded-xl border border-danger p-4 text-danger">{config.checkout.error}</p>}
      {hosted && resumeToken && <div className="mt-4 rounded-xl border border-line p-4"><p className="mb-3 text-sm text-ink-2">Une commande est déjà en attente. Vérifie son statut avant de lancer un autre paiement.</p><ResumeCheckout token={resumeToken} /><Link className="mt-3 block text-sm underline" href={`/commande/confirmation/${resumeToken}`}>Retrouver cette commande</Link></div>}
      {!config.acceptingOrders ? (
        <p className="mt-8 rounded-[var(--radius-md)] border border-line p-6 text-muted">{config.closedMessage}</p>
      ) : (
        <>
        {/* Mobile: the order and its total stay visible before the form. */}
        <details className="checkout-mobile-summary faq group rounded-[var(--radius-md)] border border-line bg-paper-2 lg:hidden">
          <summary className="flex min-h-12 list-none items-center justify-between gap-3 px-4">
            <span className="flex items-center gap-2 text-sm font-semibold">
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
          <div className="border-t border-line px-4 py-3"><CartSummary quote={quote} /></div>
          <Link href={selectionHref} className="flex min-h-11 items-center border-t border-line px-4 text-sm underline underline-offset-4">
            {selectionLabel}
          </Link>
        </details>
        <form onSubmit={onSubmit} noValidate className="checkout-form grid lg:grid-cols-12">
          <div className="checkout-fields lg:col-span-7">
            <fieldset>
              <legend className="checkout-section-title">01 · Tes coordonnées</legend>
              <div className="checkout-contact-grid">
                <Field id="co-firstName" label="Prénom" error={errors.firstName?.message}>
                  <input className="field" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" {...fieldProps("firstName")} />
                </Field>
                <Field id="co-lastName" label="Nom" error={errors.lastName?.message}>
                  <input className="field" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" {...fieldProps("lastName")} />
                </Field>
                <Field id="co-email" label="E-mail" error={errors.email?.message} className="checkout-contact-wide">
                  <input className="field" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" {...fieldProps("email")} />
                </Field>
                <Field id="co-phone" label="Téléphone" error={errors.phone?.message} className="checkout-contact-wide checkout-phone-field">
                  <Controller name="phone" control={control} render={({ field }) => <PhoneInput
                    country={phoneCountry} value={field.value ?? ""} onChange={value => { phoneEdited.current = true; field.onChange(value); }} onBlur={field.onBlur} inputRef={field.ref}
                    invalid={Boolean(errors.phone)} onCountryChange={country => {
                      manuallySelectedPhoneCountry.current = true;
                      setValue("phoneCountry", country, { shouldValidate: true });
                    }} /> } />
                </Field>
              </div>
            </fieldset>

            <fieldset>
              <legend className="checkout-section-title">02 · Livraison</legend>
              <div className="checkout-delivery-grid">
                <Field id="co-address" label="Adresse" error={errors.address?.message} className="col-span-6">
                  <input className="field" autoComplete="address-line1" placeholder="Numéro et rue" {...fieldProps("address")} />
                </Field>
                <Field id="co-postalCode" label="Code postal" error={errors.postalCode?.message} className="col-span-2">
                  <input className="field" autoComplete="postal-code" inputMode="numeric" enterKeyHint="next" {...fieldProps("postalCode")} />
                </Field>
                <Field id="co-city" label="Ville" error={errors.city?.message} className="checkout-city">
                  <input className="field" autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" {...fieldProps("city")} />
                </Field>
                <Field id="co-country" label="Pays" error={errors.country?.message} className="checkout-country">
                  <select className="field" autoComplete="country" {...fieldProps("country")}>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="col-span-6">
                  <button type="button" className="checkout-optional-toggle" aria-expanded={showOptional} aria-controls="checkout-optional-fields" onClick={() => setOptionalOpen(!showOptional)}>
                    <span>Complément d’adresse ou note <span className="text-muted">· facultatif</span></span>
                    <PlusIcon width={16} height={16} className={clsx("shrink-0 transition-transform", showOptional && "rotate-45")} />
                  </button>
                  <div id="checkout-optional-fields" className="checkout-optional-fields" hidden={!showOptional}>
                    <Field id="co-address2" label="Complément d'adresse" optional error={errors.address2?.message}>
                      <input className="field" autoComplete="address-line2" placeholder="Bâtiment, étage, digicode…" {...fieldProps("address2")} />
                    </Field>
                    <Field id="co-notes" label="Notes de commande" optional error={errors.notes?.message}>
                      <textarea className="field resize-y" rows={2} placeholder="Une précision pour la livraison ?" {...fieldProps("notes")} />
                    </Field>
                  </div>
                </div>
              </div>
            </fieldset>
            <p className="checkout-privacy text-muted">
              {hosted ? (mock ? "Utilise uniquement des coordonnées fictives pour cette simulation locale." : "En continuant, tes nom, coordonnées et adresse seront transmis au partenaire via un lien externe sur www.molipy8trk.com. Ces informations peuvent être conservées dans l’historique du navigateur et les journaux du partenaire. Consulte notre politique de confidentialité avant de continuer.") : "Tes informations servent uniquement à traiter ta commande et à te contacter à son sujet. Aucune donnée bancaire n’est demandée."}
            </p>
            {hosted && config.checkout?.advertising && <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} /> J’accepte que les identifiants publicitaires de la boutique soient transmis à notre partenaire de paiement pour le suivi publicitaire. Mon choix est facultatif et n’empêche pas de commander.</label>}
          </div>

          <aside className="lg:col-span-5" aria-label="Ta commande">
            <div className="checkout-payment-card rounded-[var(--radius-md)] border border-line bg-paper-2 lg:sticky lg:top-24">
              <div className="hidden lg:block">
              <h2 className="checkout-section-title">03 · Ta commande</h2>
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
              </div>
              <div className="flex items-baseline justify-between lg:hidden" aria-busy={quoteState === "loading"}>
                <span className="text-sm font-semibold">Total à régler <span className="font-normal text-muted">TTC</span></span>
                <span className="price text-[28px] leading-none">{formatEUR(quote.totalCents)}</span>
              </div>
              {quoteState === "error" && (
                <p className="mt-2 text-sm text-warning">Vérification des prix impossible pour l&apos;instant : le total définitif sera calculé à l&apos;envoi.</p>
              )}
              {cartInvalid && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {(serverQuote?.errors[0] ?? localQuote.errors[0])?.message}{" "}
                  <Link href={selectionHref} className="underline">{selectionLabel}</Link>
                </p>
              )}
              {submitError && (
                <p role="alert" className="mt-3 rounded-[var(--radius-sm)] bg-danger/10 p-3 text-sm text-danger">
                  {submitError}
                </p>
              )}
              {offerError && <p role="alert" className="mt-3 text-sm text-danger">{offerError} <Link href={selectionHref} className="underline">{selectionLabel}</Link></p>}
              <Button type="submit" size="md" className="mt-4 w-full" disabled={isSubmitting || navigating || cartInvalid || Boolean(offerError) || !paymentAvailable}>
                {isSubmitting || navigating ? "Préparation du paiement…" : "Continuer vers le paiement ↗"}
              </Button>
              <p className="mt-2 text-center text-[13px] text-muted">{!paymentAvailable ? "Le paiement est momentanément indisponible." : mock ? "Mode test · aucun débit possible" : "Paiement sur le site de notre partenaire externe"}</p>
              <div className="checkout-reassurance border-t border-line">
                <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-2">
                  <li className="flex items-center gap-2"><TruckIcon width={16} height={16} className="text-brand" /> {config.shippingCents === 0 ? "Livraison offerte" : "Livraison suivie"}</li>
                  <li className="flex items-center gap-2"><ReturnIcon width={16} height={16} className="text-brand" /> Retours {config.returnsWindowDays} jours</li>
                </ul>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">Livraison estimée {config.deliveryEstimate}. Expédition après vérification du paiement.</p>
              </div>
            </div>
          </aside>
        </form>
        </>
      )}
    </div>
  );
}
