import Link from "next/link";
import clsx from "clsx";
import { connectDB } from "@/lib/db";
import { formatDate } from "@/lib/labels";
import { ContactMessage } from "@/models/misc";
import { Empty, PageHeader } from "@/components/admin/ui";
import { RowActions } from "@/components/admin/RowActions";

export const metadata = { title: "Messages" };

const TABS = [
  { key: "new", label: "Nouveaux" },
  { key: "read", label: "Lus" },
  { key: "archived", label: "Archivés" },
];

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.statut) ? (sp.statut as string) : "new";
  await connectDB();
  const messages = await ContactMessage.find({ status: tab as "new" | "read" | "archived" }).sort({ createdAt: -1 }).limit(200).lean();

  return (
    <>
      <PageHeader title="Messages" description="Messages reçus via le formulaire de contact." />
      <nav className="mb-4 flex gap-1" aria-label="Filtrer">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/messages?statut=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={clsx("rounded-full px-3 py-1 text-sm", tab === t.key ? "bg-ink text-paper" : "hover:bg-paper-2")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {messages.length === 0 ? (
        <Empty>Aucun message.</Empty>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={String(m._id)} className="rounded-[var(--radius-md)] border border-line bg-white/70 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: ta question")}`} className="font-semibold underline-offset-4 hover:underline">
                  {m.email}
                </a>
                <span className="text-xs text-muted">{formatDate(m.createdAt as Date)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{m.message}</p>
              <div className="mt-3">
                <RowActions
                  endpoint={`/api/admin/messages/${m._id}`}
                  actions={[
                    ...(tab !== "read" ? [{ label: "Marquer comme lu", body: { status: "read" } }] : []),
                    ...(tab !== "archived" ? [{ label: "Archiver", body: { status: "archived" } }] : []),
                    ...(tab !== "new" ? [{ label: "Remettre en nouveau", body: { status: "new" } }] : []),
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
