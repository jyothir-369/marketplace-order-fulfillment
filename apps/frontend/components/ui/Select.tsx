/**
 * Select — styled native <select> element matching the V2 luxury design system.
 * Uses native HTML select for accessibility and simplicity.
 */

import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ options, placeholder, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-9 px-3 rounded-lg border text-xs font-medium",
        "border-[var(--color-warm-border)] bg-[var(--color-card)]",
        "text-[var(--color-foreground)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]",
        "transition-colors",
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="">{placeholder}</option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
