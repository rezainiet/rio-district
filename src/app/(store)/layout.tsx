import type { Metadata } from "next";
import { getActiveProducts, getSettings } from "@/lib/catalog";
import { StoreProvider, type StoreConfig } from "@/components/store/StoreProvider";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";
import { MarketingPopups } from "@/components/store/MarketingPopups";
import { livePopups } from "@/lib/marketing";
import { manrope, syne } from "@/lib/store-fonts";
import { RETURNS_PREVIEW_PATH, designReviewEnabled } from "@/lib/design-review";


export const dynamic = "force-dynamic";

export const viewport = { themeColor: "#0b0b0c" };

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getSettings();
  return {
    title: { absolute: `${storeName} — Vestes Brésil`, template: `%s | ${storeName}` },
    openGraph: { siteName: storeName },
  };
}

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [settings, products] = await Promise.all([getSettings(), getActiveProducts()]);

  const config: StoreConfig = {
    storeName: settings.storeName,
    bundle: settings.bundle,
    shippingCents: settings.shipping.priceCents,
    shippingSummary: settings.shipping.summary,
    returnsSummary: settings.returns.summary,
    acceptingOrders: settings.orders.acceptingOrders,
    closedMessage: settings.orders.closedMessage,
    paymentNotice: settings.orders.paymentNotice,
  };

  return (
    <StoreProvider config={config} products={products}>
      {/* .store-dark scopes the Dark Premium palette, fonts and pill buttons to the storefront. */}
      <div className={`store-dark ${syne.variable} ${manrope.variable}`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Aller au contenu
        </a>
        <div className="flex min-h-dvh flex-col">
          {settings.announcement.enabled && settings.announcement.text && (
            <AnnouncementBar text={settings.announcement.text} />
          )}
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer
            storeName={settings.storeName}
            tagline={settings.tagline}
            contactEmail={settings.contactEmail}
            products={products}
            social={settings.social}
            returnsHref={designReviewEnabled() ? RETURNS_PREVIEW_PATH : undefined}
          />
        </div>
        <CartDrawer />
        <MarketingPopups popups={livePopups(settings.popups)} />
      </div>
    </StoreProvider>
  );
}
