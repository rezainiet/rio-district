/**
 * Product-page design concepts (client review only). Available in development,
 * or when CONCEPTS_ENABLED=1 is set explicitly; they return 404 in production.
 */
export function conceptsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.CONCEPTS_ENABLED === "1";
}

export const CONCEPTS = [
  {
    key: "vitrine",
    letter: "A",
    name: "Vitrine",
    intent: "La page actuelle, recomposée autour de la confiance : note sous le titre, stock honnête, puis toute la réassurance juste sous le bouton.",
  },
  {
    key: "confiance",
    letter: "B",
    name: "Confiance",
    intent: "La preuve sociale d'abord, puis une seule carte d'achat qui réunit offre, choix, stock, bouton et garanties.",
  },
  {
    key: "pack",
    letter: "C",
    name: "Pack Studio",
    intent: "Le pack en tête : configurateur 2 vestes avec le calcul du prix visible, la veste seule à un clic.",
  },
] as const;
export type ConceptKey = (typeof CONCEPTS)[number]["key"];
export const RETURNS_CONCEPT_PATH = "/concepts/retours";
