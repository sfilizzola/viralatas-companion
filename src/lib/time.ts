export const TIME_OVERRIDE_STORAGE_KEY = 'viralatas-time-override';
export const TIME_OVERRIDE_CHANGED_EVENT = 'viralatas:time-override-changed';

export function getTimeOverride(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TIME_OVERRIDE_STORAGE_KEY);
}

export function now(): Date {
  const override = getTimeOverride();
  if (override) {
    const d = new Date(override);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function setTimeOverride(iso: string): void {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid time override: ${iso}`);
  }
  localStorage.setItem(TIME_OVERRIDE_STORAGE_KEY, d.toISOString());
  window.dispatchEvent(new Event(TIME_OVERRIDE_CHANGED_EVENT));
}

export function clearTimeOverride(): void {
  localStorage.removeItem(TIME_OVERRIDE_STORAGE_KEY);
  window.dispatchEvent(new Event(TIME_OVERRIDE_CHANGED_EVENT));
}

export function isTimeOverrideActive(): boolean {
  return getTimeOverride() !== null;
}
