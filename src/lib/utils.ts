import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let counter = 0;

/** Safe unique id: crypto.randomUUID() throws on insecure (http) origins. */
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${counter.toString(36)}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value >= 10 || exp === 0 ? Math.round(value) : value.toFixed(1)} ${units[exp]}`;
}

export function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return "";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

export function formatCost(cost?: number): string {
  if (cost === undefined || Number.isNaN(cost)) return "";
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function truncateMiddle(name: string, max = 26): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  const keep = Math.max(6, max - ext.length - 1);
  return `${base.slice(0, keep)}…${ext}`;
}

export function filenameFor(name: string, format: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = format === "jpeg" ? "jpg" : format;
  return `${base}-unmark.${ext}`;
}

export function vendorLabel(id: string): string {
  const vendor = id.split("/")[0] ?? id;
  const map: Record<string, string> = {
    google: "Google",
    openai: "OpenAI",
    "black-forest-labs": "Black Forest Labs",
    "bytedance-seed": "ByteDance",
    minimax: "MiniMax",
    microsoft: "Microsoft",
    qwen: "Qwen",
    krea: "Krea",
    sourceful: "Sourceful",
    tencent: "Tencent",
    recraft: "Recraft",
    ideogram: "Ideogram",
    "x-ai": "xAI",
  };
  return map[vendor] ?? vendor.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
