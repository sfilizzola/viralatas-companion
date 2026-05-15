import styles from './ErrorState.module.css';

type ErrorVariant = 'network' | 'sync' | 'auth';

type ErrorStateProps = {
  variant: ErrorVariant;
  onRetry?: () => void;
  message?: string;
};

const DEFAULT_MESSAGES: Record<ErrorVariant, string> = {
  network: 'Sem sinal. No modo offline. 🤘',
  sync: 'Erro ao sincronizar. Tentaremos de novo.',
  auth: 'Sessão expirada. Por favor, entre novamente.',
};

const RETRY_LABELS: Record<ErrorVariant, string> = {
  network: '',
  sync: 'Tentar de novo',
  auth: 'Entrar',
};

function NetworkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function AuthIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const ICONS: Record<ErrorVariant, () => JSX.Element> = {
  network: NetworkIcon,
  sync: SyncIcon,
  auth: AuthIcon,
};

export default function ErrorState({ variant, onRetry, message }: Readonly<ErrorStateProps>) {
  const copy = message ?? DEFAULT_MESSAGES[variant];
  const retryLabel = RETRY_LABELS[variant];
  const Icon = ICONS[variant];

  return (
    <div className={`${styles.errorState} ${styles[variant]}`} role="status" aria-live="polite">
      <span className={styles.icon}><Icon /></span>
      <p className={styles.message}>{copy}</p>
      {onRetry && retryLabel && (
        <button className={styles.retryBtn} onClick={onRetry} type="button">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
