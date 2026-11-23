/**
 * Spanish (Spain, "tú") for every French string of the storefront, keyed by
 * the exact French text. One file per area so the wording stays easy to find.
 * Placeholders ({n}, {size}…) must appear in both texts.
 */
import core from "./core";
import content from "./content";
import home from "./home";
import product from "./product";
import checkout from "./checkout";
import policies from "./policies";

export const ES: Readonly<Record<string, string>> = { ...core, ...content, ...home, ...product, ...checkout, ...policies };

export const ES_AREAS = { core, content, home, product, checkout, policies } as const;
