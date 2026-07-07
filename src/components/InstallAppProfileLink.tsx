import { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { usePwaInstall } from '../hooks/usePwaInstall';
import InstallAppModal from './InstallAppModal';
import styles from './InstallAppProfileLink.module.css';

export default function InstallAppProfileLink() {
  const { t } = useI18n('InstallApp');
  const install = usePwaInstall();
  const [open, setOpen] = useState(false);

  if (install.isStandalone) return null;

  return (
    <>
      <section className={styles.section}>
        <button type="button" className={styles.row} onClick={() => setOpen(true)}>
          <span className={styles.label}>{t('profileLink')}</span>
          <span className={styles.hint}>{t('profileLinkHint')}</span>
        </button>
      </section>

      <InstallAppModal
        open={open}
        mode="manual"
        isIos={install.isIos}
        isAndroid={install.isAndroid}
        hasNativeInstall={install.hasNativeInstall}
        installNative={install.installNative}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
