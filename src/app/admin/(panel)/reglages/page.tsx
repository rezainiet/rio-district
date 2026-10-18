import { getSettings } from "@/lib/catalog";
import { checkoutPresentation } from "@/lib/payments/hosted";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { EVERFLOW_OFFERS } from "@/lib/payments/everflow";
import { forwardingFlag } from "@/lib/payments/forwarding-flag";

export const metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const settings = await getSettings();
  const flag = forwardingFlag();
  const checkout = checkoutPresentation();
  const singleUrl = process.env.EVERFLOW_SINGLE_CHECKOUT_URL ?? "";
  const bundleUrl = process.env.EVERFLOW_BUNDLE_CHECKOUT_URL ?? "";
  const domain = (() => {
    try {
      const single = new URL(singleUrl);
      const bundle = new URL(bundleUrl);
      return single.hostname === bundle.hostname ? single.hostname : "Domaines différents : vérifier la configuration";
    } catch { return "Non configuré"; }
  })();
  return (
    <>
      <PageHeader title="Réglages" description="Contenus et règles de la boutique. Les changements sont visibles immédiatement." />
      <SettingsForm initial={settings} paymentInfo={{
        enabled: flag.enabled,
        source: flag.source,
        status: !flag.enabled ? "Désactivée" : checkout.available ? "Disponible" : "Configuration indisponible",
        mode: checkout.mode,
        error: checkout.error,
        domain,
        singleUrl,
        bundleUrl,
        approvedDomain: new URL(EVERFLOW_OFFERS.single.url).hostname,
        approvedSingleUrl: EVERFLOW_OFFERS.single.url,
        approvedBundleUrl: EVERFLOW_OFFERS.bundle.url,
      }} />
    </>
  );
}
