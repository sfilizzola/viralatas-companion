import { useState, useEffect } from 'react';
import type { Language } from '../../lib/i18n';
import {
  clearTimeOverride,
  formatWackenDatetimeLocal,
  getTimeOverride,
  parseWackenDatetimeLocal,
  setTimeOverride,
  TIME_OVERRIDE_CHANGED_EVENT,
} from '../../services/time';
import styles from '../../pages/ProfilePage.module.css';

type TimeTravelSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
  language: Language;
};

const DATE_LOCALES: Record<Language, string> = {
  br: 'pt-BR',
  en: 'en-GB',
  es: 'es-ES',
  de: 'de-DE',
};

function formatWackenLocal(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[language], {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso));
}

// CEST = UTC+2, so 22:00 CEST = 20:00 UTC. Each entry is "festival day at 22:00 CEST".
const TIME_TRAVEL_DAY_CHIPS: { key: string; label: string; date: string; iso: string }[] = [
  { key: 'pre',  label: 'D-1', date: '28/07', iso: '2026-07-28T20:00:00Z' },
  { key: 'd1',   label: 'D1',  date: '29/07', iso: '2026-07-29T20:00:00Z' },
  { key: 'd2',   label: 'D2',  date: '30/07', iso: '2026-07-30T20:00:00Z' },
  { key: 'd3',   label: 'D3',  date: '31/07', iso: '2026-07-31T20:00:00Z' },
  { key: 'd4',   label: 'D4',  date: '01/08', iso: '2026-08-01T20:00:00Z' },
  { key: 'post', label: 'D+1', date: '02/08', iso: '2026-08-02T20:00:00Z' },
];

function chipDateWithCurrentTime(chipIso: string, currentInput: string): string {
  const chipLocal = formatWackenDatetimeLocal(chipIso);
  if (!currentInput || currentInput.length < 16) return chipLocal;
  const [chipDate] = chipLocal.split('T');
  const [, currentTime] = currentInput.split('T');
  return `${chipDate}T${currentTime}`;
}

export default function TimeTravelSection({ t, language }: TimeTravelSectionProps) {
  const [override, setOverride] = useState<string | null>(() => getTimeOverride());
  const [inputValue, setInputValue] = useState<string>(() => {
    const stored = getTimeOverride();
    return stored ? formatWackenDatetimeLocal(stored) : '';
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handler() {
      const next = getTimeOverride();
      setOverride(next);
      if (next) setInputValue(formatWackenDatetimeLocal(next));
    }
    window.addEventListener(TIME_OVERRIDE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(TIME_OVERRIDE_CHANGED_EVENT, handler);
  }, []);

  function applyLocalInput(value: string) {
    setError(null);
    try {
      setTimeOverride(parseWackenDatetimeLocal(value));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('timeTravelInvalid'));
    }
  }

  function handleQuickDay(chipIso: string) {
    const next = chipDateWithCurrentTime(chipIso, inputValue);
    setInputValue(next);
    applyLocalInput(next);
  }

  function handleSet() {
    if (!inputValue) return;
    applyLocalInput(inputValue);
  }

  function handleClear() {
    setError(null);
    clearTimeOverride();
    setInputValue('');
  }

  return (
    <div className={styles.liveBandTestSection}>
      <h4 className={styles.liveBandTestSectionTitle}>{t('timeTravelTitle')}</h4>
      <p className={styles.liveBandTestDescription}>{t('timeTravelDescription')}</p>
      <p className={styles.liveBandTestDescription}>{t('timeTravelWrapDisclaimer')}</p>
      {override && (
        <p className={styles.liveBandTestActive}>
          {t('timeTravelActive', { time: formatWackenLocal(override, language) })}
        </p>
      )}
      {error && <div className={styles.metalPlaceError}>⚠️ {error}</div>}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('timeTravelQuickDay')}</label>
        <div className={styles.timeTravelChipRow}>
          {TIME_TRAVEL_DAY_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={styles.timeTravelChip}
              onClick={() => handleQuickDay(chip.iso)}
              title={t(`timeTravelChip_${chip.key}`)}
            >
              <strong>{chip.label}</strong>
              <span>{chip.date}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.metalPlaceForm}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('timeTravelInputLabel')}</label>
          <input
            type="datetime-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={styles.formInput}
          />
        </div>
        <div className={styles.liveBandTestButtonRow}>
          <button
            className={styles.saveButton}
            onClick={handleSet}
            disabled={!inputValue}
            type="button"
          >
            {t('timeTravelSet')}
          </button>
          <button
            className={styles.liveBandTestClearButton}
            onClick={handleClear}
            disabled={!override && !inputValue}
            type="button"
          >
            {t('timeTravelClear')}
          </button>
        </div>
      </div>
    </div>
  );
}
