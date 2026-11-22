import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  size = "md",
  hideClose,
}: {
  className?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  hideClose?: boolean;
}) {
  const sizes = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-3xl",
    full: "sm:max-w-6xl",
  };
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden border-line bg-ink-1 shadow-2xl animate-rise focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
          sizes[size],
          className,
        )}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full border border-line bg-ink-2/80 text-muted transition-colors hover:bg-ink-3 hover:text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  title,
  description,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("shrink-0 border-b border-line px-4 pb-4 pt-5 sm:px-6", className)}>
      <div className="flex items-start justify-between gap-6 pr-10">
        <div className="min-w-0">
          <DialogPrimitive.Title className="truncate text-base font-semibold tracking-tight text-fg">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-[12.5px] leading-snug text-muted">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
