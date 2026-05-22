import { useState, useEffect } from 'react';
import { Collapsible } from '../../ui';
import styles from './MoshSplitSection.module.css';

// ── Mock data — swap ACTIVE_MOCK to test all states during review ──
type Expense = {
  label: string;
  amount: number; // negative = you owe your share, positive = others owe you
};

type MoshSplitBalance = {
  found: boolean;
  balance: number;
  currency: string;
  festival: string;
  expenses?: Expense[];
};

const MOCKS: Record<string, MoshSplitBalance> = {
  not_found: { found: false, balance: 0,     currency: 'EUR', festival: 'Wacken 2026' },
  settled:   { found: true,  balance: 0,     currency: 'EUR', festival: 'Wacken 2026' },
  owes: {
    found: true, balance: -42.5, currency: 'EUR', festival: 'Wacken 2026',
    expenses: [
      { label: 'Hotel — night 1',    amount: -20   },
      { label: 'Supermarket run',    amount: -12.5 },
      { label: 'Taxi to campsite',   amount:  -6   },
      { label: 'Parking split',      amount:  -4   },
    ],
  },
  owed: {
    found: true, balance: 15, currency: 'EUR', festival: 'Wacken 2026',
    expenses: [
      { label: 'Beer round (×3)',    amount:  30  },
      { label: 'Festival shuttle',   amount:  -8  },
      { label: 'Merch haul split',   amount:  -7  },
    ],
  },
  loading: { found: true, balance: 0, currency: 'EUR', festival: 'Wacken 2026' },
};

const ACTIVE_MOCK = MOCKS.owes;

// Cycle order for the dev CTA tap: owes → owed → settled → owes ...
const CYCLE: MoshSplitBalance[] = [MOCKS.owes, MOCKS.owed, MOCKS.settled];

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

type LoadState = 'loading' | 'not_found' | 'settled' | 'active';

function applyMock(mock: MoshSplitBalance, setData: (d: MoshSplitBalance) => void, setLoadState: (s: LoadState) => void) {
  setData(mock);
  if (!mock.found) setLoadState('not_found');
  else if (mock.balance === 0) setLoadState('settled');
  else setLoadState('active');
}

export default function MoshSplitSection({ userEmail: _userEmail }: MoshSplitSectionProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<MoshSplitBalance | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(() => CYCLE.indexOf(ACTIVE_MOCK));

  useEffect(() => {
    setLoadState('loading');
    setData(null);

    // Part 1: mock fetch with 200ms latency
    const timer = setTimeout(() => {
      if (ACTIVE_MOCK === MOCKS.loading) return; // stays in loading for demo
      applyMock(ACTIVE_MOCK, setData, setLoadState);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  function handleCtaClick(e: React.MouseEvent) {
    e.preventDefault();
    const nextIdx = (cycleIdx + 1) % CYCLE.length;
    setCycleIdx(nextIdx);
    applyMock(CYCLE[nextIdx], setData, setLoadState);
  }

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
              src="https://split.viralatas.org/moshsplit/assets/logo.svg"
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

    if (loadState === 'settled') {
      return (
        <div className={styles.inner}>
          <div className={styles.settledMsg}>
            <span>🤘</span>
            <span>All settled</span>
          </div>
          <button type="button" className={styles.cta} onClick={handleCtaClick}>
            <span>Open MoshSplit</span>
            <span className={styles.ctaArrow}>→</span>
          </button>
        </div>
      );
    }

    if (loadState === 'active' && data) {
      const isOwes = data.balance < 0;
      return (
        <div className={styles.inner}>
          {data.expenses && data.expenses.length > 0 && (
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
          <button type="button" className={styles.cta} onClick={handleCtaClick}>
            <span>Open MoshSplit</span>
            <span className={styles.ctaArrow}>→</span>
          </button>
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
