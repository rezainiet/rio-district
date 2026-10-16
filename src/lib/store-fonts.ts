import { Manrope, Syne } from "next/font/google";

// Dark Premium storefront typography (the admin keeps Archivo/Inter). Shared
// with the admin previews so pop-ups and countdowns look exactly as in the shop.
export const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });
export const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
