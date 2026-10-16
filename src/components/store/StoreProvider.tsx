"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_LINE_QUANTITY, priceCart } from "@/lib/pricing";
import type { BundleConfig, CartLineInput, CartQuote, PublicProduct } from "@/lib/types";

export type CartLine = CartLineInput & { key: string };

export type StoreConfig = {
  storeName: string;
  bundle: BundleConfig;
  shippingCents: number;
  shippingSummary: string;
  acceptingOrders: boolean;
  closedMessage: string;
  paymentNotice: string;
  /** Return-request window from the returns policy (days after delivery). */
  returnsWindowDays: number;
  contactEmail: string;
  /** Delivery range for an order placed today, e.g. "entre le 20 et le 22 octobre". */
  deliveryEstimate: string;
};

type Ctx = {
  config: StoreConfig;
  products: PublicProduct[];
  productMap: Map<string, PublicProduct>;
  lines: CartLine[];
  quote: CartQuote;
  hydrated: boolean;
  add: (line: CartLineInput) => void;
  update: (key: string, line: CartLineInput) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Last line added from a product page (drives the drawer's confirmation). */
  lastAdded: { at: number; line: CartLineInput } | null;
};

const StoreContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "rd.cart.v1";

function signature(line: CartLineInput) {
  return line.kind === "single"
    ? `s:${line.productId}:${line.size}`
    : `b:${line.items.map((i) => `${i.productId}:${i.size}`).sort().join("|")}`;
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function StoreProvider({
  config,
  products,
  children,
}: {
  config: StoreConfig;
  products: PublicProduct[];
  children: ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpenState] = useState(false);
  const [lastAdded, setLastAdded] = useState<{ at: number; line: CartLineInput } | null>(null);

  // Load persisted cart once on the client.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Reading browser storage is only possible after mount (SSR has no localStorage).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full or disabled */
    }
  }, [lines, hydrated]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        setLines(e.newValue ? JSON.parse(e.newValue) : []);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const quote = useMemo(
    () => priceCart(lines, productMap, config.bundle, config.shippingCents),
    [lines, productMap, config.bundle, config.shippingCents],
  );

  const add = useCallback((line: CartLineInput) => {
    setLastAdded({ at: Date.now(), line });
    setLines((prev) => {
      const sig = signature(line);
      const existing = prev.find((l) => signature(l) === sig);
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + line.quantity) } : l,
        );
      }
      return [...prev, { ...line, key: uid() }];
    });
  }, []);

  const update = useCallback((key: string, line: CartLineInput) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...line, key } : l)));
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const q = Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.trunc(quantity)));
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: q } : l)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // Closing the drawer ends the "just added" confirmation; reopening it later shows the cart only.
  const setDrawerOpen = useCallback((open: boolean) => {
    setDrawerOpenState(open);
    if (!open) setLastAdded(null);
  }, []);

  const value = useMemo(
    () => ({
      config,
      products,
      productMap,
      lines,
      quote,
      hydrated,
      add,
      update,
      remove,
      setQuantity,
      clear,
      drawerOpen,
      setDrawerOpen,
      lastAdded,
    }),
    [config, products, productMap, lines, quote, hydrated, add, update, remove, setQuantity, clear, drawerOpen, setDrawerOpen, lastAdded],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Strips the client-only key before sending lines to the API. */
export function toInput(line: CartLine): CartLineInput {
  const { key: _key, ...rest } = line;
  void _key;
  return rest as CartLineInput;
}
