/**
 * Per-device visual preference for the patches grid background.
 *
 * Stored in localStorage (not Supabase) — this is purely cosmetic, per-device,
 * and must work offline without any sync round-trip. Components listen to the
 * window event to react instantly when the preference changes.
 */

export type PatchesBackground = 'none' | 'grid' | 'steel' | 'indigo' | 'leather';

export const PATCHES_BG_VALUES: readonly PatchesBackground[] = [
  'none',
  'grid',
  'steel',
  'indigo',
  'leather',
] as const;

export const DEFAULT_PATCHES_BG: PatchesBackground = 'steel';

const STORAGE_KEY = 'viralatas:patches-bg';
export const PATCHES_BG_CHANGED_EVENT = 'viralatas:patches-bg-changed';

export function loadPatchesBackground(): PatchesBackground {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (PATCHES_BG_VALUES as readonly string[]).includes(raw)) {
      return raw as PatchesBackground;
    }
  } catch {
    // localStorage can throw in private mode / SSR — fall through to default
  }
  return DEFAULT_PATCHES_BG;
}

export function savePatchesBackground(value: PatchesBackground): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // best-effort; the in-memory state still updates via the event
  }
  window.dispatchEvent(new CustomEvent(PATCHES_BG_CHANGED_EVENT, { detail: value }));
}
