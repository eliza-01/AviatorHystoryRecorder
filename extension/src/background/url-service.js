const AVIATOR_MARKERS = [
  "/aviator/",
  "/23366/",
  "gid=23366",
  "game=aviator"
];

export function isAviatorTabUrl(url) {
  if (!url) {
    return false;
  }

  let normalized;
  try {
    normalized = decodeURIComponent(String(url)).toLowerCase();
  } catch {
    normalized = String(url).toLowerCase();
  }

  return AVIATOR_MARKERS.some((marker) => normalized.includes(marker));
}

export function sanitizeStoredUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.slice(0, 4096);
  } catch {
    return String(url).split("?")[0].slice(0, 4096);
  }
}
