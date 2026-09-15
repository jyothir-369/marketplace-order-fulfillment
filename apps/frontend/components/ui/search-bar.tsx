"use client";
import { Search, X } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SearchSuggestion {
  type: "product" | "vendor" | "category";
  label: string;
  href: string;
}

interface SearchBarProps {
  value?: string;
  onChange?: (q: string) => void;
  suggestions?: SearchSuggestion[];
  className?: string;
}

export function SearchBar({ value = "", onChange, suggestions = [], className }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange?.("");
    inputRef.current?.focus();
  };

  const handleSelect = (s: SearchSuggestion) => {
    onChange?.(s.label);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-warm-muted)]" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => { onChange?.(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          placeholder="Search products, vendors, categories..."
          className={cn(
            "w-full h-10 pl-10 pr-10 rounded-xl border text-sm",
            "bg-[var(--color-card)] border-[var(--color-warm-border)] text-[var(--color-foreground)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent",
            "placeholder:text-[var(--color-warm-subtle)] transition"
          )}
          aria-label="Search catalog"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div id="search-suggestions" role="listbox" className="absolute z-50 mt-2 w-full rounded-xl border border-[var(--color-warm-border)] bg-[var(--color-card)] shadow-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                role="option"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cream)] transition flex items-center gap-3"
              >
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", s.type === "product" ? "bg-brass/10 text-brass" : s.type === "vendor" ? "bg-ink-navy/10 text-ink-navy" : "bg-warm-border/30 text-warm-muted")}>
                  {s.type}
                </span>
                <span className="font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
