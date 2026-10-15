import { getSettings } from "@/lib/catalog";
import { paymentsEnabled } from "@/lib/payments";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Réglages" description="Contenus et règles de la boutique. Les changements sont visibles immédiatement." />
      <SettingsForm initial={settings} paymentsEnabled={paymentsEnabled()} />
    </>
  );
}
