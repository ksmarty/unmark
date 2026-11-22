import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-ink-2/70 backdrop-blur-sm", className)} {...props} />;
}

export function FieldLabel({
  children,
  hint,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-2 flex items-baseline justify-between gap-3", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint"
      >
        {children}
      </label>
      {hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-ink-1/80 px-3 text-sm text-fg placeholder:text-faint/80 transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-y rounded-xl border border-line bg-ink-1/80 px-3 py-2.5 text-[13px] leading-relaxed text-fg placeholder:text-faint/80 transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-10 w-full appearance-none truncate rounded-xl border border-line bg-ink-1/80 pl-3 pr-9 text-[13px] text-fg transition-colors hover:border-line-strong focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
    </div>
  ),
);
Select.displayName = "Select";

type BadgeTone = "neutral" | "accent" | "danger" | "warn" | "info";

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: "border-line bg-white/[0.04] text-muted",
    accent: "border-accent/25 bg-accent-soft text-accent",
    danger: "border-danger/25 bg-danger/10 text-danger",
    warn: "border-warn/25 bg-warn/10 text-warn",
    info: "border-info/25 bg-info/10 text-info",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-4 tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode; hint?: string }>;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-1 rounded-xl border border-line bg-ink-1/60 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors",
              active ? "bg-accent text-accent-ink shadow-sm" : "text-muted hover:bg-white/[0.05] hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onCheckedChange,
  id,
  label,
  description,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-fg">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-[11.5px] leading-snug text-faint">{description}</p> : null}
      </div>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border border-line transition-colors data-[state=checked]:border-accent/40 data-[state=checked]:bg-accent data-[state=unchecked]:bg-ink-3",
        )}
      >
        <SwitchPrimitive.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-ink" />
      </SwitchPrimitive.Root>
    </div>
  );
}

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[80] max-w-[240px] rounded-lg border border-line bg-ink-3 px-2.5 py-1.5 text-[11.5px] leading-snug text-muted shadow-xl animate-fade"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink-3" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function AspectGlyph({ ratio, className }: { ratio: string; className?: string }) {
  if (!ratio || ratio === "auto") {
    return (
      <span className={cn("grid size-5 place-items-center rounded-[4px] border border-dashed border-current/60", className)}>
        <span className="text-[9px] font-semibold leading-none">A</span>
      </span>
    );
  }
  const [w, h] = ratio.split(":").map(Number);
  const long = 20;
  const short = 20;
  const value = w && h ? w / h : 1;
  const width = value >= 1 ? long : Math.max(6, Math.round(short * value));
  const height = value >= 1 ? Math.max(6, Math.round(long / value)) : short;
  return (
    <span className={cn("grid size-5 place-items-center", className)}>
      <span className="block rounded-[2px] border border-current" style={{ width, height }} />
    </span>
  );
}
