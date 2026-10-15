import { DEFAULT_SIZE_CHART, DEFAULT_SIZE_RULES, type SizeChartRow, type SizeRule } from "./sizes";

export type FaqItem = { question: string; answer: string };

export type StoreSettings = {
  storeName: string;
  tagline: string;
  contactEmail: string;
  announcement: { enabled: boolean; text: string };
  promotion: {
    enabled: boolean;
    headline: string;
    text: string;
    /** Optional real deadline. Never invent one: leave null when there is none. */
    endsAt: string | null;
  };
  bundle: { enabled: boolean; quantity: 2; priceCents: number; label: string };
  shipping: { priceCents: number; summary: string; details: string; minDays: number; maxDays: number };
  returns: { summary: string; details: string };
  orders: {
    /** When false, the storefront shows the catalogue but refuses new order requests. */
    acceptingOrders: boolean;
    closedMessage: string;
    paymentNotice: string;
  };
  faq: FaqItem[];
  sizeRules: SizeRule[];
  sizeChart: SizeChartRow[];
  social: { instagram: string; tiktok: string };
};

/**
 * Initial content. Customer-facing copy (FAQ answers, shipping and returns
 * promises) is taken from the reference store and must be confirmed by the
 * client before launch. The payment FAQ answer was rewritten on purpose:
 * no payment is processed online yet, so we do not claim "paiement sécurisé".
 */
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "KALT",
  tagline: "Vestes Brésil — coupe-vent léger, six coloris.",
  contactEmail: "contact@kaltshop.club",
  announcement: {
    enabled: true,
    text: "Livraison offerte et suivie · Retours sous 14 jours · 2 vestes pour 24,95 €",
  },
  promotion: {
    enabled: true,
    headline: "Une seule couleur, c'est dur de choisir.",
    text: "Prends-en 2 pour 24,95 € et mélange les couleurs comme tu veux.",
    endsAt: null,
  },
  bundle: { enabled: true, quantity: 2, priceCents: 2495, label: "Pack 2 vestes" },
  shipping: {
    priceCents: 0,
    summary: "Livraison gratuite et suivie, 2 à 4 jours ouvrés",
    details:
      "La livraison est gratuite et suivie partout en France métropolitaine, en 2 à 4 jours ouvrés après confirmation de la commande. Un e-mail de suivi t'est envoyé à l'expédition.",
    minDays: 2,
    maxDays: 4,
  },
  returns: {
    summary: "Échange ou retour gratuit sous 14 jours",
    details:
      "Tu as 14 jours après réception pour échanger ou retourner ta veste, gratuitement. Elle doit être non portée, avec ses étiquettes. En cas de doute sur la taille, écris-nous avant de commander.",
  },
  orders: {
    acceptingOrders: true,
    closedMessage: "Les commandes en ligne ouvrent très bientôt. Laisse-nous un message pour être prévenu.",
    paymentNotice:
      "Le paiement en ligne n'est pas encore disponible. Ta demande de commande est enregistrée sans paiement : nous te contactons par e-mail pour confirmer la commande et t'indiquer comment régler. Rien n'est débité aujourd'hui.",
  },
  faq: [
    {
      question: "Quels sont les délais de livraison ?",
      answer:
        "La livraison est gratuite et suivie partout, en 2 à 4 jours ouvrés après la confirmation de ta commande.",
    },
    {
      question: "Comment choisir ma taille ?",
      answer:
        "Les vestes vont du XS au 3XL. Sur chaque fiche produit, le guide des tailles inclut un simulateur : indique ta taille et ton poids, il te donne une estimation. Entre deux tailles, prends la plus grande pour une coupe ample.",
    },
    {
      question: "Puis-je échanger ou retourner ma veste ?",
      answer:
        "Oui, tu as 14 jours pour l'échanger ou la retourner, gratuitement. En cas de doute sur la taille, écris-nous avant de commander.",
    },
    {
      question: "Comment se passe le paiement ?",
      answer:
        "Le paiement en ligne n'est pas encore ouvert. Tu envoies une demande de commande, nous la confirmons par e-mail et t'indiquons comment régler. Aucune donnée bancaire n'est demandée sur le site.",
    },
    {
      question: "Quels coloris sont disponibles ?",
      answer:
        "Six coloris : vert, rose, noir, blanc, bleu et jaune. Chaque coloris a sa propre fiche, et tu peux composer un pack de 2 vestes avec les couleurs de ton choix.",
    },
  ],
  sizeRules: DEFAULT_SIZE_RULES,
  sizeChart: DEFAULT_SIZE_CHART,
  social: { instagram: "", tiktok: "" },
};
