import { Manrope, Syne } from "next/font/google";

// Dark Premium storefront typography (the admin keeps Archivo/Inter). Shared
// with the admin previews so pop-ups and countdowns look exactly as in the shop.
// Syne now only draws the Rio District wordmark: one weight, not preloaded.
export const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["800"], display: "swap", preload: false });
export const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
