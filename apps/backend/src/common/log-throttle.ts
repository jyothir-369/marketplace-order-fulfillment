/**
 * Log throttle utility
 * ------------------------------------------------------------------
 * Coalesces repeated identical warn-level log messages into a single
 * entry per `windowMs`. Used to suppress noisy Redis-down spam in
 * background services without losing signal.
 */

const logState = new Map<string, { count: number; firstAt: number; lastLoggedAt: number }>();

export function throttledLog(
  key: string,
  level: 'warn' | 'error' | 'log',
  message: string,
  windowMs = 30_000,
  logger?: { warn: (m: string) => void; error: (m: string) => void; log: (m: string) => void },
): void {
  const now = Date.now();
  const state = logState.get(key);
  if (!state) {
    logState.set(key, { count: 1, firstAt: now, lastLoggedAt: now });
    emit(level, message, 1, windowMs, logger);
    return;
  }
  state.count += 1;
  if (now - state.lastLoggedAt >= windowMs) {
    emit(level, message, state.count, windowMs, logger);
    state.firstAt = now;
    state.lastLoggedAt = now;
    state.count = 0;
  }
}

function emit(
  level: 'warn' | 'error' | 'log',
  message: string,
  suppressedCount: number,
  windowMs: number,
  logger?: { warn: (m: string) => void; error: (m: string) => void; log: (m: string) => void },
): void {
  const suffix = suppressedCount > 1 ? ` (suppressed ${suppressedCount - 1} repeats in ${Math.round(windowMs / 1000)}s)` : '';
  const text = message + suffix;
  if (logger) {
    if (level === 'warn') logger.warn(text);
    else if (level === 'error') logger.error(text);
    else logger.log(text);
  } else {
    // eslint-disable-next-line no-console
    console[level](text);
  }
}

export function resetThrottledLog(key?: string): void {
  if (key) logState.delete(key);
  else logState.clear();
}