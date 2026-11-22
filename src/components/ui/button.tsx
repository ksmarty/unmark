import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-[background,color,border-color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-[0_10px_30px_-14px_rgba(215,255,79,0.65)] hover:bg-[#e4ff7d]",
        secondary:
          "border border-line bg-ink-3 text-fg hover:border-line-strong hover:bg-[#1e1e28]",
        outline: "border border-line-strong text-fg hover:bg-white/[0.06]",
        ghost: "text-muted hover:bg-white/[0.06] hover:text-fg",
        danger:
          "border border-danger/25 bg-danger/10 text-danger hover:border-danger/40 hover:bg-danger/15",
        success: "border border-accent/25 bg-accent-soft text-accent hover:bg-accent/20",
      },
      size: {
        xs: "h-8 rounded-lg px-2.5 text-xs",
        sm: "h-9 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 rounded-lg p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
