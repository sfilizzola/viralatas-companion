import { useState, useEffect, useCallback, type MutableRefObject } from 'react';
import { loadMetalPlaceConfig } from '../../lib/db';
import { presenceRepository } from '../../repositories';
import { saveLiveBandTestConfigRemote } from '../../services/liveBandTest';
import { Select } from '../../ui';
import styles from '../../pages/ProfilePage.module.css';

export type MetalPlaceBridge = {
  getFields: () => { day: number | ''; startTime: string; endTime: string };
  setTestModeEnabled: (enabled: boolean) => void;
};

type MetalPlaceAdminSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
  previousTestModeRef: MutableRefObject<boolean>;
  liveBandTestActiveBandId: string | null;
  onClearLiveBandTest: () => Promise<void>;
  onBridgeUpdate: (bridge: MetalPlaceBridge | null) => void;
};

export default function MetalPlaceAdminSection({
  t,
  previousTestModeRef,
  liveBandTestActiveBandId,
  onClearLiveBandTest,
  onBridgeUpdate,
}: MetalPlaceAdminSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [day, setDay] = useState<number | ''>(1);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('23:00');

  useEffect(() => {
    async function loadMetalPlaceConfigFromDB() {
      try {
        const config = await loadMetalPlaceConfig();
        if (config) {
          setDay(config.festival_day || '');
          setStartTime(config.start_time || '12:00');
          setEndTime(config.end_time || '23:00');
          const isTestModeOn = config.test_override_day !== null && config.test_override_day !== undefined;
          setTestModeEnabled(isTestModeOn);
          previousTestModeRef.current = isTestModeOn;
        }
      } catch (err) {
        console.error('Failed to load Metal Place config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetalPlaceConfigFromDB();
  }, [previousTestModeRef]);

  useEffect(() => {
    onBridgeUpdate({
      getFields: () => ({ day, startTime, endTime }),
      setTestModeEnabled,
    });
    return () => onBridgeUpdate(null);
  }, [day, startTime, endTime, onBridgeUpdate]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const wasTestModeOn = previousTestModeRef.current;
      const isTestModeNowOff = !testModeEnabled && wasTestModeOn;
      const enablingTestMode = testModeEnabled && !wasTestModeOn;
      const festivalDay = day === '' ? null : day;

      if (enablingTestMode && liveBandTestActiveBandId) {
        const ok = window.confirm(t('liveBandTestConflictWithMetalPlace'));
        if (!ok) {
          setSaving(false);
          return;
        }
        await saveLiveBandTestConfigRemote({ id: 1, band_id: null, enabled: false });
        await onClearLiveBandTest();
      }

      await presenceRepository.saveMetalPlaceConfigRemote({
        id: 1,
        festival_day: festivalDay,
        start_time: startTime || null,
        end_time: endTime || null,
        test_override_day: testModeEnabled ? (festivalDay ?? 1) : null,
      });

      if (isTestModeNowOff) {
        await presenceRepository.autoCheckoutAllUsers();
      }

      previousTestModeRef.current = testModeEnabled;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('metalPlaceSaveError'));
    } finally {
      setSaving(false);
    }
  }, [
    day,
    endTime,
    liveBandTestActiveBandId,
    onClearLiveBandTest,
    previousTestModeRef,
    startTime,
    t,
    testModeEnabled,
  ]);

  if (loading) return null;

  return (
    <div className={styles.metalPlaceSection}>
      <h4 className={styles.metalPlaceSectionTitle}>{t('metalPlaceTitle')}</h4>
      {error && <div className={styles.metalPlaceError}>⚠️ {error}</div>}
      <div className={styles.metalPlaceForm}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('metalPlaceFestivalDay')}</label>
          <Select
            value={day}
            onChange={(e) => setDay(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            className={styles.formInput}
            disabled={saving}
          >
            <option value="">{t('metalPlaceDayUnset')}</option>
            <option value={1}>{t('metalPlaceDay1')}</option>
            <option value={2}>{t('metalPlaceDay2')}</option>
            <option value={3}>{t('metalPlaceDay3')}</option>
            <option value={4}>{t('metalPlaceDay4')}</option>
          </Select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('metalPlaceStartTime')}</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={styles.formInput}
            disabled={saving}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('metalPlaceEndTime')}</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={styles.formInput}
            disabled={saving}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={testModeEnabled}
              onChange={(e) => setTestModeEnabled(e.target.checked)}
              disabled={saving}
            />
            {t('metalPlaceTestMode')}
          </label>
          {testModeEnabled && (
            <p className={styles.testModeHint}>{t('metalPlaceTestModeHint')}</p>
          )}
        </div>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving} type="button">
          {saving ? t('metalPlaceSaving') : t('metalPlaceSave')}
        </button>
      </div>
    </div>
  );
}
