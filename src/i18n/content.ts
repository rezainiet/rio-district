/**
 * Database content in the visitor's language (client-safe, no I/O).
 *
 * Products and settings are written in French in the admin. On the Spanish
 * site their customer-facing text goes through tx() (src/i18n/es/content.ts)
 * and their internal links through href(). Numbers, prices, flags and ids
 * are untouched. On the French site the objects are returned as they are.
 */
import type { StoreSettings } from "@/lib/defaults";
import type { PublicProduct } from "@/lib/types";
import type { Translator } from "./translate";

export function localizeProduct<T extends PublicProduct>(p: T, { locale, tx }: Translator): T {
  if (locale === "fr") return p;
  return {
    ...p,
    name: tx(p.name),
    tagline: tx(p.tagline),
    description: tx(p.description),
    details: p.details.map(tx),
    material: tx(p.material),
    care: tx(p.care),
    color: { ...p.color, name: tx(p.color.name) },
    images: p.images.map((i) => ({ ...i, alt: tx(i.alt) })),
  };
}

export function localizeProducts<T extends PublicProduct>(list: T[], tr: Translator): T[] {
  return tr.locale === "fr" ? list : list.map((p) => localizeProduct(p, tr));
}

/**
 * Customer-facing settings text and links. Run text helpers that parse the French (announcementText) BEFORE this.
 * Also needed on the French site: admin links such as "/#collection" must become "/fr#collection" there
 * ("/" is the Spanish home page). tx() leaves French text as it is.
 */
export function localizeSettings(s: StoreSettings, tr: Translator): StoreSettings {
  const { tx, href } = tr;
  const link = (h: string) => (h ? href(h) : h);
  return {
    ...s,
    tagline: tx(s.tagline),
    announcement: { ...s.announcement, text: tx(s.announcement.text) },
    promotion: { ...s.promotion, headline: tx(s.promotion.headline), text: tx(s.promotion.text) },
    bundle: { ...s.bundle, label: tx(s.bundle.label) },
    shipping: { ...s.shipping, summary: tx(s.shipping.summary), details: tx(s.shipping.details) },
    returns: { summary: tx(s.returns.summary), details: tx(s.returns.details) },
    orders: { ...s.orders, closedMessage: tx(s.orders.closedMessage), paymentNotice: tx(s.orders.paymentNotice) },
    faq: s.faq.map((f) => ({ question: tx(f.question), answer: tx(f.answer) })),
    countdown: { ...s.countdown, title: tx(s.countdown.title), text: tx(s.countdown.text), ctaLabel: tx(s.countdown.ctaLabel), ctaHref: link(s.countdown.ctaHref) },
    popups: {
      welcome: { ...s.popups.welcome, title: tx(s.popups.welcome.title), text: tx(s.popups.welcome.text), ctaLabel: tx(s.popups.welcome.ctaLabel), ctaHref: link(s.popups.welcome.ctaHref) },
      exitIntent: { ...s.popups.exitIntent, title: tx(s.popups.exitIntent.title), text: tx(s.popups.exitIntent.text), ctaLabel: tx(s.popups.exitIntent.ctaLabel), ctaHref: link(s.popups.exitIntent.ctaHref) },
      cartReminder: { ...s.popups.cartReminder, title: tx(s.popups.cartReminder.title), text: tx(s.popups.cartReminder.text) },
    },
    returnsPolicy: {
      ...s.returnsPolicy,
      damagedParcel: s.returnsPolicy.damagedParcel === null ? null : tx(s.returnsPolicy.damagedParcel),
      wrongItem: s.returnsPolicy.wrongItem === null ? null : tx(s.returnsPolicy.wrongItem),
    },
  };
}
