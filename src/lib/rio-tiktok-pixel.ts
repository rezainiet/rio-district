// Browser SDK only. Purchase stays with the existing server-side integration.
export const RIO_TIKTOK_PIXEL_ID = "DC2PT4JC77U7UCAFCGDG";

const SDK = "https://analytics.tiktok.com/i18n/pixel/events.js";
const METHODS = ["page", "track", "identify", "instances", "debug", "on", "off", "once",
  "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"] as const;
type Queue = unknown[][] & Record<string, unknown>;
type TiktokQueue = Queue & {
  _i: Record<string, Queue>;
  _t: Record<string, number>;
  _o: Record<string, object>;
  instance: (id: string) => Queue;
  page: () => void;
  setAndDefer: (target: Queue, method: string) => void;
  load: (id: string, options?: object) => void;
};
type PixelWindow = Window & { ttq?: unknown; TiktokAnalyticsObject?: string };

export function isRioTikTokStorefrontRoute(route: string): boolean {
  return route === "/" || route === "/panier" || /^\/produit\/[a-z0-9-]+$/.test(route);
}

export function loadRioTikTokPixel(win: PixelWindow, doc: Document) {
  // Do not overwrite an SDK already initialized by another tag.
  if (win.ttq || doc.querySelector('script[src^="' + SDK + '"]')) return;
  const queue = [] as unknown as TiktokQueue;
  queue.setAndDefer = (target, method) => {
    target[method] = (...args: unknown[]) => { target.push([method, ...args]); };
  };
  const defer = (target: Queue) => {
    for (const method of METHODS) queue.setAndDefer(target, method);
    return target;
  };
  defer(queue);
  queue._i = {};
  queue._t = {};
  queue._o = {};
  queue.instance = (id) => defer(queue._i[id] ?? ([] as unknown as Queue));
  queue.load = (id, options = {}) => {
    const instance = [] as unknown as Queue;
    instance._u = SDK;
    queue._i[id] = instance;
    queue._t[id] = Date.now();
    queue._o[id] = options;
    const script = doc.createElement("script");
    script.async = true;
    script.src = SDK + "?sdkid=" + encodeURIComponent(id) + "&lib=ttq";
    doc.head.appendChild(script);
  };
  win.TiktokAnalyticsObject = "ttq";
  win.ttq = queue;
  queue.load(RIO_TIKTOK_PIXEL_ID);
  // TikTok handles subsequent SPA pageviews. Do not emit a second page event in the router effect.
  queue.page();
}
