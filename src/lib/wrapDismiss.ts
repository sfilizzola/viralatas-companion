const WRAP_DISMISS_KEY = 'viralatas:wrap-dismissed-2026';

export function isWrapDismissed(): boolean {
  try {
    return localStorage.getItem(WRAP_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissWrapTeaser(): void {
  try {
    localStorage.setItem(WRAP_DISMISS_KEY, '1');
  } catch {
    // best-effort per-device preference
  }
}

export function clearWrapDismissForTests(): void {
  try {
    localStorage.removeItem(WRAP_DISMISS_KEY);
  } catch {
    // ignore
  }
}

export { WRAP_DISMISS_KEY };
