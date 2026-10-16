import { AnnouncementBar } from "@/components/store/AnnouncementBar";

/**
 * Previews only: hides the live announcement strip (it still says the old
 * return period until the settings are updated) and shows the proposed one,
 * aligned on the returns policy.
 */
export function ProposedAnnouncement({ text, windowDays }: { text: string; windowDays: number }) {
  const proposed = text.replace(/Retours? sous \d+ jours/i, `Retour sous ${windowDays} jours`);
  return (
    <>
      <style>{`.store-dark > div > [data-announcement] { display: none; }`}</style>
      <AnnouncementBar text={proposed} />
    </>
  );
}
