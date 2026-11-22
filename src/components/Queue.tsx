import { CheckCheck, Eraser, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/JobCard";
import { Dropzone } from "@/components/Dropzone";
import { useStore } from "@/lib/store";

export function DemoStrip() {
  const settings = useStore((state) => state.settings);
  const jobs = useStore((state) => state.jobs);
  const importing = useStore((state) => state.importing);
  const exitDemo = useStore((state) => state.exitDemo);
  const setKeyDialogOpen = useStore((state) => state.setKeyDialogOpen);

  const demoJobs = jobs.filter((job) => job.demo).length;
  if (!demoJobs) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-accent/25 bg-accent-soft px-3 py-2.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-ink-0/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
        <Wand2 className="size-3" /> Demo
      </span>
      <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-muted">
        Sample photos with ready-made results — no key or credits used.
        {settings.apiKey ? " Your own images run with your key." : " Add a key to run your own."}
      </p>
      <div className="flex items-center gap-1">
        {settings.apiKey ? null : (
          <Button size="xs" variant="primary" onClick={() => setKeyDialogOpen(true)}>
            Add key
          </Button>
        )}
        <Button
          size="xs"
          variant="ghost"
          onClick={() => void exitDemo()}
          loading={importing > 0}
          aria-label="Exit demo"
        >
          <X className="size-3.5" /> Exit demo
        </Button>
      </div>
    </div>
  );
}

export function DemoPrompt() {
  const settings = useStore((state) => state.settings);
  const jobs = useStore((state) => state.jobs);
  const importing = useStore((state) => state.importing);
  const loadDemo = useStore((state) => state.loadDemo);

  if (settings.apiKey || jobs.some((job) => job.demo) || importing > 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-faint">
      <span>No API key yet?</span>
      <Button size="xs" variant="secondary" onClick={() => void loadDemo()}>
        <Wand2 className="size-3.5" /> Try a demo batch
      </Button>
      <span className="text-faint/70">sample photos, no key or credits needed</span>
    </div>
  );
}

export function Queue() {
  const jobs = useStore((state) => state.jobs);
  const runAll = useStore((state) => state.runAll);
  const clearFinished = useStore((state) => state.clearFinished);

  const done = jobs.filter((job) => job.status === "done").length;
  const pending = jobs.filter((job) => job.status === "idle" || job.status === "error").length;
  const busy = jobs.filter((job) => job.status === "queued" || job.status === "running").length;

  if (!jobs.length) {
    return (
      <div className="space-y-4">
        <DemoStrip />
        <Dropzone compact={false} />
        <DemoPrompt />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Upload a batch",
              body: "Drop in every watermarked photo at once, from a phone or a desktop.",
            },
            {
              title: "Add face references",
              body: "Optional portrait shots keep the same person looking like themselves.",
            },
            {
              title: "Compare and download",
              body: "Drag the slider over each result, then save the ones you like.",
            },
          ].map((step, index) => (
            <div key={step.title} className="rounded-card border border-line bg-ink-2/40 p-4 lg:p-3.5">
              <span className="mb-2 inline-grid size-6 place-items-center rounded-md border border-line bg-ink-3 text-[11px] font-semibold text-accent">
                {index + 1}
              </span>
              <p className="text-[12.5px] font-medium text-fg">{step.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DemoStrip />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className="font-medium text-fg">{jobs.length}</span> image{jobs.length === 1 ? "" : "s"}
          <span className="text-faint">·</span>
          <span>{done} cleaned</span>
          {busy ? (
            <>
              <span className="text-faint">·</span>
              <span className="text-accent">{busy} in progress</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {done ? (
            <Button size="sm" variant="ghost" onClick={() => void clearFinished()}>
              <CheckCheck className="size-3.5" /> Clear finished
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void runAll()}
            disabled={!pending || busy > 0}
            className="hidden sm:inline-flex"
          >
            <Sparkles className="size-3.5" />
            {pending ? `Run batch · ${pending}` : busy ? "Running…" : "All done"}
          </Button>
        </div>
      </div>

      <Dropzone compact />

      {jobs.length === 0 ? (
        <div className="grid place-items-center rounded-card border border-line bg-ink-2/40 p-10 text-center">
          <Eraser className="mb-3 size-6 text-faint" />
          <p className="text-[13px] text-muted">No images in this batch yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
      <DemoPrompt />
    </div>
  );
}
