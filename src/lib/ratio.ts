export type Ratio = { value: string; w: number; h: number };

const SPECIAL: Record<string, [number, number]> = {
  auto: [0, 0],
};

/** Parse "16:9" (also "4:5", "2.35:1", "9:19.5") into numbers. */
export function parseRatio(value: string): [number, number] | null {
  if (!value || value === "auto") return null;
  const special = SPECIAL[value];
  if (special) return special[0] && special[1] ? special : null;
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return [w, h];
}

export function ratioValue(value: string): number | null {
  const parsed = parseRatio(value);
  if (!parsed) return null;
  return parsed[0] / parsed[1];
}

/** Pick the supported ratio whose shape is closest (in log space) to the source image. */
export function closestRatio(width: number, height: number, ratios: string[]): string | null {
  if (!width || !height) return null;
  const target = Math.log(width / height);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const ratio of ratios) {
    const value = ratioValue(ratio);
    if (!value) continue;
    const score = Math.abs(Math.log(value) - target);
    if (score < bestScore) {
      best = ratio;
      bestScore = score;
    }
  }
  return best;
}

export function orientationOf(value: string): "square" | "portrait" | "landscape" | "auto" {
  const value_ = ratioValue(value);
  if (!value_) return "auto";
  if (Math.abs(value_ - 1) < 0.02) return "square";
  return value_ < 1 ? "portrait" : "landscape";
}

/** Human-friendly ratio label, e.g. "3:2" or "1.85:1". */
export function ratioLabel(value: string): string {
  if (!value || value === "auto") return "Auto";
  return value;
}

/** Rough percentage difference between two aspect ratios. */
export function ratioDeltaLabel(sourceW: number, sourceH: number, value: string): string {
  const ratio = ratioValue(value);
  if (!ratio || !sourceW || !sourceH) return "";
  const source = sourceW / sourceH;
  const delta = Math.abs(ratio / source - 1) * 100;
  if (delta < 0.5) return "exact match";
  return `${delta < 10 ? delta.toFixed(1) : Math.round(delta)}% off`;
}
