import * as React from "react";
import {
  AlertTriangle,
  Columns2,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { downloadJobResult } from "@/lib/download";
import { formatBytes, formatCost, truncateMiddle } from "@/lib/utils";
import type { Job } from "@/types";
import { cn } from "@/lib/utils";

export function StatusChip({ status }: { status: Job["status"] }) {
  const map = {
    idle: { label: "Ready", className: "border-line bg-ink-0/70 text-muted" },
    queued: { label: "Queued", className: "border-info/30 bg-info/15 text-info" },
    running: { label: "Working", className: "border-accent/40 bg-accent/15 text-accent" },
    done: { label: "Cleaned", className: "border-accent/40 bg-accent/15 text-accent" },
    error: { label: "Failed", className: "border-danger/35 bg-danger/15 text-danger" },
  } as const;
  const meta = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] backdrop-blur-md",
        meta.className,
      )}
    >
      {status === "running" ? <Loader2 className="size-2.5 animate-spin" /> : null}
      {meta.label}
    </span>
  );
}

export function JobCard({ job }: { job: Job }) {
  const urls = useStore((state) => state.urls);
  const openCompare = useStore((state) => state.openCompare);
  const runJob = useStore((state) => state.runJob);
  const cancelJob = useStore((state) => state.cancelJob);
  const removeJob = useStore((state) => state.removeJob);
  const [downloading, setDownloading] = React.useState(false);

  const result = urls[`res:${job.id}`];
  const thumb = urls[`thumb:${job.id}`] ?? urls[`src:${job.id}`];
  const busy = job.status === "queued" || job.status === "running";
  const done = job.status === "done" && Boolean(result);
  const image = done ? result : thumb;

  const download = async () => {
    setDownloading(true);
    try {
      await downloadJobResult(job);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-card border bg-ink-2/60 transition-colors",
        done ? "border-accent/25" : "border-line hover:border-line-strong",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-1">
        <div className="checker absolute inset-0 opacity-60" />
        {image ? (
          <button
            type="button"
            onClick={() => (done ? openCompare(job.id) : undefined)}
            className={cn(
              "relative block h-full w-full",
              done ? "cursor-zoom-in" : "cursor-default",
              busy && "pointer-events-none",
            )}
            aria-label={done ? `Compare result for ${job.name}` : job.name}
          >
            <img
              src={image}
              alt={job.name}
              loading="lazy"
              className={cn(
                "h-full w-full object-cover transition-[filter,opacity,transform] duration-500",
                busy && "scale-[1.02] opacity-40 blur-[2px]",
              )}
            />
          </button>
        ) : (
          <div className="grid h-full w-full place-items-center text-faint">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}

        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
          <StatusChip status={job.status} />
        </div>

        {done ? (
          <div className="pointer-events-none absolute right-2 top-2">
            <span className="rounded-full border border-accent/40 bg-ink-0/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-accent backdrop-blur-md">
              Before / after
            </span>
          </div>
        ) : null}

        {job.status === "running" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-2 rounded-full border border-line bg-ink-0/80 px-3 py-1.5 text-[11.5px] text-fg backdrop-blur">
              <Loader2 className="size-3.5 animate-spin text-accent" />
              Removing watermark…
            </div>
          </div>
        ) : null}

        {job.status === "error" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink-0/50 p-4">
            <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-ink-1/95 px-3 py-2 text-left">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" />
              <p className="line-clamp-3 text-[11.5px] leading-snug text-muted">{job.error}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg" title={job.name}>
              {truncateMiddle(job.name, 30)}
            </p>
            <p className="mt-0.5 text-[10.5px] text-faint">
              {job.width}×{job.height} · {formatBytes(job.size)}
              {done && job.resultWidth ? ` → ${job.resultWidth}×${job.resultHeight}` : ""}
            </p>
          </div>
          <Tooltip content="Remove from this batch">
            <button
              type="button"
              onClick={() => void removeJob(job.id)}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-white/[0.06] hover:text-danger"
              aria-label={`Remove ${job.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </Tooltip>
        </div>

        {done ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-faint">
            {job.demo ? (
              <span className="rounded border border-info/35 bg-info/10 px-1.5 py-0.5 text-info">demo</span>
            ) : null}
            {job.usedRatio ? (
              <span className="rounded border border-line px-1.5 py-0.5">{job.usedRatio}</span>
            ) : null}
            {job.usedResolution ? (
              <span className="rounded border border-line px-1.5 py-0.5">{job.usedResolution}</span>
            ) : null}
            {job.cost ? <span className="text-muted">{formatCost(job.cost)}</span> : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-1.5">
          {done ? (
            <>
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => openCompare(job.id)}>
                <Columns2 className="size-3.5" /> Compare
              </Button>
              <Tooltip content="Download cleaned image">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => void download()}
                  disabled={downloading}
                  aria-label="Download cleaned image"
                >
                  {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                </Button>
              </Tooltip>
              <Tooltip content={job.demo ? "Sample result — add a key to run real jobs" : "Run again"}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => void runJob(job.id)}
                  disabled={Boolean(job.demo)}
                  aria-label="Run again"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              </Tooltip>
            </>
          ) : busy ? (
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => cancelJob(job.id)}>
              <X className="size-3.5" /> Cancel
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => void runJob(job.id)}>
                <Sparkles className="size-3.5" />
                {job.status === "error" ? "Retry" : "Clean"}
              </Button>
              <Tooltip content="Remove from this batch">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => void removeJob(job.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
