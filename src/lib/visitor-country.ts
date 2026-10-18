import { isIP } from "node:net";
import { DEFAULT_PHONE_COUNTRY, supportedPhoneCountry } from "./phone";

const cache = new Map<string, { country: string; expires: number }>();

export async function visitorPhoneCountry(ip: string, lookup: typeof fetch = fetch) {
  if (!isIP(ip)) return DEFAULT_PHONE_COUNTRY;
  const now = Date.now();
  const saved = cache.get(ip);
  if (saved && saved.expires > now) return saved.country;
  let country: string = DEFAULT_PHONE_COUNTRY;
  try {
    const response = await lookup(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, {
      signal: AbortSignal.timeout(1800),
      cache: "no-store",
    });
    if (response.ok) {
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "success" in data && data.success === true &&
          "country_code" in data && supportedPhoneCountry(data.country_code)) country = data.country_code;
    }
  } catch { /* The checkout always remains usable with the French default. */ }
  if (cache.size >= 1000) cache.clear();
  cache.set(ip, { country, expires: now + (country === DEFAULT_PHONE_COUNTRY ? 15 * 60_000 : 24 * 60 * 60_000) });
  return country;
}
