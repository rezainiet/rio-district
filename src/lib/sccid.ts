/** Snapchat click IDs (ScCid) are opaque. Keep only a bounded URL-safe value, unchanged. */
export function validSccid(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,500}$/.test(value);
}
