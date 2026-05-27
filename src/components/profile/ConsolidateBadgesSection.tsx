import { useEffect, useMemo, useState } from 'react';
import { loadBands } from '../../lib/db';
import {
  badgeHistoryRepository,
  type ConsolidateBadgesResult,
} from '../../repositories/badgeHistoryRepository';
import { getCurrentFestivalYear } from '../../services/badges/currentFestivalYear';
import { isFestivalEnded, now } from '../../services/time';
import { Modal } from '../../ui';
import styles from '../../pages/ProfilePage.module.css';

type ConsolidateBadgesSectionProps = Readonly<{
  t: (key: string, values?: Record<string, string | number>) => string;
}>;

export default function ConsolidateBadgesSection({ t }: ConsolidateBadgesSectionProps) {
  const defaultYear = getCurrentFestivalYear();
  const [year, setYear] = useState(defaultYear);
  const [force, setForce] = useState(false);
  const [festivalEnded, setFestivalEnded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsolidateBadgesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkEnded() {
      const bands = await loadBands();
      if (!active) return;
      setFestivalEnded(isFestivalEnded(now(), bands));
    }

    void checkEnded();

    function onTimeOverrideChanged() {
      void checkEnded();
    }

    window.addEventListener('viralatas:time-override-changed', onTimeOverrideChanged);
    return () => {
      active = false;
      window.removeEventListener('viralatas:time-override-changed', onTimeOverrideChanged);
    };
  }, []);

  const canRun = force || festivalEnded;

  const yearOptions = useMemo(() => {
    const years = new Set<number>([defaultYear]);
    if (year) years.add(year);
    return [...years].sort((a, b) => b - a);
  }, [defaultYear, year]);

  async function handleConfirm() {
    setConfirmOpen(false);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await badgeHistoryRepository.consolidateYear(year, force);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('consolidateError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.liveBandTestSection}>
      <h4 className={styles.liveBandTestSectionTitle}>{t('consolidateTitle')}</h4>
      <p className={styles.liveBandTestDescription}>{t('consolidateDescription')}</p>

      <label className={styles.consolidateField}>
        <span>{t('consolidateYearLabel')}</span>
        <select
          className={styles.consolidateSelect}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          disabled={loading}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.consolidateForceRow}>
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          disabled={loading}
        />
        <span>{t('consolidateForce')}</span>
      </label>

      {!canRun && (
        <p className={styles.testModeHint}>{t('consolidateGateHint')}</p>
      )}

      {error && <p className={styles.metalPlaceError}>{error}</p>}

      {result && (
        <p className={styles.resetMessage}>
          {t('consolidateResult', {
            processedUsers: result.processedUsers,
            savedBadges: result.savedBadges,
            errors: result.errors.length,
          })}
        </p>
      )}

      <button
        className={styles.saveButton}
        type="button"
        disabled={loading || !canRun}
        onClick={() => setConfirmOpen(true)}
      >
        {loading ? t('consolidateRunning') : t('consolidateButton', { year })}
      </button>

      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <h3 className={styles.consolidateModalTitle}>{t('consolidateModalTitle', { year })}</h3>
          <p className={styles.liveBandTestDescription}>{t('consolidateModalBody')}</p>
          <div className={styles.consolidateModalActions}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={() => void handleConfirm()}
            >
              {t('consolidateConfirm')}
            </button>
            <button
              type="button"
              className={styles.pfSignOutBtn}
              onClick={() => setConfirmOpen(false)}
            >
              {t('close')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
