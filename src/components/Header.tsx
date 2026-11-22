import { KeyRound, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { BRAND_GLYPH_PATHS } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The logo mark — the favicon is generated from the same path data. */
function BrandGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[18px]"
    >
      {BRAND_GLYPH_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Header() {
  const settings = useStore((state) => state.settings);
  const keyInfo = useStore((state) => state.keyInfo);
  const setKeyDialogOpen = useStore((state) => state.setKeyDialogOpen);
  const setSettingsOpen = useStore((state) => state.setSettingsOpen);

  const connected = Boolean(settings.apiKey);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-0/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink shadow-[0_10px_26px_-12px_rgba(215,255,79,0.9)]">
            <BrandGlyph />
          </div>
          <div className="min-w-0 leading-none">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-fg">Unmark</span>
              <span className="rounded-full border border-line px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-faint">
                studio
              </span>
            </div>
            <p className="mt-1 hidden truncate text-[11px] text-faint sm:block">
              Watermark removal with OpenRouter image models
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Desktop only: on phones the key lives in the settings sheet and the sticky bar. */}
          <button
            type="button"
            onClick={() => setKeyDialogOpen(true)}
            className={cn(
              "hidden h-9 items-center gap-2 rounded-xl border px-2.5 text-[12.5px] font-medium transition-colors lg:flex",
              connected
                ? "border-line bg-ink-2 text-muted hover:border-line-strong hover:text-fg"
                : "border-accent/30 bg-accent-soft text-accent hover:bg-accent/20",
            )}
          >
            <KeyRound className="size-3.5" />
            <span className="max-w-[150px] truncate">
              {connected ? (keyInfo?.label || "Key connected") : "Connect OpenRouter"}
            </span>
            {connected ? <span className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(215,255,79,0.9)]" /> : null}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="relative lg:hidden"
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-4" />
            {connected ? (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(215,255,79,0.9)]" />
            ) : null}
          </Button>
        </div>
      </div>
    </header>
  );
}
