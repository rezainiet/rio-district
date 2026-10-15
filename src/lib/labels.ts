export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_confirmation: "À confirmer",
  confirmed: "Confirmée",
  fulfilled: "Expédiée",
  cancelled: "Annulée",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  awaiting_payment_setup: "Paiement non configuré",
  unpaid: "Non payée",
  pending: "Paiement en cours",
  paid: "Payée",
  failed: "Échec du paiement",
  refunded: "Remboursée",
};

export const PRODUCT_STATUS_LABEL: Record<string, string> = {
  active: "En ligne",
  draft: "Brouillon",
  archived: "Archivé",
};

export const TONE: Record<string, string> = {
  pending_confirmation: "bg-amber-100 text-amber-900 ring-amber-300",
  confirmed: "bg-sky-100 text-sky-900 ring-sky-300",
  fulfilled: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  cancelled: "bg-stone-200 text-stone-700 ring-stone-300",
  awaiting_payment_setup: "bg-stone-100 text-stone-700 ring-stone-300",
  unpaid: "bg-orange-100 text-orange-900 ring-orange-300",
  pending: "bg-sky-100 text-sky-900 ring-sky-300",
  paid: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  failed: "bg-red-100 text-red-900 ring-red-300",
  refunded: "bg-violet-100 text-violet-900 ring-violet-300",
  active: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  draft: "bg-stone-100 text-stone-700 ring-stone-300",
  archived: "bg-stone-200 text-stone-600 ring-stone-300",
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
