import { useCallback, useEffect, useState } from 'react';
import {
  isBeforeInstallPromptEvent,
  isAndroidDevice,
  isIosDevice,
  isMobileDevice,
  isStandalonePwa,
  type BeforeInstallPromptEvent,
} from '../lib/pwaInstall';
import { isPwaInstallHintDismissed } from '../lib/pwaInstallDismiss';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalonePwa());

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installNative = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const shouldAutoShow =
    !installed &&
    isMobileDevice() &&
    !isStandalonePwa() &&
    !isPwaInstallHintDismissed();

  return {
    shouldAutoShow,
    isIos: isIosDevice(),
    isAndroid: isAndroidDevice(),
    hasNativeInstall: deferredPrompt != null,
    installNative,
    isStandalone: installed || isStandalonePwa(),
  };
}
