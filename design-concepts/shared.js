// Shared content for the 5 homepage concepts (review mockups only — not production code).
// Same products, prices and offer as the live storefront.
window.KALT = {
  img: (slug) => `../../public/products/reference/veste-bresil-${slug}-face.webp`,
  products: [
    { slug: "vert", name: "Veste Brésil Vert", color: "Vert", hex: "#9DD0CA" },
    { slug: "rose", name: "Veste Brésil Rose", color: "Rose", hex: "#EBA6BE" },
    { slug: "noir", name: "Veste Brésil Noir", color: "Noir", hex: "#1B1B1B" },
    { slug: "blanc", name: "Veste Brésil Blanc", color: "Blanc", hex: "#F1F0EA" },
    { slug: "bleu", name: "Veste Brésil Bleu", color: "Bleu", hex: "#0B4A9E" },
    { slug: "jaune", name: "Veste Brésil Jaune", color: "Jaune", hex: "#E9E21A" },
  ],
  price: "19,99 €",
  pack: "24,95 €",
  packFull: "39,98 €",
  packSave: "15,03 €",
  packPct: "−38 %",
  announcement: ["Livraison offerte et suivie", "Retours sous 14 jours", "2 vestes pour 24,95 €"],
  nav: ["Collection", "Pack 2 vestes", "La veste", "FAQ", "Contact"],
  benefits: [
    ["Livraison offerte", "Suivie, 2 à 4 jours ouvrés"],
    ["Retours 14 jours", "Échange ou retour gratuit"],
    ["Du XS au 3XL", "Guide et simulateur de taille"],
    ["Mix & match", "2 couleurs au choix dans un pack"],
  ],
  details: ["Coupe-vent léger", "Coupe ample", "Fermeture zippée intégrale", "Capuche avec cordon de serrage"],
  faq: [
    "Quels sont les délais de livraison ?",
    "Comment choisir ma taille ?",
    "Puis-je échanger ou retourner ma veste ?",
    "Comment se passe le paiement ?",
  ],
};
