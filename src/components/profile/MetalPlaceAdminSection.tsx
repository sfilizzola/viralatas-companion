import { useState, useEffect, useCallback } from 'react';
import { loadMetalPlaceConfig } from '../../lib/db';
import { presenceRepository } from '../../repositories';
import {
  sortMetalPlaceWindows,
  validateMetalPlaceWindows,
  type MetalPlaceValidationError,
} from '../../services/metalPlaceValidation';
import type { MetalPlaceWindow } from '../../types';
import { Select } from '../../ui';
import styles from '../../pages/ProfilePage.module.css';

const MAX_WINDOWS = 8;

type MetalPlaceAdminSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

function newDraftWindow(): MetalPlaceWindow {
  return {
    id: crypto.randomUUID(),
    festival_day: 1,
    start_time: '12:00',
    end_time: '16:00',
  };
}

function validationErrorMessage(
  error: MetalPlaceValidationError,
  t: MetalPlaceAdminSectionProps['t'],
): string {
  switch (error.key) {
    case 'metalPlaceMaxWindows':
      return t('metalPlaceMaxWindows');
    case 'metalPlaceInvalidTimeRange':
      return t('metalPlaceInvalidTimeRange');
    case 'metalPlaceEndAfter2359':
      return t('metalPlaceEndAfter2359');
    case 'metalPlaceOverlap':
      return t('metalPlaceOverlap');
    default:
      return t('metalPlaceSaveError');
  }
}

export default function MetalPlaceAdminSection({ t }: MetalPlaceAdminSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [windows, setWindows] = useState<MetalPlaceWindow[]>([]);

  useEffect(() => {
    async function loadMetalPlaceConfigFromDB() {
      try {
        const config = await loadMetalPlaceConfig();
        if (config?.windows?.length) {
          setWindows(sortMetalPlaceWindows(config.windows));
        } else {
          setWindows([]);
        }
      } catch (err) {
        console.error('Failed to load Metal Place config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetalPlaceConfigFromDB();
  }, []);

  const updateWindow = useCallback((id: string, patch: Partial<MetalPlaceWindow>) => {
    setWindows((prev) => prev.map((window) => (window.id === id ? { ...window, ...patch } : window)));
    setValidationErrors([]);
    setError(null);
  }, []);

  const handleAddWindow = useCallback(() => {
    if (windows.length >= MAX_WINDOWS) return;
    setWindows((prev) => [...prev, newDraftWindow()]);
    setValidationErrors([]);
    setError(null);
  }, [windows.length]);

  const handleDeleteWindow = useCallback(
    (id: string) => {
      if (windows.length === 1) {
        const ok = window.confirm(t('metalPlaceDisableConfirm'));
        if (!ok) return;
      }
      setWindows((prev) => prev.filter((window) => window.id !== id));
      setValidationErrors([]);
      setError(null);
    },
    [t, windows.length],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setValidationErrors([]);

    const sorted = sortMetalPlaceWindows(windows);
    const errors = validateMetalPlaceWindows(sorted);
    if (errors.length > 0) {
      setValidationErrors(errors.map((entry) => validationErrorMessage(entry, t)));
      setSaving(false);
      return;
    }

    try {
      await presenceRepository.saveMetalPlaceConfigRemote({
        id: 1,
        windows: sorted,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('metalPlaceSaveError'));
    } finally {
      setSaving(false);
    }
  }, [t, windows]);

  if (loading) return null;

  return (
    <div className={styles.metalPlaceSection}>
      <h4 className={styles.metalPlaceSectionTitle}>{t('metalPlaceTitle')}</h4>
      <p className={styles.metalPlaceDescription}>{t('metalPlaceDescription')}</p>

      {error && <div className={styles.metalPlaceError}>⚠️ {error}</div>}
      {validationErrors.length > 0 && (
        <ul className={styles.metalPlaceValidationList}>
          {validationErrors.map((message) => (
            <li key={message} className={styles.metalPlaceError}>
              ⚠️ {message}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.metalPlaceForm}>
        {windows.length === 0 && (
          <p className={styles.metalPlaceEmptyHint}>{t('metalPlaceNoWindows')}</p>
        )}

        <ul className={styles.metalPlaceWindowList}>
          {windows.map((window, index) => (
            <li key={window.id} className={styles.metalPlaceWindowRow}>
              <div className={styles.metalPlaceWindowHeader}>
                <span className={styles.metalPlaceWindowIndex}>
                  {t('metalPlaceWindowLabel', { n: index + 1 })}
                </span>
                <button
                  type="button"
                  className={styles.metalPlaceWindowDelete}
                  onClick={() => handleDeleteWindow(window.id)}
                  disabled={saving}
                  aria-label={t('metalPlaceDeleteWindow')}
                >
                  {t('metalPlaceDeleteWindow')}
                </button>
              </div>
              <Select
                value={window.festival_day}
                onChange={(e) =>
                  updateWindow(window.id, { festival_day: parseInt(e.target.value, 10) })
                }
                className={styles.metalPlaceWindowDay}
                disabled={saving}
                aria-label={t('metalPlaceFestivalDay')}
              >
                <option value={1}>{t('metalPlaceDay1')}</option>
                <option value={2}>{t('metalPlaceDay2')}</option>
                <option value={3}>{t('metalPlaceDay3')}</option>
                <option value={4}>{t('metalPlaceDay4')}</option>
              </Select>
              <div className={styles.metalPlaceWindowTimes}>
                <label className={styles.metalPlaceTimeField}>
                  <span className={styles.metalPlaceTimeLabel}>{t('metalPlaceStartTime')}</span>
                  <input
                    type="time"
                    value={window.start_time.slice(0, 5)}
                    onChange={(e) => updateWindow(window.id, { start_time: e.target.value })}
                    className={styles.metalPlaceWindowTime}
                    disabled={saving}
                  />
                </label>
                <span className={styles.metalPlaceWindowDash} aria-hidden>
                  –
                </span>
                <label className={styles.metalPlaceTimeField}>
                  <span className={styles.metalPlaceTimeLabel}>{t('metalPlaceEndTime')}</span>
                  <input
                    type="time"
                    value={window.end_time.slice(0, 5)}
                    onChange={(e) => updateWindow(window.id, { end_time: e.target.value })}
                    className={styles.metalPlaceWindowTime}
                    disabled={saving}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.metalPlaceActions}>
          <button
            type="button"
            className={styles.metalPlaceAddButton}
            onClick={handleAddWindow}
            disabled={saving || windows.length >= MAX_WINDOWS}
          >
            {t('metalPlaceAddWindow')}
          </button>
          <button className={styles.saveButton} onClick={handleSave} disabled={saving} type="button">
            {saving ? t('metalPlaceSaving') : t('metalPlaceSave')}
          </button>
        </div>
      </div>
    </div>
  );
}
