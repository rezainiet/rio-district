import type { NextConfig } from "next";

// Extra image hosts allowed for product photos (comma-separated), e.g. a CDN.
const remoteHosts = (process.env.IMAGE_REMOTE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Separate output for the isolated local payment simulator/build verification.
  distDir: process.env.RIO_EVERFLOW_TEST === "true" ? ".next-everflow" : ".next",
  // Storefront and admin pages read MongoDB on each request (force-dynamic),
  // so we keep the classic rendering model instead of Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: remoteHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
    // Placeholder product illustrations are first-party SVGs.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  poweredByHeader: false,
  // Keeps review screenshots free of the dev-mode badge.
  devIndicators: false,
  async headers() {
    const production = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // Baseline policy that does not interfere with Next's inline runtime scripts.
          // A nonce-based script-src is a possible later hardening step.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          // HTTPS is mandatory in production (admin cookies are Secure); browsers ignore HSTS over plain HTTP.
          ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      ...["/commande/:path*", "/api/orders", "/api/payments/:path*"].map(source => ({ source, headers: [
        { key: "Cache-Control", value: "no-store, private" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ] })),
    ];
  },
};

export default nextConfig;
