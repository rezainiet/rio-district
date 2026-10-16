"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import type { Size } from "@/lib/sizes";
import type { PublicProduct } from "@/lib/types";

export type Offer = "single" | "bundle";
type Slot = { productId: string; size: Size | null };

/**
 * Purchase state shared by the product-page concepts. Same rules as
 * ProductPurchase (the live page): server-side pricing stays authoritative,
 * this only builds the cart line and the displayed totals.
 */
export function usePurchase({
  product,
  bundleOptions,
  initialOffer,
  initialSize,
  basePath,
}: {
  product: PublicProduct;
  bundleOptions: PublicProduct[];
  initialOffer: Offer;
  initialSize: Size | null;
  /** Where colour links point (the concept route keeps its own prefix). */
  basePath: string;
}) {
  const router = useRouter();
  const { add, config, setDrawerOpen } = useStore();
  const bundle = config.bundle;
  const bundleAvailable = bundle.enabled && product.bundleEligible && bundleOptions.length > 0;

  const [offer, setOfferState] = useState<Offer>(bundleAvailable ? initialOffer : "single");
  const [size, setSizeState] = useState<Size | null>(initialSize);
  const secondDefault = bundleOptions.find((p) => p.id !== product.id) ?? product;
  const [slots, setSlots] = useState<Slot[]>([
    { productId: product.id, size: initialSize },
    { productId: secondDefault.id, size: null },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guideFor, setGuideFor] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);

  const optionMap = useMemo(() => new Map(bundleOptions.map((p) => [p.id, p])), [bundleOptions]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (offer === "bundle") url.searchParams.set("offre", "pack");
    else url.searchParams.delete("offre");
    if (size) url.searchParams.set("taille", size);
    else url.searchParams.delete("taille");
    window.history.replaceState(window.history.state, "", url);
  }, [offer, size]);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting || e.boundingClientRect.top > 0), { threshold: 0 });
    io.observe(el);
    const footer = document.querySelector("footer");
    const fo = new IntersectionObserver(([e]) => setFooterVisible(e.isIntersecting));
    if (footer) fo.observe(footer);
    return () => {
      io.disconnect();
      fo.disconnect();
    };
  }, []);

  const slotProducts = slots.map((s) => optionMap.get(s.productId) ?? product);
  const bundleFull = slotProducts.reduce((sum, p) => sum + p.priceCents, 0);
  const bundlePrice = Math.min(bundle.priceCents, bundleFull);
  const total = offer === "bundle" ? bundlePrice : product.priceCents;
  const savings = Math.max(0, bundleFull - bundlePrice);

  const setOffer = (o: Offer) => {
    setOfferState(o);
    setErrors({});
    setAdded(false);
    if (o === "bundle") setSlots((prev) => prev.map((s, i) => (i === 0 ? { ...s, size: s.size ?? size } : s)));
    else if (!size && slots[0].productId === product.id) setSizeState(slots[0].size);
  };

  const setSize = (s: Size) => {
    setSizeState(s);
    setErrors({});
    setAdded(false);
  };

  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setErrors((e) => ({ ...e, [`slot${i}`]: "" }));
    setAdded(false);
  };

  const selectSlotColour = (i: number, np: PublicProduct) => {
    const current = slots[i];
    const keep = current.size && np.sizes.some((s) => s.label === current.size && s.available);
    updateSlot(i, { productId: np.id, size: keep ? current.size : null });
  };

  const colourHref = (p: PublicProduct) => {
    const params = new URLSearchParams(window.location.search);
    if (offer === "bundle") params.set("offre", "pack");
    else params.delete("offre");
    if (size && p.sizes.some((s) => s.label === size && s.available)) params.set("taille", size);
    else params.delete("taille");
    const q = params.toString();
    return `${basePath}/${p.slug}${q ? `?${q}` : ""}`;
  };
  const goToColour = (p: PublicProduct) => {
    if (p.id !== product.id) router.push(colourHref(p), { scroll: false });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (offer === "single" && !size) next.single = "Choisis ta taille.";
    if (offer === "bundle") {
      slots.forEach((s, i) => {
        if (!s.size) next[`slot${i}`] = `Choisis la taille de la veste ${i + 1}.`;
      });
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const addToCart = () => {
    if (!config.acceptingOrders || !validate()) return;
    if (offer === "single") add({ kind: "single", productId: product.id, size: size!, quantity: 1 });
    else add({ kind: "bundle", items: slots.map((s) => ({ productId: s.productId, size: s.size! })), quantity: 1 });
    setAdded(true);
    setDrawerOpen(true);
  };

  /** Size the stock/availability block should talk about. */
  const focusSize = offer === "single" ? size : null;

  // The CTA ref is returned separately: the state object is passed to child components.
  const state = {
    config,
    bundle,
    bundleAvailable,
    offer,
    setOffer,
    size,
    setSize,
    slots,
    slotProducts,
    updateSlot,
    selectSlotColour,
    goToColour,
    errors,
    guideFor,
    setGuideFor,
    added,
    addToCart,
    validate,
    barHidden: ctaVisible || footerVisible,
    total,
    bundleFull,
    bundlePrice,
    savings,
    focusSize,
  };
  return [state, ctaRef] as const;
}

export type Purchase = ReturnType<typeof usePurchase>[0];
