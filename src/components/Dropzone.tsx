import * as React from "react";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { ACCEPTED_TYPES, MAX_FILE_BYTES } from "@/lib/image";
import { cn, formatBytes } from "@/lib/utils";

export function Dropzone({ compact }: { compact: boolean }) {
  const addFiles = useStore((state) => state.addFiles);
  const importing = useStore((state) => state.importing);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const depth = React.useRef(0);
  const [dragging, setDragging] = React.useState(false);

  const pick = () => inputRef.current?.click();

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) void addFiles(files);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_TYPES.join(",")}
      multiple
      className="hidden"
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length) void addFiles(files);
        event.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => {
          depth.current -= 1;
          if (depth.current <= 0) setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex items-center gap-3 rounded-card border border-dashed px-3 py-2.5 transition-colors",
          dragging ? "border-accent/60 bg-accent-soft" : "border-line bg-ink-2/50 hover:border-line-strong",
        )}
      >
        {input}
        <button
          type="button"
          onClick={pick}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-ink-3 text-muted">
            {importing ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium text-fg">
              {importing ? "Adding images…" : "Add more images"}
            </span>
            <span className="block truncate text-[11px] text-faint">
              Drop files anywhere, or tap to browse · up to {formatBytes(MAX_FILE_BYTES)} each
            </span>
          </span>
        </button>
        <Button size="sm" variant="secondary" onClick={pick} className="shrink-0">
          Browse
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        "relative overflow-hidden rounded-card border border-dashed p-8 text-center transition-colors sm:p-12",
        dragging
          ? "border-accent/60 bg-accent-soft"
          : "border-line-strong bg-ink-2/40 hover:border-line-strong",
      )}
    >
      {input}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-line bg-ink-3 text-accent shadow-inner">
        {importing ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
        {dragging ? "Drop them right here" : "Drop watermarked images"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
        Batch as many as you like. Each image is redrawn by an image model, so the watermark is
        reconstructed out of the picture instead of being blurred over.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Button size="lg" onClick={pick} loading={importing > 0} className="w-full sm:w-auto">
          <ImagePlus className="size-4" /> Choose images
        </Button>
        <span className="text-[11.5px] text-faint">PNG · JPEG · WebP · {formatBytes(MAX_FILE_BYTES)} max</span>
      </div>
      <p className="mt-6 text-[11px] text-faint/80">Tip: you can also paste an image from your clipboard.</p>
    </div>
  );
}
