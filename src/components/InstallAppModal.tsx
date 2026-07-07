import { useCallback } from 'react';
import { useI18n } from '../lib/i18n';
import { Button, Modal } from '../ui';
import styles from './InstallAppModal.module.css';

type InstallAppModalProps = {
  open: boolean;
  mode: 'auto' | 'manual';
  isIos: boolean;
  isAndroid: boolean;
  hasNativeInstall: boolean;
  installNative: () => Promise<boolean>;
  onClose: () => void;
  onDismissPermanently?: () => void;
};

export default function InstallAppModal({
  open,
  mode,
  isIos,
  isAndroid,
  hasNativeInstall,
  installNative,
  onClose,
  onDismissPermanently,
}: InstallAppModalProps) {
  const { t } = useI18n('InstallApp');

  const dismissible = mode === 'manual';

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleGotIt = useCallback(() => {
    if (mode === 'auto') {
      onDismissPermanently?.();
    }
    onClose();
  }, [mode, onClose, onDismissPermanently]);

  const handleInstall = useCallback(async () => {
    const accepted = await installNative();
    if (accepted) {
      if (mode === 'auto') {
        onDismissPermanently?.();
      }
      onClose();
    }
  }, [installNative, mode, onClose, onDismissPermanently]);

  if (!open) return null;

  const showIosSteps = isIos;
  const showAndroidSteps = !isIos && !hasNativeInstall;

  return (
    <Modal
      onClose={handleClose}
      closeOnBackdrop={dismissible}
      closeOnEscape={dismissible}
      contentClassName={styles.panel}
      aria-label={t('title')}
    >
      <p className={styles.kicker}>PWA</p>
      <h2 className={styles.title}>{t('title')}</h2>
      <p className={styles.subtitle}>{t('subtitle')}</p>

      {hasNativeInstall && isAndroid && (
        <>
          <Button
            type="button"
            variant="primary"
            fullWidth
            className={styles.installBtn}
            onClick={() => void handleInstall()}
          >
            {t('installButton')}
          </Button>
          <p className={styles.fallback}>{t('androidOrManual')}</p>
        </>
      )}

      {showAndroidSteps && (
        <ol className={styles.steps}>
          <li className={styles.step}>{t('androidStep1')}</li>
          <li className={styles.step}>{t('androidStep2')}</li>
          <li className={styles.step}>{t('androidStep3')}</li>
        </ol>
      )}

      {showIosSteps && (
        <ol className={styles.steps}>
          <li className={styles.step}>{t('iosStep1')}</li>
          <li className={styles.step}>{t('iosStep2')}</li>
          <li className={styles.step}>{t('iosStep3')}</li>
        </ol>
      )}

      <div className={styles.actions}>
        <Button type="button" variant={mode === 'auto' ? 'primary' : 'outline'} fullWidth onClick={handleGotIt}>
          {t('gotIt')}
        </Button>
      </div>
    </Modal>
  );
}
