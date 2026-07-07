const PWA_INSTALL_HINT_DISMISS_KEY = 'viralatas:pwa-install-hint-dismissed';

export function isPwaInstallHintDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_INSTALL_HINT_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPwaInstallHint(): void {
  try {
    localStorage.setItem(PWA_INSTALL_HINT_DISMISS_KEY, '1');
  } catch {
    // best-effort per-device preference
  }
}

export function clearPwaInstallHintDismissForTests(): void {
  try {
    localStorage.removeItem(PWA_INSTALL_HINT_DISMISS_KEY);
  } catch {
    // ignore
  }
}

export { PWA_INSTALL_HINT_DISMISS_KEY };
