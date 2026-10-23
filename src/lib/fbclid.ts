/** Meta click IDs are opaque. Keep only a bounded URL-safe value, unchanged. */
export function validFbclid(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,500}$/.test(value);
}
