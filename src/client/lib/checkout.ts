export function parseHotmartCheckoutUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isHotmartHost =
      url.hostname === "hotmart.com" || url.hostname.endsWith(".hotmart.com");

    if (
      url.protocol !== "https:" ||
      !isHotmartHost ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
