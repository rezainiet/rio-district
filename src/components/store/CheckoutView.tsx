"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { toInput, useStore } from "./StoreProvider";
import { CartSummary } from "./CartSummary";
import { checkoutCustomerSchema, COUNTRIES, type CheckoutCustomer } from "@/lib/validation";
import { formatEUR } from "@/lib/money";
import type { CartQuote } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InfoIcon } from "@/components/ui/icons";

const KEY_STORAGE = "kalt.checkout.key";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** One idempotency key per cart content: retries reuse it, a changed cart gets a new one. */
function idempotencyKeyFor(signature: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY_STORAGE) ?? "null");
    if (saved?.sig === signature && typeof saved.key === "string") return saved.key as string;
    const key = newKey();
    sessionStorage.setItem(KEY_STORAGE, JSON.stringify({ sig: signature, key }));
    return key;
  } catch {
    return newKey();
  }
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
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
        {label}
        {optional && <span className="text-xs font-normal text-muted">Facultatif</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">
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

  const inputs = useMemo(() => lines.map(toInput), [lines]);
  const signature = useMemo(() => JSON.stringify(inputs), [inputs]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutCustomer>({
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

  const onSubmit = handleSubmit(async (customer) => {
    setSubmitError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: idempotencyKeyFor(signature), lines: inputs, customer, website: "" }),
    }).catch(() => null);

    if (!res) {
      setSubmitError("Connexion impossible. Vérifie ton réseau puis réessaie : ta demande ne sera pas dupliquée.");
      return;
    }
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      try {
        sessionStorage.removeItem(KEY_STORAGE);
      } catch {}
      clear();
      router.replace(`/commande/confirmation/${data.order.token}`);
      return;
    }
    setSubmitError(data?.error ?? "Ta demande n'a pas pu être enregistrée. Réessaie.");
  });

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
        <h1 className="display text-6xl">Commande</h1>
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
    <div className="container-x py-10 md:py-16">
      <nav aria-label="Étapes" className="eyebrow flex items-center gap-2 text-muted">
        <Link href="/panier" className="hover:text-ink">Panier</Link>
        <span aria-hidden>→</span>
        <span className="text-ink" aria-current="step">Coordonnées</span>
        <span aria-hidden>→</span>
        <span>Confirmation</span>
      </nav>
      <h1 className="display mt-4 text-6xl md:text-8xl">Commande</h1>

      <div className="mt-6 flex gap-3 rounded-[var(--radius-md)] border border-brand/30 bg-brand/[0.06] p-4 text-sm leading-relaxed text-ink-2">
        <InfoIcon className="mt-0.5 shrink-0 text-brand" />
        <p>
          <strong className="font-semibold text-ink">Demande de commande, sans paiement en ligne.</strong> {config.paymentNotice}
        </p>
      </div>

      {!config.acceptingOrders ? (
        <p className="mt-8 rounded-[var(--radius-md)] border border-line p-6 text-muted">{config.closedMessage}</p>
      ) : (
        <>
        {/* Mobile: the order and its total stay visible before the form. */}
        <details className="faq group mt-6 rounded-[var(--radius-md)] border border-line bg-[#fbf9f4] lg:hidden">
          <summary className="flex min-h-14 list-none items-center justify-between gap-3 px-4">
            <span className="flex items-center gap-2 text-sm font-semibold">
              Ta commande · {quote.itemsCount} article{quote.itemsCount > 1 ? "s" : ""}
              <span className="faq-icon text-lg leading-none text-muted transition-transform" aria-hidden>+</span>
            </span>
            <span className="price text-lg">{formatEUR(quote.totalCents)}</span>
          </summary>
          <ul className="divide-y divide-line border-t border-line px-4 text-sm">
            {quote.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-3">
                <span>
                  <span className="font-semibold">{l.label}</span>
                  {l.quantity > 1 && <span className="text-muted"> × {l.quantity}</span>}
                  <span className="block text-xs text-muted">{l.items.map((it) => `${it.color} · ${it.size}`).join(" + ")}</span>
                </span>
                <span className="price">{formatEUR(l.totalCents)}</span>
              </li>
            ))}
          </ul>
          {quote.discountCents > 0 && (
            <p className="border-t border-line px-4 py-2.5 text-xs text-brand">Remise pack incluse : −{formatEUR(quote.discountCents)}</p>
          )}
          <Link href="/panier" className="block border-t border-line px-4 py-3 text-xs underline underline-offset-4">
            Modifier le panier
          </Link>
        </details>
        <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-7">
            <fieldset>
              <legend className="eyebrow mb-5 text-muted">01 · Tes coordonnées</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="co-fullName" label="Nom complet" error={errors.fullName?.message} className="sm:col-span-2">
                  <input className="field" autoComplete="name" {...fieldProps("fullName")} />
                </Field>
                <Field id="co-email" label="E-mail" error={errors.email?.message}>
                  <input className="field" type="email" inputMode="email" autoComplete="email" {...fieldProps("email")} />
                </Field>
                <Field id="co-phone" label="Téléphone" error={errors.phone?.message}>
                  <input className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex. 06 12 34 56 78" {...fieldProps("phone")} />
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
                  <input className="field" autoComplete="postal-code" inputMode="numeric" {...fieldProps("postalCode")} />
                </Field>
                <Field id="co-city" label="Ville" error={errors.city?.message} className="sm:col-span-4">
                  <input className="field" autoComplete="address-level2" {...fieldProps("city")} />
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
            <p className="text-xs leading-relaxed text-muted">
              Tes informations servent uniquement à traiter ta commande et à te contacter à son sujet. Aucune donnée bancaire
              n&apos;est demandée.
            </p>
          </div>

          <aside className="lg:col-span-5" aria-label="Ta commande">
            <div className="rounded-[var(--radius-md)] border border-line bg-[#fbf9f4] p-5 md:p-6 lg:sticky lg:top-24">
              <h2 className="eyebrow mb-4 text-muted">03 · Ta commande</h2>
              <ul className="divide-y divide-line border-y border-line" aria-busy={quoteState === "loading"}>
                {quote.lines.map((l, i) => (
                  <li key={i} className="flex gap-3 py-3">
                    <div className="flex shrink-0 -space-x-4">
                      {l.items.map((it, j) => (
                        <div key={j} className="relative h-14 w-11 overflow-hidden rounded-[var(--radius-xs)] bg-studio ring-2 ring-[#fbf9f4]">
                          {(productMap.get(it.productId)?.images[0]?.url ?? it.image) && (
                            <Image src={productMap.get(it.productId)?.images[0]?.url ?? it.image} alt="" fill sizes="44px" className="object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold">
                        {l.label} {l.quantity > 1 && <span className="text-muted">× {l.quantity}</span>}
                      </p>
                      <p className="text-xs text-muted">{l.items.map((it) => `${it.color} · ${it.size}`).join(" + ")}</p>
                    </div>
                    <p className="price text-sm">{formatEUR(l.totalCents)}</p>
                  </li>
                ))}
              </ul>
              <div className={clsx("mt-4 transition-opacity", quoteState === "loading" && "opacity-60")}>
                <CartSummary quote={quote} />
              </div>
              {quoteState === "error" && (
                <p className="mt-2 text-xs text-warning">Vérification des prix impossible pour l&apos;instant : le total définitif sera calculé à l&apos;envoi.</p>
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
              <Button type="submit" size="lg" className="mt-5 w-full" disabled={isSubmitting || cartInvalid}>
                {isSubmitting ? "Envoi de ta demande…" : `Envoyer ma demande · ${formatEUR(quote.totalCents)}`}
              </Button>
              <p className="mt-3 text-center text-xs text-muted">Aucun paiement ne sera prélevé maintenant.</p>
            </div>
          </aside>
        </form>
        </>
      )}
    </div>
  );
}
