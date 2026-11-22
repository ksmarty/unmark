import * as React from "react";
import { Check, ExternalLink, Loader2, Lock, Trash2, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { formatCost } from "@/lib/utils";

export function KeyDialog() {
  const open = useStore((state) => state.keyDialogOpen);
  const setOpen = useStore((state) => state.setKeyDialogOpen);
  const settings = useStore((state) => state.settings);
  const saveSettings = useStore((state) => state.saveSettings);
  const saveApiKey = useStore((state) => state.saveApiKey);
  const refreshKeyInfo = useStore((state) => state.refreshKeyInfo);
  const keyInfo = useStore((state) => state.keyInfo);
  const keyChecking = useStore((state) => state.keyChecking);
  const resetAll = useStore((state) => state.resetAll);
  const loadDemo = useStore((state) => state.loadDemo);
  const importing = useStore((state) => state.importing);

  const [value, setValue] = React.useState(settings.apiKey);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setValue(settings.apiKey);
      setError(null);
      setConfirmReset(false);
    }
  }, [open, settings.apiKey]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const key = value.trim();
    if (!key) {
      saveSettings({ apiKey: "" });
      setError("Paste a key to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveApiKey(key);
      setOpen(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not verify that key.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const connected = Boolean(settings.apiKey);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="sm">
        <DialogHeader
          title="Connect OpenRouter"
          description="Unmark does every call straight from your browser, signed with your own key."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="api-key" className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
                API key
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-accent"
              >
                Create a key <ExternalLink className="size-3" />
              </a>
            </div>
            <Input
              id="api-key"
              type="password"
              value={value}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-or-v1-…"
              onChange={(event) => setValue(event.target.value)}
              className="font-mono text-[12.5px]"
            />
            {error ? (
              <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[11.5px] leading-snug text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <Button type="submit" className="flex-1" disabled={busy || !value.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {busy ? "Checking key…" : connected ? "Update key" : "Verify and save"}
              </Button>
              {connected ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    saveSettings({ apiKey: "" });
                    setValue("");
                    setError(null);
                  }}
                  aria-label="Remove saved key"
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          </form>

          {connected ? (
            <div className="mt-4 rounded-xl border border-line bg-ink-2/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(215,255,79,0.9)]" />
                  <span className="text-[12px] font-medium text-fg">
                    {keyInfo?.label || "Key saved"}
                  </span>
                  {keyInfo?.isFreeTier ? (
                    <span className="rounded-full border border-info/30 bg-info/10 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-info">
                      free tier
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void refreshKeyInfo()}
                  disabled={keyChecking}
                  className="text-[10.5px] text-faint transition-colors hover:text-accent disabled:opacity-50"
                >
                  {keyChecking ? "Checking…" : "Re-check"}
                </button>
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-line/70 bg-ink-1/60 px-2.5 py-1.5">
                  <dt className="text-[9.5px] uppercase tracking-[0.12em] text-faint">Used</dt>
                  <dd className="mt-0.5 font-medium text-fg">{formatCost(keyInfo?.usage ?? 0)}</dd>
                </div>
                <div className="rounded-lg border border-line/70 bg-ink-1/60 px-2.5 py-1.5">
                  <dt className="text-[9.5px] uppercase tracking-[0.12em] text-faint">Limit</dt>
                  <dd className="mt-0.5 font-medium text-fg">
                    {keyInfo?.limit == null ? "Unlimited" : formatCost(keyInfo.limit)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-faint">
            <Lock className="mt-0.5 size-3 shrink-0" />
            The key is kept in this browser's local storage and only ever sent to openrouter.ai.
            Nothing is proxied through another server.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-2/50 px-3 py-2.5">
            <Wand2 className="size-3.5 shrink-0 text-accent" />
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted">
              Just want to look around? Load a sample batch with finished results.
            </p>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                void loadDemo();
              }}
              loading={importing > 0}
            >
              Try the demo
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="text-[11px] text-faint">Everything stays in this browser.</span>
            <button
              type="button"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                void resetAll();
              }}
              className={
                confirmReset
                  ? "rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11px] font-medium text-danger transition-colors"
                  : "rounded-lg px-2.5 py-1 text-[11px] text-faint transition-colors hover:text-danger"
              }
            >
              {confirmReset ? "Tap again to erase" : "Clear local data"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
