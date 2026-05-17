import { useEffect, useState } from 'react';

/**
 * Render-pure cooldown derivation.
 *
 * Given an expiry timestamp (ms since epoch, or null/undefined for "no cooldown"),
 * returns whether the cooldown is still active. The boolean flips to `false`
 * automatically when the deadline passes, via a `setTimeout` inside `useEffect`.
 *
 * Why this shape (eslint-plugin-react-hooks v6 / React Compiler rules):
 * - `react-hooks/purity`: `Date.now()` cannot be called during render. The lazy
 *   `useState` initializer captures the mount-time snapshot once, and the timer
 *   callback refreshes it — both are pure-by-rule.
 * - `react-hooks/set-state-in-effect`: `setState` must not be called
 *   synchronously inside an effect body. All state updates here happen inside
 *   `setTimeout` callbacks, which the rule treats as the legitimate
 *   "external subscription" pattern.
 * - `react-hooks/refs`: refs cannot be read during render. We use plain state
 *   instead of a ref-stored "now snapshot" so the render path stays clean.
 *
 * Trade-off: when `until` flips to a deeply-stale value (e.g. a past timestamp
 * after a long idle period), a single render may briefly read the old `now`
 * snapshot and report `true` before the microtask refreshes state. The
 * self-correction happens in the same tick, so it's invisible to the user.
 */
export function useCooldown(until: number | null | undefined): boolean {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (until == null) return;
    const remaining = until - Date.now();
    if (remaining <= 0) {
      const id = globalThis.setTimeout(() => setNow(Date.now()), 0);
      return () => globalThis.clearTimeout(id);
    }
    const timer = globalThis.setTimeout(() => setNow(Date.now()), remaining);
    return () => globalThis.clearTimeout(timer);
  }, [until]);

  return until != null && until > now;
}
