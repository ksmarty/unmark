import { create } from "zustand";
import { toast } from "sonner";
import type { Job, KeyInfo, ModelInfo, PersistedMeta, RefImage, Settings } from "@/types";
import { DEFAULT_PROMPT, REFERENCE_SUFFIX } from "@/lib/presets";
import { deleteJobBlobs, deleteBlob, getBlob, putBlob, requestPersistence } from "@/lib/db";
import {
  ImageError,
  dimensionsOf,
  isAcceptedImage,
  loadImage,
  makeThumbnail,
  MAX_FILE_BYTES,
  prepareForApi,
} from "@/lib/image";
import { closestRatio } from "@/lib/ratio";
import { DEMO_MODEL, DEMO_REFERENCE, DEMO_SCENES, demoAsset } from "@/lib/demo";
import { discoverModels, fetchCapabilities, generateImage, testApiKey, FALLBACK_MODELS, OpenRouterError } from "@/lib/openrouter";
import { formatBytes, truncateMiddle, uid } from "@/lib/utils";

const SETTINGS_KEY = "unmark:settings:v1";
const META_KEY = "unmark:meta:v2";
const CONCURRENCY = 2;
const MAX_REFS = 8;

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "google/gemini-nano-banana-2.1",
  resolution: "2K",
  aspect: "auto",
  outputFormat: "png",
  prompt: DEFAULT_PROMPT,
  useReferences: true,
};

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota errors */
  }
}

interface StoreState {
  hydrated: boolean;
  jobs: Job[];
  refs: RefImage[];
  urls: Record<string, string>;
  settings: Settings;
  models: ModelInfo[];
  modelsLive: boolean;
  modelsLoading: boolean;
  keyInfo?: KeyInfo;
  keyChecking: boolean;
  compareId: string | null;
  settingsOpen: boolean;
  keyDialogOpen: boolean;
  importing: number;

  hydrate: () => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => void;
  saveApiKey: (key: string) => Promise<KeyInfo>;
  refreshKeyInfo: () => Promise<void>;
  refreshModels: (force?: boolean) => Promise<void>;
  addFiles: (files: File[]) => Promise<void>;
  addReferences: (files: File[]) => Promise<void>;
  removeReference: (id: string) => Promise<void>;
  removeJob: (id: string) => Promise<void>;
  clearFinished: () => Promise<void>;
  runAll: () => Promise<void>;
  runJob: (id: string) => Promise<void>;
  cancelJob: (id: string) => void;
  openCompare: (id: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setKeyDialogOpen: (open: boolean) => void;
  patchJob: (id: string, patch: Partial<Job>) => void;
  loadDemo: () => Promise<void>;
  exitDemo: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const controllers = new Map<string, AbortController>();
let pumping = false;
let activeCount = 0;

function revoke(url?: string) {
  if (url) URL.revokeObjectURL(url);
}

function persistMeta(jobs: Job[], refs: RefImage[]) {
  try {
    const payload: PersistedMeta = { version: 2, jobs, refs };
    localStorage.setItem(META_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
}

export const useStore = create<StoreState>((set, get) => ({
  hydrated: false,
  jobs: [],
  refs: [],
  urls: {},
  settings: readSettings(),
  models: FALLBACK_MODELS,
  modelsLive: false,
  modelsLoading: false,
  keyInfo: undefined,
  keyChecking: false,
  compareId: null,
  settingsOpen: false,
  keyDialogOpen: false,
  importing: 0,

  hydrate: async () => {
    const settings = readSettings();
    let stored: PersistedMeta | null = null;
    try {
      const raw = localStorage.getItem(META_KEY);
      if (raw) stored = JSON.parse(raw) as PersistedMeta;
    } catch {
      stored = null;
    }

    const urls: Record<string, string> = {};
    const jobs: Job[] = [];
    for (const job of stored?.jobs ?? []) {
      const source = await getBlob(`src:${job.id}`);
      if (!source) continue;
      const thumb = await getBlob(`thumb:${job.id}`);
      urls[`src:${job.id}`] = URL.createObjectURL(source);
      if (thumb) urls[`thumb:${job.id}`] = URL.createObjectURL(thumb);
      const result = await getBlob(`res:${job.id}`);
      if (result && job.status === "done") urls[`res:${job.id}`] = URL.createObjectURL(result);
      jobs.push({
        ...job,
        status: job.status === "done" && result ? "done" : job.status === "error" ? "error" : "idle",
        startedAt: undefined,
      });
    }

    const refs: RefImage[] = [];
    for (const ref of stored?.refs ?? []) {
      const thumb = await getBlob(`ref:${ref.id}`);
      if (!thumb) continue;
      urls[`ref:${ref.id}`] = URL.createObjectURL(thumb);
      refs.push(ref);
    }

    set({ hydrated: true, settings, jobs, refs, urls });
    persistMeta(jobs, refs);
    void requestPersistence();
    void get().refreshModels();
    if (settings.apiKey) void get().refreshKeyInfo();
  },

  saveSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    writeSettings(next);
    set({ settings: next });
  },

  saveApiKey: async (key) => {
    const trimmed = key.trim();
    if (!trimmed) {
      get().saveSettings({ apiKey: "", keyLabel: undefined });
      set({ keyInfo: undefined });
      return {};
    }
    set({ keyChecking: true });
    const trimmedKey = trimmed.replace(/^Bearer\s+/i, "");
    try {
      const info = await testApiKey(trimmedKey);
      const updated = { ...get().settings, apiKey: trimmedKey, keyLabel: info.label };
      writeSettings(updated);
      set({ settings: updated, keyInfo: info });
      toast.success("API key verified", { description: info.label ? `Key “${info.label}” is ready.` : "You're ready to remove watermarks." });
      return info;
    } catch (error) {
      const message = error instanceof OpenRouterError ? error.message : "Could not verify that key.";
      toast.error("Key check failed", { description: message });
      throw error;
    } finally {
      set({ keyChecking: false });
    }
  },

  refreshKeyInfo: async () => {
    const key = get().settings.apiKey;
    if (!key) return;
    set({ keyChecking: true });
    try {
      const info = await testApiKey(key);
      set({ keyInfo: info });
    } catch (error) {
      const message = error instanceof OpenRouterError ? error.message : "Key check failed.";
      if (error instanceof OpenRouterError && error.status === 401) {
        toast.error("Saved API key was rejected", { id: "key-rejected", description: message });
      }
    } finally {
      set({ keyChecking: false });
    }
  },

  refreshModels: async (force = false) => {
    if (get().modelsLoading) return;
    set({ modelsLoading: true });
    try {
      const result = await discoverModels(force);
      const current = get().settings.model;
      const exists = result.models.some((model) => model.id === current);
      set({ models: result.models, modelsLive: result.live, modelsLoading: false });
      if (!exists) {
        const fallback = result.models[0]?.id ?? DEFAULT_SETTINGS.model;
        get().saveSettings({ model: fallback });
      }
    } catch {
      set({ modelsLoading: false });
    }
  },

  addFiles: async (files) => {
    const valid = files.filter((file) => {
      if (!isAcceptedImage(file) || file.type === "application/pdf") {
        toast.error(`${truncateMiddle(file.name, 30)} is not a supported image`, {
          description: "Use JPG, PNG, WebP or AVIF.",
        });
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${truncateMiddle(file.name, 30)} is too large`, {
          description: `Keep uploads under ${formatBytes(MAX_FILE_BYTES)}.`,
        });
        return false;
      }
      return true;
    });
    if (!valid.length) return;

    set({ importing: get().importing + valid.length });
    const addedIds: string[] = [];
    const existing = get().jobs;

    for (const file of valid) {
      const duplicate = existing.some((job) => job.name === file.name && job.size === file.size);
      if (duplicate) {
        toast.info(`${truncateMiddle(file.name, 30)} is already in the list`);
        set({ importing: Math.max(0, get().importing - 1) });
        continue;
      }
      try {
        const bitmap = await loadImage(file);
        const width = bitmap.width;
        const height = bitmap.height;
        const thumb = await makeThumbnail(bitmap);
        bitmap.close?.();

        const id = uid("job");
        await putBlob(`src:${id}`, file);
        await putBlob(`thumb:${id}`, thumb);

        const job: Job = {
          id,
          name: file.name,
          width,
          height,
          size: file.size,
          status: "idle",
          createdAt: Date.now(),
        };
        const srcUrl = URL.createObjectURL(file);
        const thumbUrl = URL.createObjectURL(thumb);
        const jobs = [job, ...get().jobs];
        set({ jobs, urls: { ...get().urls, [`src:${id}`]: srcUrl, [`thumb:${id}`]: thumbUrl } });
        persistMeta(jobs, get().refs);
        addedIds.push(id);
      } catch (error) {
        toast.error(`Could not read ${truncateMiddle(file.name, 30)}`, {
          description: error instanceof ImageError ? error.message : "Unknown decoding error.",
        });
      } finally {
        set({ importing: Math.max(0, get().importing - 1) });
      }
    }

    if (addedIds.length) {
      toast.success(`${addedIds.length} image${addedIds.length > 1 ? "s" : ""} ready`, {
        description: get().settings.apiKey ? "Set your options, then remove watermarks." : "Add an OpenRouter API key to start.",
      });
    }
  },

  addReferences: async (files) => {
    const room = MAX_REFS - get().refs.length;
    if (room <= 0) {
      toast.info(`Reference limit reached (${MAX_REFS})`, { description: "Remove one to add another." });
      return;
    }
    const valid = files.filter((file) => isAcceptedImage(file)).slice(0, room);
    if (!valid.length) return;

    for (const file of valid) {
      if (get().refs.some((ref) => ref.name === file.name)) {
        toast.info(`${truncateMiddle(file.name, 26)} is already a reference`);
        continue;
      }
      try {
        const bitmap = await loadImage(file);
        const thumb = await makeThumbnail(bitmap, 480);
        const ref: RefImage = { id: uid("ref"), name: file.name, width: bitmap.width, height: bitmap.height };
        bitmap.close?.();
        await putBlob(`ref:${ref.id}`, thumb);
        const url = URL.createObjectURL(thumb);
        const refs = [...get().refs, ref];
        set({ refs, urls: { ...get().urls, [`ref:${ref.id}`]: url } });
        persistMeta(get().jobs, refs);
      } catch (error) {
        toast.error(`Could not read ${truncateMiddle(file.name, 26)}`, {
          description: error instanceof ImageError ? error.message : "Unknown decoding error.",
        });
      }
    }
  },

  removeReference: async (id) => {
    revoke(get().urls[`ref:${id}`]);
    await deleteBlob(`ref:${id}`);
    const refs = get().refs.filter((ref) => ref.id !== id);
    const urls = { ...get().urls };
    delete urls[`ref:${id}`];
    set({ refs, urls });
    persistMeta(get().jobs, refs);
  },

  removeJob: async (id) => {
    const job = get().jobs.find((entry) => entry.id === id);
    if (job?.status === "running") get().cancelJob(id);
    revoke(get().urls[`src:${id}`]);
    revoke(get().urls[`thumb:${id}`]);
    revoke(get().urls[`res:${id}`]);
    const urls = { ...get().urls };
    delete urls[`src:${id}`];
    delete urls[`thumb:${id}`];
    delete urls[`res:${id}`];
    const jobs = get().jobs.filter((entry) => entry.id !== id);
    set({ jobs, urls, compareId: get().compareId === id ? null : get().compareId });
    persistMeta(jobs, get().refs);
    await deleteJobBlobs(id);
  },

  clearFinished: async () => {
    const keep: Job[] = [];
    for (const job of get().jobs) {
      if (job.status === "done") {
        revoke(get().urls[`src:${job.id}`]);
        revoke(get().urls[`thumb:${job.id}`]);
        revoke(get().urls[`res:${job.id}`]);
        await deleteJobBlobs(job.id);
      } else {
        keep.push(job);
      }
    }
    const urls = { ...get().urls };
    for (const key of Object.keys(urls)) {
      const [, keyId] = key.split(":");
      if (!keep.some((job) => job.id === keyId)) {
        revoke(urls[key]);
        delete urls[key];
      }
    }
    set({ jobs: keep, urls });
    persistMeta(keep, get().refs);
  },

  runAll: async () => {
    const { settings, jobs } = get();
    if (!settings.apiKey) {
      set({ keyDialogOpen: true });
      toast.info("Add your OpenRouter API key to start");
      return;
    }
    const targets = jobs.filter((job) => job.status === "idle" || job.status === "error").map((job) => job.id);
    if (!targets.length) {
      toast.info("Nothing left to process", { description: "Add more images or reset a finished one." });
      return;
    }
    const queued = get().jobs.map((job) =>
      targets.includes(job.id) ? { ...job, status: "queued" as const, error: undefined } : job,
    );
    set({ jobs: queued });
    persistMeta(queued, get().refs);
    toast.message(`Queued ${targets.length} image${targets.length > 1 ? "s" : ""}`, {
      description: `${get().settings.model.split("/").pop()} · ${get().settings.resolution} · ${get().settings.aspect === "auto" ? "auto ratio" : get().settings.aspect}`,
    });
    void pump();
  },

  runJob: async (id) => {
    const { settings, jobs } = get();
    if (!settings.apiKey) {
      set({ keyDialogOpen: true });
      return;
    }
    if (!jobs.some((job) => job.id === id)) return;
    set({ jobs: get().jobs.map((job) => (job.id === id ? { ...job, status: "queued", error: undefined } : job)) });
    void pump();
  },

  cancelJob: (id) => {
    const controller = controllers.get(id);
    if (controller) {
      controller.abort();
      return;
    }
    const job = get().jobs.find((entry) => entry.id === id);
    if (job?.status === "queued") {
      get().patchJob(id, { status: "idle" });
    }
  },

  openCompare: (id) => set({ compareId: id }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setKeyDialogOpen: (open) => set({ keyDialogOpen: open }),

  patchJob: (id, patch) => {
    const jobs = get().jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
    set({ jobs });
    persistMeta(jobs, get().refs);
  },

  /** Load the bundled sample batch so the app can be explored without a key. */
  loadDemo: async () => {
    if (get().importing) return;
    const existing = get().jobs.filter((job) => job.demo);
    if (existing.length) {
      const done = existing.find((job) => job.status === "done");
      if (done) set({ compareId: done.id });
      toast.info("Demo batch is already loaded");
      return;
    }

    set({ importing: 1 });
    try {
      const jobs: Job[] = [];
      const urls: Record<string, string> = {};

      for (const scene of DEMO_SCENES) {
        const [beforeResponse, afterResponse] = await Promise.all([
          fetch(demoAsset(scene.before)),
          fetch(demoAsset(scene.after)),
        ]);
        if (!beforeResponse.ok || !afterResponse.ok) throw new Error("Sample images are missing from this build.");

        const before = await beforeResponse.blob();
        const after = await afterResponse.blob();
        const beforeBitmap = await loadImage(before);
        const afterBitmap = await loadImage(after);
        const thumb = await makeThumbnail(beforeBitmap);
        const id = uid("job");

        await putBlob(`src:${id}`, before);
        await putBlob(`thumb:${id}`, thumb);
        await putBlob(`res:${id}`, after);

        urls[`src:${id}`] = URL.createObjectURL(before);
        urls[`thumb:${id}`] = URL.createObjectURL(thumb);
        urls[`res:${id}`] = URL.createObjectURL(after);

        jobs.push({
          id,
          name: scene.name,
          width: beforeBitmap.width,
          height: beforeBitmap.height,
          size: before.size,
          status: "done",
          createdAt: Date.now(),
          finishedAt: Date.now(),
          resultWidth: afterBitmap.width,
          resultHeight: afterBitmap.height,
          resultType: after.type,
          usedPrompt: get().settings.prompt,
          usedModel: DEMO_MODEL,
          usedRatio: scene.ratio,
          usedResolution: scene.resolution,
          cost: scene.cost,
          demo: true,
        });

        beforeBitmap.close?.();
        afterBitmap.close?.();
      }

      const refs = [...get().refs];
      if (!refs.some((ref) => ref.name === DEMO_REFERENCE.name)) {
        const refResponse = await fetch(demoAsset(DEMO_REFERENCE.file));
        if (refResponse.ok) {
          const blob = await refResponse.blob();
          const bitmap = await loadImage(blob);
          const thumb = await makeThumbnail(bitmap, 480);
          const ref: RefImage = {
            id: uid("ref"),
            name: DEMO_REFERENCE.name,
            width: bitmap.width,
            height: bitmap.height,
          };
          bitmap.close?.();
          await putBlob(`ref:${ref.id}`, thumb);
          urls[`ref:${ref.id}`] = URL.createObjectURL(thumb);
          refs.push(ref);
        }
      }

      const all = [...jobs, ...get().jobs];
      get().saveSettings({ demo: true });
      set({ jobs: all, refs, urls: { ...get().urls, ...urls } });
      persistMeta(all, refs);
      toast.success("Demo batch loaded", {
        description: "Sample photos with ready-made results. No API key was used.",
      });
    } catch (error) {
      toast.error("Could not load the demo", {
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    } finally {
      set({ importing: 0 });
    }
  },

  /** Drop only the demo batch, leaving real work untouched. */
  exitDemo: async () => {
    const demoJobs = get().jobs.filter((job) => job.demo);
    const demoRefs = get().refs.filter((ref) => ref.name === DEMO_REFERENCE.name);
    const urls = { ...get().urls };
    for (const job of demoJobs) {
      for (const prefix of ["src", "thumb", "res"]) {
        revoke(urls[`${prefix}:${job.id}`]);
        delete urls[`${prefix}:${job.id}`];
      }
    }
    for (const ref of demoRefs) {
      revoke(urls[`ref:${ref.id}`]);
      delete urls[`ref:${ref.id}`];
    }
    const jobs = get().jobs.filter((job) => !job.demo);
    const refs = get().refs.filter((ref) => ref.name !== DEMO_REFERENCE.name);
    set({ jobs, refs, urls, compareId: null });
    persistMeta(jobs, refs);
    get().saveSettings({ demo: false });
    await Promise.all([
      ...demoJobs.map((job) => deleteJobBlobs(job.id)),
      ...demoRefs.map((ref) => deleteBlob(`ref:${ref.id}`)),
    ]);
    toast.info("Demo closed", { description: "Your own images and settings are untouched." });
  },

  /** Wipe every trace of this browser's work: settings, jobs, references, blobs. */
  resetAll: async () => {
    for (const url of Object.values(get().urls)) URL.revokeObjectURL(url);
    const ids = new Set([...get().jobs.map((job) => job.id), ...get().refs.map((ref) => ref.id)]);
    await Promise.all(
      [...ids].flatMap((id) => [deleteJobBlobs(id), deleteBlob(`ref:${id}`)]),
    );
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(META_KEY);
    } catch {
      /* ignore */
    }
    set({ jobs: [], refs: [], urls: {}, compareId: null, keyInfo: undefined, hydrated: true });
    location.reload();
  },
}));

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    for (;;) {
      const state = useStore.getState();
      if (activeCount >= CONCURRENCY) break;
      const next = state.jobs.find((job) => job.status === "queued");
      if (!next) break;
      activeCount += 1;
      void executeJob(next.id).finally(() => {
        activeCount -= 1;
        void pump();
      });
    }
  } finally {
    pumping = false;
  }
}

async function executeJob(id: string) {
  const store = useStore.getState;
  const job = store().jobs.find((entry) => entry.id === id);
  if (!job) return;
  const settings = store().settings;
  const caps = store().models.find((model) => model.id === settings.model) ?? FALLBACK_MODELS[0];

  const controller = new AbortController();
  controllers.set(id, controller);
  store().patchJob(id, { status: "running", startedAt: Date.now(), error: undefined });

  try {
    const source = await getBlob(`src:${id}`);
    if (!source) throw new ImageError("The original image is missing from storage. Re-upload it.");

    let references: Blob[] = [];
    if (settings.useReferences && store().refs.length) {
      const room = Math.max(0, caps.maxRefs - 1);
      const wanted = store().refs.slice(0, room);
      const blobs = await Promise.all(wanted.map((ref) => getBlob(`ref:${ref.id}`)));
      references = blobs.filter((blob): blob is Blob => !!blob);
    }

    const aspect = !caps.ratios.length
      ? null
      : settings.aspect === "auto" || !caps.ratios.includes(settings.aspect)
        ? closestRatio(job.width, job.height, caps.ratios)
        : settings.aspect;
    const resolution =
      settings.resolution === "auto" || !caps.resolutions.length
        ? null
        : caps.resolutions.includes(settings.resolution)
          ? settings.resolution
          : caps.resolutions.includes("2K")
            ? "2K"
            : caps.resolutions[caps.resolutions.length - 1];

    const promptParts = [settings.prompt.trim() || DEFAULT_PROMPT];
    if (references.length) promptParts.push(REFERENCE_SUFFIX);

    const payloadBlob = await prepareForApi(source);
    const preparedRefs = await Promise.all(references.map((ref) => prepareForApi(ref, 1024)));

    const result = await generateImage({
      apiKey: settings.apiKey,
      model: caps.id,
      prompt: promptParts.join("\n\n"),
      source: payloadBlob,
      references: preparedRefs,
      aspectRatio: aspect || null,
      resolution,
      outputFormat: settings.outputFormat,
      maxRefs: caps.maxRefs,
      signal: controller.signal,
    });

    const dims = await dimensionsOf(result.blob);
    await putBlob(`res:${id}`, result.blob);
    const previous = store().urls[`res:${id}`];
    revoke(previous);
    const resultUrl = URL.createObjectURL(result.blob);
    useStore.setState({ urls: { ...store().urls, [`res:${id}`]: resultUrl } });
    store().patchJob(id, {
      status: "done",
      finishedAt: Date.now(),
      resultWidth: dims.width,
      resultHeight: dims.height,
      resultType: result.blob.type,
      usedPrompt: promptParts.join("\n\n"),
      usedModel: caps.id,
      usedRatio: aspect ?? undefined,
      usedResolution: resolution ?? undefined,
      cost: result.cost,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      store().patchJob(id, { status: "idle", error: undefined, startedAt: undefined });
    } else {
      const message = error instanceof Error ? error.message : "Generation failed.";
      store().patchJob(id, { status: "error", error: message, finishedAt: Date.now() });
      toast.error(`Could not clean ${truncateMiddle(job.name, 26)}`, { description: message });
    }
  } finally {
    controllers.delete(id);
  }
}

/** Recompute a model's live capabilities when the user changes models. */
export async function ensureModelCapabilities(modelId: string) {
  const caps = await fetchCapabilities(modelId);
  if (!caps) return;
  const models = useStore.getState().models.map((model) => (model.id === modelId ? { ...model, ...caps } : model));
  useStore.setState({ models });
}

export { MAX_REFS };
