"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { Button } from "@/components/ui/Button";
import { Card, inputCls, labelCls } from "./ui";

const PAYMENT_OPTIONS = ["awaiting_payment_setup", "unpaid", "pending", "paid", "failed", "refunded"];

const ACTION_LABEL: Record<string, string> = {
  confirmed: "Confirmer la commande",
  fulfilled: "Marquer comme expédiée",
  cancelled: "Annuler la commande",
  pending_confirmation: "Repasser « à confirmer »",
};

export function OrderActions({
  id,
  status,
  next,
  paymentStatus,
  notes,
}: {
  id: string;
  status: string;
  next: string[];
  paymentStatus: string;
  notes: { id: string; text: string; author: string; at: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState(paymentStatus);
  const [statusMessage, setStatusMessage] = useState("");

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error ?? "Action impossible.");
      return false;
    }
    router.refresh();
    return true;
  };

  return (
    <>
      <Card title="Statut de la commande">
        <p className="text-sm">
          Actuel : <strong>{ORDER_STATUS_LABEL[status]}</strong>
        </p>
        {next.length > 0 ? (
          <>
            <label htmlFor="status-msg" className={`${labelCls} mt-4`}>Message (facultatif, visible dans l&apos;historique)</label>
            <input id="status-msg" className={inputCls} value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} maxLength={300} />
            <div className="mt-3 grid gap-2">
              {next.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === "cancelled" ? "danger" : s === "pending_confirmation" ? "ghost" : "primary"}
                  disabled={busy}
                  onClick={async () => {
                    if (s === "cancelled" && !confirm("Annuler cette commande ? Le stock réservé sera libéré.")) return;
                    if (
                      s === "fulfilled" &&
                      paymentStatus !== "paid" &&
                      !confirm("Cette commande n'est pas marquée « Payée ». L'expédier quand même ?")
                    )
                      return;
                    if (await patch({ action: "status", status: s, message: statusMessage || undefined })) setStatusMessage("");
                  }}
                >
                  {ACTION_LABEL[s] ?? ORDER_STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted">Aucune action possible : la commande est annulée.</p>
        )}
      </Card>

      <Card title="Paiement">
        <p className="text-xs leading-relaxed text-muted">
          Aucun prestataire de paiement n&apos;est branché. Ne marque une commande « Payée » que si tu as réellement reçu le
          paiement (virement, espèces…).
        </p>
        <label htmlFor="payment" className={`${labelCls} mt-3`}>Statut du paiement</label>
        <select id="payment" className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value)}>
          {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{PAYMENT_STATUS_LABEL[p]}</option>)}
        </select>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          disabled={busy || payment === paymentStatus}
          onClick={() => {
            if (payment === "paid" && !confirm("Confirmer que le paiement a bien été reçu ?")) return;
            patch({ action: "payment", paymentStatus: payment });
          }}
        >
          Mettre à jour le paiement
        </Button>
      </Card>

      <Card title="Notes internes">
        {notes.length > 0 && (
          <ul className="mb-4 space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-[var(--radius-sm)] bg-paper-2/70 p-3 text-sm">
                <p className="whitespace-pre-wrap">{n.text}</p>
                <p className="mt-1 text-xs text-muted">{n.author} · {n.at}</p>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return;
            if (await patch({ action: "note", text: note.trim() })) setNote("");
          }}
        >
          <label htmlFor="note" className="sr-only">Ajouter une note</label>
          <textarea id="note" rows={3} className={inputCls} placeholder="Visible uniquement par l'équipe…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          <Button type="submit" size="sm" variant="ghost" className="mt-2 w-full border border-line" disabled={busy || !note.trim()}>
            Ajouter la note
          </Button>
        </form>
      </Card>

      {error && <p role="alert" className="rounded-[var(--radius-sm)] bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    </>
  );
}
