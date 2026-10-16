/**
 * Returns & refunds policy as structured, editable content (client-safe, no I/O).
 *
 * Values the client has confirmed are filled in. Values still undecided are
 * `null`: pages render them as a visible "à confirmer" marker instead of
 * inventing a rule. Stored under settings.returnsPolicy so it can later be
 * edited from Admin → Réglages without touching the code.
 */

export type ReturnsPolicy = {
  /** Confirmed by the client: 15 days. */
  windowDays: number;
  /** The window starts at delivery ("réception"). */
  windowStartsAt: "réception";
  /** How to start a return: contact customer service with the order number. */
  requiresOrderNumber: boolean;
  itemMustBeUnused: boolean | null;
  packagingMustBeIntact: boolean | null;
  returnShippingPaidBy: "client" | "boutique" | null;
  /** Refund issued within N days after the returned item is received and checked. */
  refundDelayDays: number | null;
  exchangesAllowed: boolean | null;
  damagedParcel: string | null;
  wrongItem: string | null;
  /** "draft" until the client approves the whole policy. */
  status: "draft" | "approved";
};

export const DEFAULT_RETURNS_POLICY: ReturnsPolicy = {
  windowDays: 15,
  windowStartsAt: "réception",
  requiresOrderNumber: true,
  itemMustBeUnused: true,
  packagingMustBeIntact: null,
  returnShippingPaidBy: null,
  refundDelayDays: null,
  exchangesAllowed: null,
  damagedParcel: null,
  wrongItem: null,
  status: "draft",
};

/** Short, confirmed reassurance line used next to the buy button. */
export function returnsHeadline(p: ReturnsPolicy) {
  return `Retour possible sous ${p.windowDays} jours après réception.`;
}

export function returnsHowTo(p: ReturnsPolicy) {
  return p.requiresOrderNumber
    ? "Contacte notre service client avec ton numéro de commande : on t'explique la marche à suivre."
    : "Contacte notre service client : on t'explique la marche à suivre.";
}

export type PolicySection = { title: string; body: string; pending?: string };

/** Content of the dedicated Returns & Refunds page, built from the policy values. */
export function returnsSections(p: ReturnsPolicy): PolicySection[] {
  const pending = (what: string) => ({ body: "", pending: what });
  return [
    {
      title: "Délai de retour",
      body: `Tu disposes de ${p.windowDays} jours à compter de la réception de ta commande pour demander un retour.`,
    },
    {
      title: "Comment faire une demande",
      body: `${returnsHowTo(p)} Nous te répondons avec la procédure et l'adresse de retour.`,
    },
    {
      title: "État de l'article",
      ...(p.itemMustBeUnused === null && p.packagingMustBeIntact === null
        ? pending("Conditions d'état de l'article et de l'emballage")
        : {
            body: [
              p.itemMustBeUnused ? "L'article doit être non porté, non lavé et avec ses étiquettes." : null,
              p.packagingMustBeIntact === true ? "L'emballage d'origine doit être intact." : null,
            ]
              .filter(Boolean)
              .join(" "),
            pending: p.packagingMustBeIntact === null ? "Emballage d'origine exigé ou non" : undefined,
          }),
    },
    {
      title: "Frais de retour",
      ...(p.returnShippingPaidBy === null
        ? pending("Qui paie l'envoi du retour (client ou boutique)")
        : {
            body:
              p.returnShippingPaidBy === "boutique"
                ? "Le retour est gratuit : nous te fournissons l'étiquette d'envoi."
                : "Les frais d'envoi du retour sont à ta charge.",
          }),
    },
    {
      title: "Remboursement",
      ...(p.refundDelayDays === null
        ? pending("Délai de remboursement après réception du retour")
        : { body: `Le remboursement est effectué sous ${p.refundDelayDays} jours après réception et vérification de l'article.` }),
    },
    {
      title: "Échange de taille",
      ...(p.exchangesAllowed === null
        ? pending("Échange de taille possible ou retour puis nouvelle commande")
        : { body: p.exchangesAllowed ? "Tu peux échanger ta veste contre une autre taille, selon le stock disponible." : "Pour une autre taille, retourne l'article puis passe une nouvelle commande." }),
    },
    {
      title: "Colis endommagé",
      ...(p.damagedParcel === null ? pending("Procédure en cas de colis endommagé (photos, délai pour le signaler)") : { body: p.damagedParcel }),
    },
    {
      title: "Erreur d'article",
      ...(p.wrongItem === null ? pending("Procédure si tu reçois un mauvais article ou une mauvaise taille") : { body: p.wrongItem }),
    },
  ];
}

/** FAQ entries for the product page (draft wording, adapted to the site's "tu"). */
export function productFaq(p: ReturnsPolicy, s: { minDays: number; maxDays: number; bundlePrice: string; bundleQty: number }) {
  return [
    {
      question: "Puis-je retourner ma commande ?",
      answer: `Oui. Tu peux demander un retour dans les ${p.windowDays} jours suivant la réception de ton colis. ${returnsHowTo(p)}`,
    },
    {
      question: "Quels sont les délais de livraison ?",
      answer: `La livraison est offerte et suivie, en ${s.minDays} à ${s.maxDays} jours ouvrés après la confirmation de ta commande. Tu reçois le suivi par e-mail à l'expédition.`,
    },
    {
      question: "Comment choisir ma taille ?",
      answer: "Les vestes vont du XS au 3XL avec une coupe ample. Le guide des tailles calcule une estimation à partir de ta taille et de ton poids. Entre deux tailles, prends la plus grande.",
    },
    {
      question: "Comment fonctionne le pack ?",
      answer: `Le pack réunit ${s.bundleQty} vestes au choix pour ${s.bundlePrice} : tu choisis la couleur et la taille de chacune, l'économie s'applique automatiquement.`,
    },
    {
      question: "Comment se passe le paiement ?",
      answer: "Le paiement en ligne n'est pas encore ouvert. Tu envoies une demande de commande, nous la confirmons par e-mail et t'indiquons comment régler. Rien n'est débité sur le site.",
    },
    {
      question: "La taille que je veux est-elle disponible ?",
      answer: "La disponibilité affichée est celle de notre stock réel, taille par taille. Une taille épuisée est barrée et ne peut pas être commandée.",
    },
    {
      question: "Comment vous contacter ?",
      answer: "Écris-nous depuis le formulaire de contact ou par e-mail, avec ton numéro de commande si tu en as un : on te répond au plus vite.",
    },
  ];
}
