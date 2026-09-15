import { useState, useEffect } from "react";

/**
 * Debounce a value by `delay` ms. Used to avoid firing a server-side
 * catalog query on every keystroke in the SearchBar typeahead.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
