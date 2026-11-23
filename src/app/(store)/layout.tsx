import type { Metadata } from "next";
import { getActiveProducts, getSettings } from "@/lib/catalog";
import { StoreProvider, type StoreConfig } from "@/components/store/StoreProvider";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";
import { MarketingPopups } from "@/components/store/MarketingPopups";
import { countdownFor, livePopups } from "@/lib/marketing";
import { manrope, syne } from "@/lib/store-fonts";
import { RETURNS_PATH, announcementText, storePlan } from "@/lib/storefront";
import { rangeLong } from "@/lib/delivery-plan";
import { formatEUR } from "@/lib/money";
import { checkoutPresentation } from "@/lib/payments/hosted";
import { MarketingPixels } from "@/components/store/MarketingPixels";
import { LocaleProvider } from "@/i18n/client";
import { localizeProducts, localizeSettings } from "@/i18n/content";
import { getT } from "@/i18n/server";
import { shareDefaults } from "@/i18n/share";


export const dynamic = "force-dynamic";

export const viewport = { themeColor: "#0b0b0c" };

export async function generateMetadata(): Promise<Metadata> {
  const [{ storeName }, tr] = await Promise.all([getSettings(), getT()]);
  return {
    title: { absolute: `${storeName} — ${tr.t("Vestes Brésil")}`, template: `%s | ${storeName}` },
    // Next.js replaces the root layout's openGraph: repeat the language defaults with the store name.
    ...shareDefaults(tr, storeName),
  };
}

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [frSettings, frProducts, tr] = await Promise.all([getSettings(), getActiveProducts(), getT()]);
  const { locale, t, tx } = tr;
  const settings = localizeSettings(frSettings, tr);
  const products = localizeProducts(frProducts, tr);

  const config: StoreConfig = {
    checkout: checkoutPresentation(settings),
    storeName: settings.storeName,
    bundle: settings.bundle,
    shippingCents: settings.shipping.priceCents,
    shippingSummary: settings.shipping.summary,
    acceptingOrders: settings.orders.acceptingOrders,
    closedMessage: settings.orders.closedMessage,
    paymentNotice: settings.orders.paymentNotice,
    returnsWindowDays: settings.returnsPolicy.windowDays,
    contactEmail: settings.contactEmail,
    deliveryEstimate: (() => {
      const plan = storePlan(settings);
      return rangeLong(plan.deliveryFrom, plan.deliveryTo, locale);
    })(),
  };

  const announcement = settings.bundle.enabled
    ? t("OFFRE DUO · {n} VESTES POUR {price} · COLORIS AU CHOIX", { n: settings.bundle.quantity, price: formatEUR(settings.bundle.priceCents) })
    : tx(announcementText(frSettings));

  return (
    <LocaleProvider locale={locale}>
      <StoreProvider config={config} products={products}>
        {/* .store-dark scopes the Dark Premium palette, fonts and pill buttons to the storefront. */}
        <div className={`store-dark ${syne.variable} ${manrope.variable}`}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
          >
            {t("Aller au contenu")}
          </a>
          <div className="flex min-h-dvh flex-col">
            {settings.announcement.enabled && settings.announcement.text && <AnnouncementBar text={announcement} />}
            <Header countdown={countdownFor(settings.countdown, "home")} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer
              storeName={settings.storeName}
              tagline={settings.tagline}
              contactEmail={settings.contactEmail}
              products={products}
              social={settings.social}
              returnsHref={RETURNS_PATH}
            />
          </div>
          <CartDrawer />
          <MarketingPopups popups={livePopups(settings.popups)} />
          <MarketingPixels />
        </div>
      </StoreProvider>
    </LocaleProvider>
  );
}
