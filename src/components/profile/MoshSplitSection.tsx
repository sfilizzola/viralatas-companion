import { useState, useEffect } from 'react';
import { Collapsible } from '../../ui';
import styles from './MoshSplitSection.module.css';

const MOSHSPLIT_PROXY = '/api/moshsplit';
const MOSHSPLIT_DIRECT = 'https://split.viralatas.org';
const MOSHSPLIT_TOKEN = import.meta.env.VITE_MOSHSPLIT_TOKEN as string | undefined;

// ── Internal types ────────────────────────────────────────────────

type Expense = {
  label: string;
  amount: number; // negative = you owe, positive = you are owed
};

type MoshSplitBalance = {
  balance: number;
  currency: string;
  festival: string;
  expenses: Expense[];
};

// ── API response shape ────────────────────────────────────────────

type ApiItem = {
  amount_cents: number;
  title: string;
};

type ApiResponse = {
  event_name: string;
  items: ApiItem[];
  total_balance_cents: number;
};

// ── Helpers ──────────────────────────────────────────────────────

function formatAmount(balance: number, currency: string): string {
  const abs = Math.abs(balance);
  if (currency === 'BRL') {
    const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${balance < 0 ? '- ' : '+ '}R$${formatted}`;
  }
  const formatted = abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${balance < 0 ? '- ' : '+ '}€${formatted}`;
}

function LogoFallback() {
  return (
    <div className={styles.logoFallback}>
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
        <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M4 3V2.5a3 3 0 0 1 6 0V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="7" cy="7.5" r="1" fill="currentColor"/>
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────

type MoshSplitSectionProps = Readonly<{
  userEmail: string;
}>;

type LoadState = 'loading' | 'not_found' | 'settled' | 'active' | 'error';

export default function MoshSplitSection({ userEmail }: MoshSplitSectionProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<MoshSplitBalance | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!userEmail) return;

    let cancelled = false;
    setLoadState('loading');
    setData(null);

    async function fetchBalance() {
      try {
        const res = await fetch(`${MOSHSPLIT_PROXY}/pitboss/v1/balances/external-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MOSHSPLIT_TOKEN ?? ''}`,
          },
          body: JSON.stringify({ email: userEmail }),
        });

        if (cancelled) return;

        if (res.status === 404) {
          setLoadState('not_found');
          return;
        }

        if (!res.ok) {
          setLoadState('error');
          return;
        }

        const json: ApiResponse = await res.json();
        if (cancelled) return;

        const balance = json.total_balance_cents / 100;
        const expenses: Expense[] = (json.items ?? []).map((item) => ({
          label: item.title,
          amount: item.amount_cents / 100,
        }));

        setData({
          balance,
          currency: 'EUR',
          festival: json.event_name,
          expenses,
        });

        if (balance === 0) setLoadState('settled');
        else setLoadState('active');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    }

    fetchBalance();
    return () => { cancelled = true; };
  }, [userEmail]);

  // not_found → render nothing
  if (loadState === 'not_found') return null;

  // ── Trigger ───────────────────────────────────────────────────

  const chipNode = (() => {
    if (loadState === 'loading') {
      return (
        <div className={styles.loadingChip}>
          <div className={styles.spinner} />
        </div>
      );
    }
    if (loadState === 'error') {
      return <span className={`${styles.chip} ${styles.chipError}`}>!</span>;
    }
    if (loadState === 'settled') {
      return <span className={`${styles.chip} ${styles.chipSettled}`}>Settled</span>;
    }
    if (loadState === 'active' && data) {
      const isOwes = data.balance < 0;
      return (
        <span className={`${styles.chip} ${isOwes ? styles.chipOwes : styles.chipOwed}`}>
          {formatAmount(data.balance, data.currency)}
        </span>
      );
    }
    return null;
  })();

  const trigger = (
    <div className={styles.triggerRow}>
      <div className={styles.triggerLeft}>
        <div className={styles.logo}>
          {logoError ? (
            <LogoFallback />
          ) : (
            <img
              src={`${MOSHSPLIT_DIRECT}/moshsplit/assets/logo.svg`}
              alt="MoshSplit"
              onError={() => setLogoError(true)}
            />
          )}
        </div>
        <div className={styles.labelGroup}>
          <span className={styles.label}>MoshSplit</span>
          <span className={styles.sublabel}>Wall of Debt</span>
        </div>
      </div>
      {chipNode}
    </div>
  );

  // ── CTA ───────────────────────────────────────────────────────

  const ctaButton = (
    <a
      href={MOSHSPLIT_DIRECT}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.cta}
    >
      <span>Open MoshSplit</span>
      <span className={styles.ctaArrow}>→</span>
    </a>
  );

  // ── Expanded content ──────────────────────────────────────────

  const content = (() => {
    if (loadState === 'loading') {
      return (
        <div className={styles.inner}>
          <div className={styles.skeleton}>
            <div className={`${styles.skelLine} ${styles.skelLineLong}`} />
            <div className={`${styles.skelLine} ${styles.skelLineShort}`} />
          </div>
        </div>
      );
    }

    if (loadState === 'error') {
      return (
        <div className={styles.inner}>
          <div className={styles.errorMsg}>
            <span>⚠</span>
            <span>Could not load MoshSplit data</span>
          </div>
          {ctaButton}
        </div>
      );
    }

    if (loadState === 'settled') {
      return (
        <div className={styles.inner}>
          <div className={styles.settledMsg}>
            <span>🤘</span>
            <span>All settled</span>
          </div>
          {ctaButton}
        </div>
      );
    }

    if (loadState === 'active' && data) {
      const isOwes = data.balance < 0;
      return (
        <div className={styles.inner}>
          {data.expenses.length > 0 && (
            <div className={styles.expenseList}>
              {data.expenses.map((exp) => (
                <div key={exp.label} className={styles.expenseRow}>
                  <span className={styles.expenseLabel}>{exp.label}</span>
                  <span className={`${styles.expenseAmount} ${exp.amount < 0 ? styles.balanceOwes : styles.balanceOwed}`}>
                    {formatAmount(exp.amount, data.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className={styles.divider} />
          <div className={styles.balanceRow}>
            <span className={styles.festivalName}>{data.festival}</span>
            <span className={`${styles.balanceAmount} ${isOwes ? styles.balanceOwes : styles.balanceOwed}`}>
              {formatAmount(data.balance, data.currency)}
            </span>
          </div>
          <div className={styles.divider} />
          {ctaButton}
        </div>
      );
    }

    return null;
  })();

  return (
    <div className={styles.wrap}>
      <Collapsible
        trigger={trigger}
        defaultOpen={false}
        className={styles.collapsible}
      >
        {content}
      </Collapsible>
    </div>
  );
}
