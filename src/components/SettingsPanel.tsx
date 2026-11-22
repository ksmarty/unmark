import * as React from "react";
import { ImagePlus, KeyRound, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, AspectGlyph, Select, Textarea, Tooltip } from "@/components/ui/primitives";
import { useStore, MAX_REFS, ensureModelCapabilities } from "@/lib/store";
import { OUTPUT_FORMATS, PROMPT_PRESETS, sortRatios, DEFAULT_PROMPT } from "@/lib/presets";
import { closestRatio, ratioDeltaLabel } from "@/lib/ratio";
import { cn, vendorLabel } from "@/lib/utils";

function Section({
  title,
  aside,
  children,
  first,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section className={cn("px-4 py-3.5", !first && "border-t border-line")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function SettingsPanel() {
  const settings = useStore((state) => state.settings);
  const saveSettings = useStore((state) => state.saveSettings);
  const models = useStore((state) => state.models);
  const modelsLive = useStore((state) => state.modelsLive);
  const modelsLoading = useStore((state) => state.modelsLoading);
  const refreshModels = useStore((state) => state.refreshModels);
  const refs = useStore((state) => state.refs);
  const urls = useStore((state) => state.urls);
  const addReferences = useStore((state) => state.addReferences);
  const removeReference = useStore((state) => state.removeReference);
  const jobs = useStore((state) => state.jobs);
  const runAll = useStore((state) => state.runAll);
  const setKeyDialogOpen = useStore((state) => state.setKeyDialogOpen);
  const setSettingsOpen = useStore((state) => state.setSettingsOpen);
  const keyInfo = useStore((state) => state.keyInfo);
  const refInput = React.useRef<HTMLInputElement>(null);

  const caps = models.find((model) => model.id === settings.model) ?? models[0];
  const ratios = sortRatios(caps?.ratios ?? []);
  const resolutions = caps?.resolutions ?? [];

  const pending = jobs.filter((job) => job.status === "idle" || job.status === "error").length;
  const busy = jobs.some((job) => job.status === "queued" || job.status === "running");
  const sample = jobs.find((job) => job.status === "idle") ?? jobs[0];

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof models>();
    for (const model of models) {
      const vendor = vendorLabel(model.id);
      map.set(vendor, [...(map.get(vendor) ?? []), model]);
    }
    return [...map.entries()];
  }, [models]);

  const summaryHint = settings.outputFormat
    ? OUTPUT_FORMATS.find((format) => format.value === settings.outputFormat)?.hint
    : undefined;

  return (
    <div className="flex flex-col">
      {/* Mobile only — the header hides the key button on phones, so keep it reachable here. */}
      <section className="flex items-center gap-2.5 border-b border-line px-4 py-3 lg:hidden">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border",
            settings.apiKey ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-ink-1 text-faint",
          )}
        >
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-fg">
            {settings.apiKey ? keyInfo?.label || "OpenRouter connected" : "No API key yet"}
          </p>
          <p className="truncate text-[10.5px] text-faint">
            {settings.apiKey ? "Saved in this browser only" : "The demo works without one"}
          </p>
        </div>
        <Button
          size="xs"
          variant={settings.apiKey ? "secondary" : "primary"}
          onClick={() => {
            setSettingsOpen(false);
            setKeyDialogOpen(true);
          }}
        >
          {settings.apiKey ? "Manage" : "Connect"}
        </Button>
      </section>

      <Section title="Prompt" first aside={
        <button
          type="button"
          onClick={() => saveSettings({ prompt: DEFAULT_PROMPT })}
          className="inline-flex items-center gap-1 text-[10.5px] text-faint transition-colors hover:text-accent"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
      }>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PROMPT_PRESETS.map((preset) => {
            const active = settings.prompt.trim() === preset.prompt.trim();
            return (
              <Tooltip key={preset.id} content={preset.hint}>
                <button
                  type="button"
                  onClick={() => saveSettings({ prompt: preset.prompt })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-line bg-ink-1/60 text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  {preset.label}
                </button>
              </Tooltip>
            );
          })}
        </div>
        <Textarea
          value={settings.prompt}
          onChange={(event) => saveSettings({ prompt: event.target.value })}
          rows={5}
          spellCheck={false}
          className="text-[12.5px]"
          placeholder="Describe what to keep and what to remove…"
        />
        <div className="mt-2 flex items-center justify-between text-[10.5px] text-faint">
          <span>{settings.prompt.trim().length} chars</span>
          <span>Applied to every image in the batch</span>
        </div>
      </Section>

      <Section
        title="Model"
        aside={
          <button
            type="button"
            onClick={() => void refreshModels(true)}
            disabled={modelsLoading}
            className="inline-flex items-center gap-1 text-[10.5px] text-faint transition-colors hover:text-accent disabled:opacity-50"
          >
            {modelsLoading ? "Refreshing…" : modelsLive ? "Live catalog" : "Refresh catalog"}
          </button>
        }
      >
        <Select
          value={settings.model}
          onChange={(event) => {
            saveSettings({ model: event.target.value });
            void ensureModelCapabilities(event.target.value);
          }}
          aria-label="Image model"
        >
          {grouped.map(([vendor, list]) => (
            <optgroup key={vendor} label={vendor}>
              {list.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge>{caps?.maxRefs ?? 0} refs</Badge>
          <Badge>{resolutions.length ? resolutions.join(" · ") : "native size"}</Badge>
          {ratios.length ? <Badge>{ratios.length} ratios</Badge> : <Badge tone="warn">prompt-driven size</Badge>}
        </div>
      </Section>

      <Section title="Resolution" aside={<span className="text-[10.5px] text-faint">per image</span>}>
        {resolutions.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {["auto", ...resolutions].map((value) => {
              const active = settings.resolution === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => saveSettings({ resolution: value })}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors",
                    active
                      ? "border-accent/45 bg-accent-soft text-accent"
                      : "border-line bg-ink-1/50 text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  {value === "auto" ? "Auto" : value}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-ink-1/50 px-3 py-2 text-[11.5px] leading-snug text-faint">
            This model picks the output size itself. Aspect ratio is still honoured.
          </p>
        )}
        <p className="mt-2 text-[10.5px] text-faint">
          {settings.resolution === "auto"
            ? "Auto uses the model's balanced default."
            : "Higher resolutions cost more credits per image."}
        </p>
      </Section>

      <Section title="Aspect ratio" aside={<span className="text-[10.5px] text-faint">auto = closest match</span>}>
        {ratios.length ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => saveSettings({ aspect: "auto" })}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                settings.aspect === "auto"
                  ? "border-accent/45 bg-accent-soft text-accent"
                  : "border-line bg-ink-1/50 text-muted hover:border-line-strong hover:text-fg",
              )}
            >
              <AspectGlyph ratio="auto" />
              <span className="text-[11.5px] font-medium">Auto</span>
              <span className="ml-auto truncate text-[10.5px] text-faint">
                {sample ? `≈ ${closestRatio(sample.width, sample.height, ratios) ?? "—"}` : "per image"}
              </span>
            </button>
            <div className="grid grid-cols-4 gap-1.5">
              {ratios.map((ratio) => {
                const active = settings.aspect === ratio;
                return (
                  <Tooltip
                    key={ratio}
                    content={
                      sample ? `${ratio} · ${ratioDeltaLabel(sample.width, sample.height, ratio)}` : ratio
                    }
                  >
                    <button
                      type="button"
                      onClick={() => saveSettings({ aspect: ratio })}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border py-2 text-[10.5px] font-medium transition-colors",
                        active
                          ? "border-accent/45 bg-accent-soft text-accent"
                          : "border-line bg-ink-1/50 text-muted hover:border-line-strong hover:text-fg",
                      )}
                    >
                      <AspectGlyph ratio={ratio} />
                      {ratio}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-ink-1/50 px-3 py-2 text-[11.5px] leading-snug text-faint">
            No fixed ratios for this model — ask for a crop or canvas in the prompt.
          </p>
        )}
      </Section>

      <Section title="Format" aside={<span className="text-[10.5px] text-faint">{summaryHint}</span>}>
        <div className="grid grid-cols-3 gap-1.5">
          {OUTPUT_FORMATS.map((format) => {
            const active = settings.outputFormat === format.value;
            return (
              <button
                key={format.value}
                type="button"
                onClick={() => saveSettings({ outputFormat: format.value })}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-[11.5px] font-medium uppercase tracking-wide transition-colors",
                  active
                    ? "border-accent/45 bg-accent-soft text-accent"
                    : "border-line bg-ink-1/50 text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {format.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Face references"
        aside={
          <span className="text-[10.5px] text-faint">
            {refs.length}/{MAX_REFS}
          </span>
        }
      >
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={settings.useReferences}
            onChange={(event) => saveSettings({ useReferences: event.target.checked })}
            className="mt-0.5 size-3.5 shrink-0 accent-[#d7ff4f]"
          />
          <span className="text-[11.5px] leading-snug text-muted">
            Send references with every image so faces keep the same person.
          </span>
        </label>

        <input
          ref={refInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) void addReferences(files);
            event.target.value = "";
          }}
        />

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {refs.map((ref) => (
            <div key={ref.id} className="group relative size-16 shrink-0 overflow-hidden rounded-lg border border-line">
              <img src={urls[`ref:${ref.id}`]} alt={ref.name} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => void removeReference(ref.id)}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full border border-line bg-ink-0/85 text-muted transition-colors hover:text-danger"
                aria-label={`Remove reference ${ref.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {refs.length < MAX_REFS ? (
            <button
              type="button"
              onClick={() => refInput.current?.click()}
              className="grid size-16 shrink-0 place-items-center gap-1 rounded-lg border border-dashed border-line-strong bg-ink-1/40 text-faint transition-colors hover:border-accent/40 hover:text-accent"
              aria-label="Add reference images"
            >
              <ImagePlus className="size-4" />
              <span className="text-[9px] font-medium">Add</span>
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
          Front-facing, well-lit shots work best. Model supports up to {caps?.maxRefs ?? 0} images
          including the source.
        </p>
      </Section>

      <div className="sticky bottom-0 z-10 rounded-b-card border-t border-line bg-ink-2/95 p-4 backdrop-blur-xl">
        {settings.apiKey ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => void runAll()}
            disabled={!pending || busy}
          >
            <Sparkles className="size-4" />
            {busy ? "Working…" : pending ? `Remove watermarks · ${pending}` : "Nothing queued"}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setKeyDialogOpen(true)}>
            Connect OpenRouter to start
          </Button>
        )}
        <p className="mt-2.5 text-center text-[10.5px] leading-relaxed text-faint">
          Two images generate at a time. Results and settings stay in this browser until you clear
          them.
        </p>
      </div>
    </div>
  );
}
