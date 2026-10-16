import { Inter } from "next/font/google";

// Inter is the admin's reading face; loading it here keeps it off the storefront pages.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  // Set the family here: the theme's --font-sans is resolved at :root, where --font-inter no longer exists.
  return <div className={`${inter.variable} min-h-full [font-family:var(--font-inter),system-ui,sans-serif]`}>{children}</div>;
}
