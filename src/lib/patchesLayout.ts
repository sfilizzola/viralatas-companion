/**
 * Per-device visual preference for collapsed vest patch layout.
 *
 * Stored in localStorage (not Supabase) — cosmetic, per-device, offline-safe.
 */

export type PatchesLayout = 'chaotic' | 'neat';

export const PATCHES_LAYOUT_VALUES: readonly PatchesLayout[] = ['chaotic', 'neat'] as const;

export const DEFAULT_PATCHES_LAYOUT: PatchesLayout = 'chaotic';

const STORAGE_KEY = 'viralatas:patches-layout';
export const PATCHES_LAYOUT_CHANGED_EVENT = 'viralatas:patches-layout-changed';

export function loadPatchesLayout(): PatchesLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (PATCHES_LAYOUT_VALUES as readonly string[]).includes(raw)) {
      return raw as PatchesLayout;
    }
  } catch {
    // localStorage can throw in private mode — fall through to default
  }
  return DEFAULT_PATCHES_LAYOUT;
}

export function savePatchesLayout(value: PatchesLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // best-effort; in-memory state still updates via the event
  }
  window.dispatchEvent(new CustomEvent(PATCHES_LAYOUT_CHANGED_EVENT, { detail: value }));
}
