const MAX_PAYLOAD_SIDE = 2048;
const MAX_PAYLOAD_BYTES = 3_200_000;

export class ImageError extends Error {}

export async function loadImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImageError(
      "This file could not be decoded. Try a JPG, PNG or WebP image (HEIC files from iPhone need converting first).",
    );
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageError("Could not encode the image."))),
      type,
      quality,
    );
  });
}

/** Downscale to a small preview used in grids, keeping memory low. */
export async function makeThumbnail(bitmap: ImageBitmap, maxSide = 600): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Canvas is unavailable in this browser.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  try {
    return await canvasToBlob(canvas, "image/webp", 0.82);
  } catch {
    return canvasToBlob(canvas, "image/jpeg", 0.82);
  }
}

/**
 * Build the image we actually send to the model: capped at 2048px on the long
 * edge and re-encoded so the base64 payload stays far from request limits.
 */
export async function prepareForApi(blob: Blob, maxSide = MAX_PAYLOAD_SIDE): Promise<Blob> {
  const bitmap = await loadImage(blob);
  const needsResize = Math.max(bitmap.width, bitmap.height) > maxSide;
  const needsReencode = blob.size > MAX_PAYLOAD_BYTES || !/^image\/(png|jpeg|webp)$/.test(blob.type);
  if (!needsResize && !needsReencode) {
    bitmap.close?.();
    return blob;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Canvas is unavailable in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvasToBlob(canvas, "image/jpeg", 0.94);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageError("Could not read the image file."));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string, fallbackType: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new ImageError("The model returned an unreadable image.");
  const type = match[1] || fallbackType;
  const isBase64 = !!match[2];
  if (!isBase64) return new Blob([decodeURIComponent(match[3])], { type });
  const binary = atob(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function decodeBase64Image(base64: string, mediaType = "image/png"): Promise<Blob> {
  if (base64.startsWith("data:")) return dataUrlToBlob(base64, mediaType);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mediaType });
}

export async function dimensionsOf(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await loadImage(blob);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return dims;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_FILE_BYTES = 24 * 1024 * 1024;

export function isAcceptedImage(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/svg+xml" && file.type !== "image/gif";
}
