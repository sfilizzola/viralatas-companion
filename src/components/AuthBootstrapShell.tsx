import { useI18n } from '../lib/i18n';
import styles from './AuthBootstrapShell.module.css';

export default function AuthBootstrapShell() {
  const { t } = useI18n('AuthPage');

  return (
    <div className={styles.shell}>
      <span className={styles.label}>{t('authBootstrapping')}</span>
    </div>
  );
}
