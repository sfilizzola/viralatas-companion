export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return 'prompt' in event && typeof (event as BeforeInstallPromptEvent).prompt === 'function';
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }

  if (typeof window !== 'undefined') {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 900;
    if (coarsePointer && narrow) return true;
  }

  return false;
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;

  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}
