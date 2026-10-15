"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Small buttons that PATCH/DELETE an admin resource then refresh the page. */
export function RowActions({
  endpoint,
  actions,
}: {
  endpoint: string;
  actions: { label: string; body?: Record<string, unknown>; method?: "PATCH" | "DELETE"; confirm?: string; danger?: boolean }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          disabled={busy}
          onClick={async () => {
            if (a.confirm && !confirm(a.confirm)) return;
            setBusy(true);
            setError("");
            const res = await fetch(endpoint, {
              method: a.method ?? "PATCH",
              headers: { "Content-Type": "application/json" },
              body: a.body ? JSON.stringify(a.body) : undefined,
            }).catch(() => null);
            setBusy(false);
            if (res?.ok) router.refresh();
            else setError("Échec");
          }}
          className={`rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${a.danger ? "border-danger/40 text-danger hover:bg-danger/10" : "border-line-strong hover:border-ink"}`}
        >
          {a.label}
        </button>
      ))}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
