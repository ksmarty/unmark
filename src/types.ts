export type JobStatus = "idle" | "queued" | "running" | "done" | "error";

export interface Job {
  id: string;
  name: string;
  width: number;
  height: number;
  size: number;
  status: JobStatus;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  resultWidth?: number;
  resultHeight?: number;
  resultType?: string;
  usedPrompt?: string;
  usedModel?: string;
  usedRatio?: string;
  usedResolution?: string;
  cost?: number;
  /** True for the bundled sample batch loaded by demo mode. */
  demo?: boolean;
}

export interface RefImage {
  id: string;
  name: string;
  width: number;
  height: number;
}

export type OutputFormat = "png" | "jpeg" | "webp";

export interface Settings {
  apiKey: string;
  model: string;
  resolution: string;
  aspect: string;
  outputFormat: OutputFormat;
  prompt: string;
  useReferences: boolean;
  keyLabel?: string;
  /** Set while the bundled sample batch is on screen. */
  demo?: boolean;
}

export interface ModelCapabilities {
  resolutions: string[];
  ratios: string[];
  maxRefs: number;
}

export interface ModelInfo extends ModelCapabilities {
  id: string;
  name: string;
  vendor: string;
}

export interface KeyInfo {
  label?: string;
  usage?: number;
  limit?: number | null;
  isFreeTier?: boolean;
}

export interface PersistedMeta {
  version: 2;
  jobs: Job[];
  refs: RefImage[];
}
