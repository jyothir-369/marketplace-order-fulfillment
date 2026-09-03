import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variant: default | outline | destructive | ghost | secondary */
  variant?: "default" | "outline" | "destructive" | "ghost" | "secondary";
  /** Size: sm | md | lg */
  size?: "sm" | "md" | "lg";
  /** Loading state */
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "default",
  size = "md",
  isLoading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)] disabled:pointer-events-none disabled:opacity-50";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    default:
      "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)]/90",
    outline:
      "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)] text-[var(--color-foreground)]",
    destructive:
      "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:bg-[var(--color-destructive)]/90",
    ghost:
      "hover:bg-[var(--color-accent)] text-[var(--color-foreground)]",
    secondary:
      "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]/80",
  };

  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      {...props}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        isLoading && "animate-pulse",
        className
      )}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
