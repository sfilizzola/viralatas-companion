import { useState, useEffect, useCallback } from 'react';
import { loadCampLocation } from '../../lib/db';
import { campLocationRepository } from '../../repositories';
import {
  formatCampCoordinates,
  parseCampCoordinateInput,
  type CampCoordinateParseError,
} from '../../services/campLocation';
import styles from '../../pages/ProfilePage.module.css';

type CampingLocationAdminSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

function parseErrorMessage(error: CampCoordinateParseError, t: CampingLocationAdminSectionProps['t']): string {
  switch (error) {
    case 'invalid_latitude':
      return t('campLocationInvalidLatitude');
    case 'invalid_longitude':
      return t('campLocationInvalidLongitude');
    default:
      return t('campLocationInvalidFormat');
  }
}

export default function CampingLocationAdminSection({ t }: CampingLocationAdminSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadFromCache() {
      try {
        const location = await loadCampLocation();
        if (location) {
          setInput(formatCampCoordinates(location));
        }
      } catch (err) {
        console.error('Failed to load camp location:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFromCache();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const parsed = parseCampCoordinateInput(input);
    if (!parsed.ok) {
      setError(parseErrorMessage(parsed.error, t));
      setSaving(false);
      return;
    }

    try {
      await campLocationRepository.saveCampLocationRemote(parsed.value);
      setInput(formatCampCoordinates(parsed.value));
      setSuccess(t('campLocationSaveSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('campLocationSaveError'));
    } finally {
      setSaving(false);
    }
  }, [input, t]);

  const handleClear = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await campLocationRepository.clearCampLocationRemote();
      setInput('');
      setSuccess(t('campLocationCleared'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('campLocationSaveError'));
    } finally {
      setSaving(false);
    }
  }, [t]);

  if (loading) return null;

  return (
    <div className={styles.metalPlaceSection}>
      <h4 className={styles.metalPlaceSectionTitle}>{t('campLocationTitle')}</h4>
      <p className={styles.metalPlaceDescription}>{t('campLocationDescription')}</p>

      {error && <div className={styles.metalPlaceError}>⚠️ {error}</div>}
      {success && <p className={styles.liveBandTestActive}>{success}</p>}

      <div className={styles.metalPlaceForm}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="camp-location-input">
            GPS
          </label>
          <input
            id="camp-location-input"
            className={styles.formInput}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            placeholder={t('campLocationPlaceholder')}
            disabled={saving}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className={styles.liveBandTestButtonRow}>
          <button className={styles.saveButton} onClick={handleSave} disabled={saving} type="button">
            {saving ? t('campLocationSaving') : t('campLocationSave')}
          </button>
          <button
            className={styles.liveBandTestClearButton}
            onClick={handleClear}
            disabled={saving}
            type="button"
          >
            {t('campLocationClear')}
          </button>
        </div>
      </div>
    </div>
  );
}
