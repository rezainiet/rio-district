import { getActiveProducts, getSettings } from "@/lib/catalog";
import { StoreProvider, type StoreConfig } from "@/components/store/StoreProvider";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";

export const dynamic = "force-dynamic";

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
        />
      </div>
      <CartDrawer />
    </StoreProvider>
  );
}
