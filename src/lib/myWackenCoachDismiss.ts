const MY_WACKEN_COACH_DISMISS_KEY = 'viralatas:my-wacken-ended-coach-dismissed';

export function isMyWackenCoachDismissed(): boolean {
  try {
    return localStorage.getItem(MY_WACKEN_COACH_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissMyWackenCoach(): void {
  try {
    localStorage.setItem(MY_WACKEN_COACH_DISMISS_KEY, '1');
  } catch {
    // best-effort per-device preference
  }
}

export function clearMyWackenCoachDismissForTests(): void {
  try {
    localStorage.removeItem(MY_WACKEN_COACH_DISMISS_KEY);
  } catch {
    // ignore
  }
}

export { MY_WACKEN_COACH_DISMISS_KEY };
