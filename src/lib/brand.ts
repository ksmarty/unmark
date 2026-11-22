/**
 * Single source of truth for the Unmark mark.
 *
 * Both the header logo and the browser favicon are generated from these
 * constants, so the tab icon can never drift away from the logo again.
 */

export const BRAND_ACCENT = "#d7ff4f";
export const BRAND_INK = "#101400";

/** Lucide "eraser" geometry, in a 24×24 box. */
export const BRAND_GLYPH_PATHS = [
  "m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",
  "M22 21H7",
  "m5 11 9 9",
] as const;

const GLYPH_SCALE = 0.87;
const GLYPH_OFFSET = (32 - 24 * GLYPH_SCALE) / 2;

/** The mark as a standalone SVG document — lime tile, ink glyph. */
export function brandSvg(size = 64): string {
  const paths = BRAND_GLYPH_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">` +
    `<rect width="32" height="32" rx="9" fill="${BRAND_ACCENT}"/>` +
    `<g transform="translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_SCALE})" fill="none" ` +
    `stroke="${BRAND_INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
    paths +
    `</g></svg>`
  );
}

/** `data:` URL version, ready for a `<link rel="icon">`. */
export function faviconHref(size = 64): string {
  return `data:image/svg+xml,${encodeURIComponent(brandSvg(size))}`;
}

/**
 * Point the document at a freshly generated icon. Called once at boot, after the
 * stylesheet exists, so the tab icon matches the logo in the header.
 */
export function installFavicon(): void {
  if (typeof document === "undefined") return;
  const href = faviconHref();
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = href;

  let touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!touchIcon) {
    touchIcon = document.createElement("link");
    touchIcon.rel = "apple-touch-icon";
    document.head.appendChild(touchIcon);
  }
  touchIcon.href = href;
}
