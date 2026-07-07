import { useEffect, useState } from 'react';
import { dismissPwaInstallHint } from '../lib/pwaInstallDismiss';
import { usePwaInstall } from '../hooks/usePwaInstall';
import InstallAppModal from './InstallAppModal';

export default function PwaInstallAutoPrompt() {
  const install = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [prompted, setPrompted] = useState(false);

  useEffect(() => {
    if (prompted || !install.shouldAutoShow) return;
    setOpen(true);
    setPrompted(true);
  }, [install.shouldAutoShow, prompted]);

  if (!open) return null;

  return (
    <InstallAppModal
      open={open}
      mode="auto"
      isIos={install.isIos}
      isAndroid={install.isAndroid}
      hasNativeInstall={install.hasNativeInstall}
      installNative={install.installNative}
      onClose={() => setOpen(false)}
      onDismissPermanently={dismissPwaInstallHint}
    />
  );
}
