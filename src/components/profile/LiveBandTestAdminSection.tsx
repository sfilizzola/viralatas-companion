import { useState, useEffect, useCallback } from 'react';
import type { Band, LiveBandTestConfig } from '../../types';
import { loadBands, loadAllUserPicks, loadLiveBandTestConfig } from '../../lib/db';
import { saveLiveBandTestConfigRemote } from '../../services/liveBandTest';
import { Select } from '../../ui';
import styles from '../../pages/ProfilePage.module.css';

type LiveBandTestAdminSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function LiveBandTestAdminSection({
  t,
}: LiveBandTestAdminSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [enabled, setEnabled] = useState(false);
  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const [bandsByPopularity, setBandsByPopularity] = useState<Array<Band & { pickCount: number }>>([]);

  const clearLiveBandTest = useCallback(async () => {
    await saveLiveBandTestConfigRemote({ id: 1, band_id: null, enabled: false });
    setSelectedId('');
    setEnabled(false);
    setActiveBandId(null);
  }, []);

  useEffect(() => {
    async function loadLiveBandTest() {
      try {
        const [allBands, allPicks, config] = await Promise.all([
          loadBands(),
          loadAllUserPicks(),
          loadLiveBandTestConfig(),
        ]);
        const counts = new Map<string, number>();
        for (const pick of allPicks) {
          counts.set(pick.band_id, (counts.get(pick.band_id) ?? 0) + 1);
        }
        const sorted = allBands
          .map((b) => ({ ...b, pickCount: counts.get(b.id) ?? 0 }))
          .sort((a, b) => {
            if (b.pickCount !== a.pickCount) return b.pickCount - a.pickCount;
            return a.name.localeCompare(b.name);
          });
        setBandsByPopularity(sorted);
        if (config) {
          setSelectedId(config.band_id ?? '');
          setEnabled(config.enabled ?? false);
          const activeId = config.enabled && config.band_id ? config.band_id : null;
          setActiveBandId(activeId);
        }
      } catch (err) {
        console.error('Failed to load Live Band Test config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLiveBandTest();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const enabling = enabled && !!selectedId;
      const config: LiveBandTestConfig = {
        id: 1,
        band_id: selectedId || null,
        enabled: enabling,
      };
      await saveLiveBandTestConfigRemote(config);
      const nextActiveId = enabling ? selectedId : null;
      setActiveBandId(nextActiveId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('liveBandTestSaveError'));
    } finally {
      setSaving(false);
    }
  }, [enabled, selectedId, t]);

  const handleClear = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await clearLiveBandTest();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('liveBandTestSaveError'));
    } finally {
      setSaving(false);
    }
  }, [clearLiveBandTest, t]);

  if (loading) return null;

  return (
    <div className={styles.liveBandTestSection}>
      <h4 className={styles.liveBandTestSectionTitle}>{t('liveBandTestTitle')}</h4>
      <p className={styles.liveBandTestDescription}>{t('liveBandTestDescription')}</p>
      {activeBandId && (
        <p className={styles.liveBandTestActive}>
          {t('liveBandTestActive', {
            band: bandsByPopularity.find((b) => b.id === activeBandId)?.name ?? '?',
          })}
        </p>
      )}
      {error && <div className={styles.metalPlaceError}>⚠️ {error}</div>}
      <div className={styles.metalPlaceForm}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('liveBandTestSelect')}</label>
          <Select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={styles.formInput}
            disabled={saving}
          >
            <option value="">{t('liveBandTestUnset')}</option>
            {bandsByPopularity.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name} — {band.pickCount}
              </option>
            ))}
          </Select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={saving || !selectedId}
            />
            {t('liveBandTestEnable')}
          </label>
        </div>
        <div className={styles.liveBandTestButtonRow}>
          <button className={styles.saveButton} onClick={handleSave} disabled={saving} type="button">
            {saving ? t('metalPlaceSaving') : t('liveBandTestSave')}
          </button>
          <button
            className={styles.liveBandTestClearButton}
            onClick={handleClear}
            disabled={saving}
            type="button"
          >
            {t('liveBandTestClear')}
          </button>
        </div>
      </div>
    </div>
  );
}
