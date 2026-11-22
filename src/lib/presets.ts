import type { OutputFormat } from "@/types";

export const DEFAULT_PROMPT = [
  "Remove the watermark from this photo and rebuild whatever it was covering.",
  "Keep everything else exactly as it is: the same people (identical faces, expressions and skin detail), the same lighting, colour, grain and framing.",
  "Where the watermark sits, continue the underlying texture and detail naturally. Never paint text, logos, borders, stamps or new objects.",
  "Return only the cleaned photograph, at the same framing and angle.",
].join("\n\n");

export const REFERENCE_SUFFIX =
  "The attached reference photos show the same person(s). Use them as the authoritative source for facial identity, hair and fine details, and keep the face in the cleaned photo consistent with them.";

export const PROMPT_PRESETS: Array<{ id: string; label: string; hint: string; prompt: string }> = [
  {
    id: "classic",
    label: "General photo",
    hint: "Stock-photo marks, logos, overlays",
    prompt: DEFAULT_PROMPT,
  },
  {
    id: "portrait",
    label: "Portrait",
    hint: "Face and skin detail first",
    prompt: [
      "Remove the watermark or overlaid text from this portrait and reconstruct the skin beneath it.",
      "Preserve the person's exact features, identity, expression, hair, makeup and skin texture — no beautifying, no smoothing, no reshaping.",
      "Match the existing lighting direction, colour temperature and grain where the mark was.",
      "Do not add text, borders, vignettes or new elements. Return only the cleaned portrait.",
    ].join("\n\n"),
  },
  {
    id: "product",
    label: "Product / e-commerce",
    hint: "Packaging, labels, studio shots",
    prompt: [
      "Remove the watermark, price tag or logo overlay from this product photo.",
      "Reconstruct the surface it covered — same material, reflections, edges, typography of the actual packaging, and shadow shape.",
      "Keep the product geometry, colour and perspective identical. Do not invent alternative branding or text.",
      "Return only the cleaned product photo.",
    ].join("\n\n"),
  },
  {
    id: "document",
    label: "Document / scan",
    hint: "Stamps, watermarked PDFs",
    prompt: [
      "Remove the watermark, stamp or diagonal overlay from this scan of a document.",
      "Keep all real content legible and unchanged: printed text, handwriting, signatures, seals and paper texture.",
      "Continue the paper and text underneath the mark; do not blur the page or leave smudges.",
      "Return a flat, straight-on scan with the same crop.",
    ].join("\n\n"),
  },
];

export const OUTPUT_FORMATS: Array<{ value: OutputFormat; label: string; hint: string }> = [
  { value: "png", label: "PNG", hint: "Lossless, larger file" },
  { value: "jpeg", label: "JPG", hint: "Smaller, photo friendly" },
  { value: "webp", label: "WebP", hint: "Small and sharp" },
];

export const ASPECT_ORDER = [
  "1:1",
  "4:3",
  "3:2",
  "16:9",
  "21:9",
  "4:5",
  "2:3",
  "9:16",
  "5:4",
  "3:4",
  "1:2",
  "2:1",
];

export function sortRatios(ratios: string[]): string[] {
  const known = ASPECT_ORDER.filter((ratio) => ratios.includes(ratio));
  const extra = ratios.filter((ratio) => !ASPECT_ORDER.includes(ratio) && ratio !== "auto");
  return [...known, ...extra];
}
