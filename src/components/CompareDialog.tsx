import * as React from "react";
import { ChevronsLeftRight, Download, Loader2, RefreshCw } from "lucide-react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { downloadJobResult } from "@/lib/download";
import { formatCost } from "@/lib/utils";

/**
 * Overlap comparison powered by `react-compare-slider`: the slider owns pointer,
 * touch and keyboard handling, we only supply the two layers and the handle art.
 */
export function CompareDialog() {
  const compareId = useStore((state) => state.compareId);
  const job = useStore((state) => state.jobs.find((entry) => entry.id === state.compareId) ?? null);
  const beforeUrl = useStore((state) => (state.compareId ? state.urls[`src:${state.compareId}`] : undefined));
  const afterUrl = useStore((state) => (state.compareId ? state.urls[`res:${state.compareId}`] : undefined));
  const openCompare = useStore((state) => state.openCompare);
  const runJob = useStore((state) => state.runJob);

  const [pos, setPos] = React.useState(50);
  const [downloading, setDownloading] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

  // Reset the divider whenever a different image is opened.
  React.useEffect(() => {
    setPos(50);
    setNonce((value) => value + 1);
  }, [compareId]);

  const width = job?.resultWidth ?? job?.width ?? 3;
  const height = job?.resultHeight ?? job?.height ?? 2;
  const ratio = width / height;

  const download = async () => {
    if (!job) return;
    setDownloading(true);
    try {
      await downloadJobResult(job);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={Boolean(compareId)} onOpenChange={(open) => !open && openCompare(null)}>
      <DialogContent size="full" className="sm:max-h-[94vh]">
        <DialogHeader
          title={job ? job.name : "Comparison"}
          description="Drag the divider, or focus it and use the arrow keys, to reveal the original."
        >
          {job ? (
            <div className="hidden shrink-0 items-center gap-1.5 pt-1 sm:flex">
              {job.usedRatio ? (
                <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-muted">
                  {job.usedRatio}
                </span>
              ) : null}
              {job.usedResolution ? (
                <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-muted">
                  {job.usedResolution}
                </span>
              ) : null}
              {job.cost ? (
                <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-accent">
                  {formatCost(job.cost)}
                </span>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(215,255,79,0.055),transparent_62%)] p-3 sm:p-6">
            {beforeUrl && afterUrl ? (
              <div
                className="compare-stage relative overflow-hidden rounded-xl border border-line bg-ink-1 shadow-2xl"
                style={{ ["--stage-ratio" as string]: ratio }}
              >
                <ReactCompareSlider
                  key={`${compareId}:${nonce}`}
                  itemOne={
                    <ReactCompareSliderImage
                      src={beforeUrl}
                      alt="Original with watermark"
                      style={{ objectFit: "contain" }}
                      draggable={false}
                    />
                  }
                  itemTwo={
                    <ReactCompareSliderImage
                      src={afterUrl}
                      alt="Watermark removed"
                      style={{ objectFit: "contain" }}
                      draggable={false}
                    />
                  }
                  defaultPosition={50}
                  keyboardIncrement="4%"
                  onPositionChange={setPos}
                  // The library flips this to true on touch devices, which only
                  // listens on the handle — and drags starting anywhere else
                  // (i.e. almost every thumb swipe) were silently ignored.
                  onlyHandleDraggable={false}
                  handle={
                    <div
                      className="relative grid h-full w-10 cursor-ew-resize place-items-center"
                      style={{ pointerEvents: "auto", touchAction: "none" }}
                    >
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent/80 shadow-[0_0_20px_rgba(215,255,79,0.55)]" />
                      <div className="relative grid size-10 place-items-center rounded-full border border-accent/70 bg-accent text-accent-ink shadow-[0_8px_24px_-8px_rgba(0,0,0,0.9)]">
                        <ChevronsLeftRight className="size-4" strokeWidth={2.4} />
                      </div>
                    </div>
                  }
                  style={{ height: "100%", width: "100%" }}
                />

                <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-line bg-ink-0/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted backdrop-blur-md">
                  Original
                </span>
                <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-accent/35 bg-ink-0/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-accent backdrop-blur-md">
                  Cleaned
                </span>
                <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-ink-0/70 px-2 py-0.5 text-[10px] tabular-nums text-faint backdrop-blur-md">
                  {Math.round(pos)}%
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                {job?.status === "running" ? (
                  <>
                    <Loader2 className="size-6 animate-spin text-accent" />
                    <p className="text-[13px] text-muted">Still working on this one…</p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-muted">This image has no result yet.</p>
                    <Button size="sm" onClick={() => job && void runJob(job.id)}>
                      Run it now
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-ink-1 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <p className="hidden text-[11.5px] text-faint sm:block">
              {job?.usedModel ? `Model: ${job.usedModel}` : "Tip: pinch-zoom your browser to inspect details."}
            </p>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => job && void runJob(job.id)}
              >
                <RefreshCw className="size-3.5" /> Re-run
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => void download()}
                disabled={!afterUrl || downloading}
              >
                {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
