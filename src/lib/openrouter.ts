import type { KeyInfo, ModelCapabilities, ModelInfo, OutputFormat } from "@/types";
import { vendorLabel } from "@/lib/utils";
import { blobToDataUrl, dataUrlToBlob, decodeBase64Image } from "@/lib/image";

export const API_BASE = "https://openrouter.ai/api/v1";
export const IMAGES_URL = `${API_BASE}/images`;
export const MODELS_URL = `${API_BASE}/images/models`;
export const MODELS_PAGE = "https://openrouter.ai/models?fmt=cards&input_modalities=image&output_modalities=image";

const CACHE_KEY = "unmark:models:v3";
const CACHE_TTL = 1000 * 60 * 60 * 12;

/** Offline-safe catalog: used when discovery is unavailable (or still loading). */
export const FALLBACK_MODELS: ModelInfo[] = [
  {
    id: "google/gemini-nano-banana-2.1",
    name: "Google: Nano Banana 2.1",
    vendor: "Google",
    maxRefs: 14,
    resolutions: ["1K", "2K", "4K"],
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "4:5", "5:4", "21:9"],
  },
  {
    id: "bytedance-seed/seedream-5-5",
    name: "ByteDance: Seedream 5.5",
    vendor: "ByteDance",
    maxRefs: 10,
    resolutions: ["1K", "1.5K", "2K"],
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "4:5", "5:4", "21:9"],
  },
  {
    id: "openai/gpt-image-2.6-sunburst",
    name: "OpenAI: GPT Image 2.6 Sunburst",
    vendor: "OpenAI",
    maxRefs: 16,
    resolutions: [],
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "5:4", "4:5"],
  },
  {
    id: "minimax/minimax-h3-image",
    name: "MiniMax: H3 Image",
    vendor: "MiniMax",
    maxRefs: 16,
    resolutions: ["1K", "2K", "4K"],
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "4:5", "5:4", "21:9"],
  },
  {
    id: "black-forest-labs/flux-3-image",
    name: "Black Forest Labs: FLUX 3 Image",
    vendor: "Black Forest Labs",
    maxRefs: 10,
    resolutions: ["768", "1K", "1.5K", "2K", "4K"],
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "4:5", "5:4", "21:9"],
  },
  {
    id: "qwen/qwen-image-2.1-pro",
    name: "Qwen: Image 2.1 Pro",
    vendor: "Qwen",
    maxRefs: 10,
    resolutions: ["1K", "2K"],
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "4:5", "5:4"],
  },
  {
    id: "krea/k3-edit",
    name: "Krea: K3 Edit",
    vendor: "Krea",
    maxRefs: 8,
    resolutions: ["1K", "2K"],
    ratios: ["1:1", "4:3", "3:2", "16:9", "4:5", "2:3", "9:16"],
  },
  {
    id: "microsoft/mai-image-2.7",
    name: "Microsoft: MAI-Image-2.7",
    vendor: "Microsoft",
    maxRefs: 5,
    resolutions: [],
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16"],
  },
];

export class OpenRouterError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.code = code;
  }
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://unmark.studio",
    "X-Title": "Unmark Studio",
  };
}

function friendlyError(status: number, message?: string): string {
  const detail = (message || "").replace(/^openrouter\.ai:\s*/i, "").trim();
  if (status === 401) return "That API key was rejected. Check it in OpenRouter → Keys, then save it again.";
  if (status === 402) return "OpenRouter says this key has no credits left. Add credits and try again.";
  if (status === 403) return "This key is not allowed to use that model. OpenRouter privacy settings can also block image models.";
  if (status === 404) return "The selected model could not be found. Pick a different one.";
  if (status === 413) return "The upload was too large for the model. Try a smaller image.";
  if (status === 429) return "Rate limited by OpenRouter. Wait a moment, then retry the image.";
  if (status === 502) return detail || "The model failed or was cancelled. You were not charged — try again.";
  if (status >= 500) return detail || "OpenRouter had a server error. Try again in a moment.";
  if (detail) return detail;
  return `Request failed (${status}).`;
}

async function readError(response: Response): Promise<OpenRouterError> {
  let message: string | undefined;
  let code: string | undefined;
  try {
    const payload = (await response.json()) as { error?: { message?: string; code?: string | number } | string };
    if (typeof payload.error === "string") message = payload.error;
    else if (payload.error) {
      message = payload.error.message;
      code = payload.error.code !== undefined ? String(payload.error.code) : undefined;
    }
  } catch {
    try {
      message = (await response.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
  }
  return new OpenRouterError(friendlyError(response.status, message), response.status, code);
}

type RawModel = {
  id: string;
  name?: string;
  created?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  endpoints?: string;
  supported_parameters?: Record<string, unknown>;
};

type RawEndpoint = {
  supported_parameters?: {
    resolution?: { values?: string[] };
    aspect_ratio?: { values?: string[] };
    input_references?: { max?: number };
  };
};

async function endpointsFor(modelId: string): Promise<ModelCapabilities | null> {
  try {
    const response = await fetch(`${MODELS_URL}/${modelId}/endpoints`);
    if (!response.ok) return null;
    const payload = (await response.json()) as { endpoints?: RawEndpoint[] };
    const endpoints = payload.endpoints ?? [];
    if (!endpoints.length) return null;
    const resolutions = new Set<string>();
    const ratios = new Set<string>();
    let maxRefs = 0;
    for (const endpoint of endpoints) {
      const params = endpoint.supported_parameters ?? {};
      params.resolution?.values?.forEach((value) => resolutions.add(value));
      params.aspect_ratio?.values?.forEach((value) => ratios.add(value));
      maxRefs = Math.max(maxRefs, params.input_references?.max ?? 0);
    }
    return { resolutions: [...resolutions], ratios: [...ratios], maxRefs };
  } catch {
    return null;
  }
}

async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface DiscoveryResult {
  models: ModelInfo[];
  fetchedAt: number;
  live: boolean;
}

export async function discoverModels(force = false): Promise<DiscoveryResult> {
  if (!force) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as DiscoveryResult;
        if (parsed.models?.length && Date.now() - parsed.fetchedAt < CACHE_TTL) return parsed;
      }
    } catch {
      /* ignore cache problems */
    }
  }

  try {
    const response = await fetch(MODELS_URL);
    if (!response.ok) throw new Error(`models ${response.status}`);
    const payload = (await response.json()) as { data?: RawModel[] };
    const candidates = (payload.data ?? []).filter((model) => {
      const mods = model.architecture;
      return mods?.input_modalities?.includes("image") && mods?.output_modalities?.includes("image");
    });
    candidates.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    const shortlist = candidates.slice(0, 28);

    const models = await pool(shortlist, 6, async (model) => {
      const caps = await endpointsFor(model.id);
      const fallback = FALLBACK_MODELS.find((entry) => entry.id === model.id);
      return {
        id: model.id,
        name: model.name ?? model.id,
        vendor: vendorLabel(model.id),
        resolutions: caps?.resolutions.length ? caps.resolutions : (fallback?.resolutions ?? []),
        ratios: caps?.ratios.length ? caps.ratios : (fallback?.ratios ?? []),
        maxRefs: caps?.maxRefs ?? fallback?.maxRefs ?? 4,
      } satisfies ModelInfo;
    });

    const known = new Set(models.map((model) => model.id));
    const result: DiscoveryResult = {
      models: [...models, ...FALLBACK_MODELS.filter((model) => !known.has(model.id))],
      fetchedAt: Date.now(),
      live: true,
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {
      /* quota */
    }
    return result;
  } catch {
    return { models: FALLBACK_MODELS, fetchedAt: 0, live: false };
  }
}

export async function fetchCapabilities(modelId: string): Promise<ModelCapabilities | null> {
  return endpointsFor(modelId);
}

export async function testApiKey(apiKey: string): Promise<KeyInfo> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/key`, { headers: authHeaders(apiKey) });
  } catch {
    throw new OpenRouterError("Could not reach OpenRouter. Check your connection (or any browser extension blocking it).");
  }
  if (!response.ok) throw await readError(response);
  const payload = (await response.json()) as {
    data?: { label?: string; usage?: number; limit?: number | null; is_free_tier?: boolean };
  };
  return {
    label: payload.data?.label,
    usage: payload.data?.usage,
    limit: payload.data?.limit ?? null,
    isFreeTier: payload.data?.is_free_tier,
  };
}

export interface GenerateParams {
  apiKey: string;
  model: string;
  prompt: string;
  source: Blob;
  references?: Blob[];
  aspectRatio?: string | null;
  resolution?: string | null;
  outputFormat: OutputFormat;
  maxRefs?: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  blob: Blob;
  cost?: number;
}

const GENERATION_TIMEOUT = 1000 * 60 * 5;

export async function generateImage(params: GenerateParams): Promise<GenerateResult> {
  const { apiKey, model, prompt, source, references = [], aspectRatio, resolution, outputFormat } = params;
  if (!apiKey) throw new OpenRouterError("Add your OpenRouter API key first.");

  const sourceUrl = await blobToDataUrl(source);
  const refs = references.slice(0, Math.max(0, params.maxRefs ?? references.length));
  const referenceUrls = await Promise.all(refs.map((blob) => blobToDataUrl(blob)));

  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    output_format: outputFormat,
    input_references: [{ type: "image_url", image_url: { url: sourceUrl } }, ...referenceUrls.map((url) => ({ type: "image_url", image_url: { url } }))],
  };
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (resolution) body.resolution = resolution;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("Generation timed out", "TimeoutError")), GENERATION_TIMEOUT);
  const forwardAbort = () => controller.abort(new DOMException("Cancelled", "AbortError"));
  params.signal?.addEventListener("abort", forwardAbort);

  let response: Response;
  try {
    response = await fetch(IMAGES_URL, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (params.signal?.aborted) throw new OpenRouterError("Generation cancelled.");
    if (controller.signal.aborted) throw new OpenRouterError("The model took longer than 5 minutes. Try a smaller resolution.");
    const message = error instanceof Error ? error.message : "network error";
    throw new OpenRouterError(`Could not reach OpenRouter (${message}). Check your connection and retry.`);
  } finally {
    clearTimeout(timeout);
    params.signal?.removeEventListener("abort", forwardAbort);
  }

  if (!response.ok) throw await readError(response);

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string; media_type?: string }>;
    usage?: { cost?: number };
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };

  const first = payload.data?.[0];
  let blob: Blob | null = null;
  if (first?.b64_json) {
    blob = await decodeBase64Image(first.b64_json, first.media_type || `image/${outputFormat}`);
  } else if (first?.url) {
    const imageResponse = await fetch(first.url);
    if (!imageResponse.ok) throw new OpenRouterError("The model returned an image URL that could not be downloaded.");
    blob = await imageResponse.blob();
  } else if (payload.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
    blob = dataUrlToBlob(payload.choices[0].message.images[0].image_url.url, `image/${outputFormat}`);
  }

  if (!blob) throw new OpenRouterError("The model returned no image. Try a different model or prompt.");
  return { blob, cost: payload.usage?.cost };
}
