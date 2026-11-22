import * as React from "react";
import { KeyRound, Loader2, Settings2, Sparkles, UploadCloud } from "lucide-react";
import { Header } from "@/components/Header";
import { Queue } from "@/components/Queue";
import { SettingsPanel } from "@/components/SettingsPanel";
import { KeyDialog } from "@/components/KeyDialog";
import { CompareDialog } from "@/components/CompareDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

let booted = false;

export default function App() {
  const hydrated = useStore((state) => state.hydrated);
  const hydrate = useStore((state) => state.hydrate);
  const addFiles = useStore((state) => state.addFiles);
  const settingsOpen = useStore((state) => state.settingsOpen);
  const setSettingsOpen = useStore((state) => state.setSettingsOpen);
  const runAll = useStore((state) => state.runAll);
  const jobs = useStore((state) => state.jobs);
  const apiKey = useStore((state) => state.settings.apiKey);
  const setKeyDialogOpen = useStore((state) => state.setKeyDialogOpen);

  const [dragging, setDragging] = React.useState(false);
  const depth = React.useRef(0);

  React.useEffect(() => {
    if (booted) return;
    booted = true;
    void hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    const onEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
    };
    const onLeave = () => {
      depth.current -= 1;
      if (depth.current <= 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) void addFiles(files);
    };
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) void addFiles(files);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [addFiles]);

  const pending = jobs.filter((job) => job.status === "idle" || job.status === "error").length;
  const busy = jobs.some((job) => job.status === "queued" || job.status === "running");

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-5 animate-spin text-accent" />
          <p className="text-[12px] text-faint">Loading your library…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <Header />

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-8 lg:pb-6">
        <div className="grid grid-cols-1 gap-6 pt-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_372px] lg:items-start lg:gap-7 lg:pt-6">
          <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4">
            <div className="mb-1 flex flex-wrap items-end justify-between gap-3 lg:mb-0 lg:shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/80">
                  Client-side · OpenRouter
                </p>
                <h1 className="mt-1.5 text-[21px] font-semibold leading-tight tracking-tight text-fg sm:text-[26px]">
                  Take the watermark off, keep the photograph.
                </h1>
                <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-muted">
                  Batch upload, keep faces consistent with reference shots, drag the slider to compare,
                  then download what you like.
                </p>
              </div>
            </div>
            <div className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pb-1 lg:pr-1">
              <Queue />
            </div>
          </div>

          <aside className="hidden lg:block lg:h-full lg:min-h-0">
            <div className="no-scrollbar h-full overflow-y-auto overscroll-contain rounded-card border border-line bg-ink-2/60 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <SettingsPanel />
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-1/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2 px-3 pt-2">
          <Button variant="secondary" size="md" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            <Settings2 className="size-4" />
            <span className="text-[12.5px]">Settings</span>
          </Button>
          <Button
            size="md"
            className="flex-1"
            disabled={Boolean(apiKey) && (busy || pending === 0)}
            onClick={() => {
              if (!apiKey) {
                setKeyDialogOpen(true);
                return;
              }
              void runAll();
            }}
          >
            {!apiKey ? (
              <KeyRound className="size-4" />
            ) : busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            <span className="truncate">
              {!apiKey
                ? "Connect OpenRouter"
                : busy
                  ? "Working…"
                  : pending
                    ? `Remove watermarks · ${pending}`
                    : "Nothing queued"}
            </span>
          </Button>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent size="lg" className="sm:max-w-md">
          <DialogHeader title="Settings" description="Prompt, model and face references for this batch." />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SettingsPanel />
          </div>
        </DialogContent>
      </Dialog>

      <KeyDialog />
      <CompareDialog />

      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-40 grid place-items-center transition-opacity duration-150",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="absolute inset-3 rounded-[1.6rem] border-2 border-dashed border-accent/60 bg-ink-0/70 backdrop-blur-sm" />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <UploadCloud className="size-7 text-accent" />
          <p className="text-[13px] font-medium text-fg">Drop to add these images</p>
          <p className="text-[11px] text-faint">They stay in this browser alongside your batch</p>
        </div>
      </div>
    </div>
  );
}
