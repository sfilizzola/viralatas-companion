import { useState, useEffect, useCallback } from 'react';
import {
  getRegistrationEnabled,
  setRegistrationEnabled,
  getDuckEnabled,
  setDuckEnabled,
  getPlaylistTesting,
  setPlaylistTesting,
  getMoshSplitEnabled,
  setMoshSplitEnabled,
} from '../../lib/appSettings';
import { useRefreshDuckEnabled } from '../../contexts/DuckEnabledContext';
import styles from '../../pages/ProfilePage.module.css';

type FeatureFlagsSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
  onDuckEnabledChange?: (enabled: boolean) => void;
};

export default function FeatureFlagsSection({ t, onDuckEnabledChange }: FeatureFlagsSectionProps) {
  const [registrationEnabled, setRegistrationEnabledState] = useState(true);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [duckFeatureEnabled, setDuckFeatureEnabledState] = useState(true);
  const [duckFeatureLoading, setDuckFeatureLoading] = useState(false);
  const [duckFeatureError, setDuckFeatureError] = useState<string | null>(null);
  const refreshDuckEnabled = useRefreshDuckEnabled();
  const [playlistTestingEnabled, setPlaylistTestingEnabledState] = useState(true);
  const [playlistTestingLoading, setPlaylistTestingLoading] = useState(false);
  const [playlistTestingError, setPlaylistTestingError] = useState<string | null>(null);
  const [moshSplitFeatureEnabled, setMoshSplitFeatureEnabledState] = useState(false);
  const [moshSplitFeatureLoading, setMoshSplitFeatureLoading] = useState(false);
  const [moshSplitFeatureError, setMoshSplitFeatureError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRegistrationStatus() {
      try {
        const enabled = await getRegistrationEnabled();
        setRegistrationEnabledState(enabled);
      } catch (error) {
        console.error('Failed to load registration status:', error);
      }
    }
    loadRegistrationStatus();
  }, []);

  useEffect(() => {
    async function loadDuckFeatureStatus() {
      try {
        const enabled = await getDuckEnabled();
        setDuckFeatureEnabledState(enabled);
        onDuckEnabledChange?.(enabled);
      } catch (error) {
        console.error('Failed to load duck killswitch status:', error);
      }
    }
    loadDuckFeatureStatus();
  }, [onDuckEnabledChange]);

  useEffect(() => {
    async function loadPlaylistTestingStatus() {
      try {
        const testing = await getPlaylistTesting();
        setPlaylistTestingEnabledState(testing);
      } catch (error) {
        console.error('Failed to load playlist_testing flag:', error);
      }
    }
    loadPlaylistTestingStatus();
  }, []);

  useEffect(() => {
    async function loadMoshSplitFeatureStatus() {
      try {
        const enabled = await getMoshSplitEnabled();
        setMoshSplitFeatureEnabledState(enabled);
      } catch (error) {
        console.error('Failed to load moshsplit_enabled flag:', error);
      }
    }
    loadMoshSplitFeatureStatus();
  }, []);

  const handleToggleRegistration = useCallback(async () => {
    setRegistrationLoading(true);
    setRegistrationError(null);
    try {
      const newValue = !registrationEnabled;
      await setRegistrationEnabled(newValue);
      setRegistrationEnabledState(newValue);
    } catch (error) {
      console.error('Failed to toggle registration:', error);
      setRegistrationError(t('registrationToggleError'));
      setTimeout(() => setRegistrationError(null), 3000);
    } finally {
      setRegistrationLoading(false);
    }
  }, [registrationEnabled, t]);

  const handleToggleDuckFeature = useCallback(async () => {
    setDuckFeatureLoading(true);
    setDuckFeatureError(null);
    try {
      const newValue = !duckFeatureEnabled;
      await setDuckEnabled(newValue);
      setDuckFeatureEnabledState(newValue);
      onDuckEnabledChange?.(newValue);
      await refreshDuckEnabled();
    } catch (error) {
      console.error('Failed to toggle duck killswitch:', error);
      setDuckFeatureError(t('duckToggleError'));
      setTimeout(() => setDuckFeatureError(null), 3000);
    } finally {
      setDuckFeatureLoading(false);
    }
  }, [duckFeatureEnabled, onDuckEnabledChange, refreshDuckEnabled, t]);

  const handleTogglePlaylistTesting = useCallback(async () => {
    setPlaylistTestingLoading(true);
    setPlaylistTestingError(null);
    try {
      const newValue = !playlistTestingEnabled;
      await setPlaylistTesting(newValue);
      setPlaylistTestingEnabledState(newValue);
    } catch (error) {
      console.error('Failed to toggle playlist_testing flag:', error);
      setPlaylistTestingError(t('playlistToggleError'));
      setTimeout(() => setPlaylistTestingError(null), 3000);
    } finally {
      setPlaylistTestingLoading(false);
    }
  }, [playlistTestingEnabled, t]);

  const handleToggleMoshSplitFeature = useCallback(async () => {
    setMoshSplitFeatureLoading(true);
    setMoshSplitFeatureError(null);
    try {
      const newValue = !moshSplitFeatureEnabled;
      await setMoshSplitEnabled(newValue);
      setMoshSplitFeatureEnabledState(newValue);
    } catch (error) {
      console.error('Failed to toggle moshsplit_enabled flag:', error);
      setMoshSplitFeatureError(t('moshsplitToggleError'));
      setTimeout(() => setMoshSplitFeatureError(null), 3000);
    } finally {
      setMoshSplitFeatureLoading(false);
    }
  }, [moshSplitFeatureEnabled, t]);

  return (
    <>
      <div className={styles.registrationSection}>
        <h4 className={styles.registrationSectionTitle}>{t('registrationToggle')}</h4>
        <p className={styles.registrationSectionDescription}>{t('registrationToggleDescription')}</p>
        {registrationError && <p className={styles.registrationError}>{registrationError}</p>}
        <div className={styles.registrationControlRow}>
          <button
            className={`${styles.registrationToggleButton} ${registrationEnabled ? styles.enabled : styles.disabled}`}
            onClick={handleToggleRegistration}
            disabled={registrationLoading}
            type="button"
          >
            {registrationLoading
              ? t('registrationLoading')
              : registrationEnabled
                ? t('registrationEnabled')
                : t('registrationDisabled')}
          </button>
          <span className={styles.registrationStatus}>
            {registrationEnabled ? '🟢' : '🔴'}
          </span>
        </div>
      </div>

      <div className={styles.registrationSection}>
        <h4 className={styles.registrationSectionTitle}>{t('duckToggle')}</h4>
        <p className={styles.registrationSectionDescription}>{t('duckToggleDescription')}</p>
        {duckFeatureError && <p className={styles.registrationError}>{duckFeatureError}</p>}
        <div className={styles.registrationControlRow}>
          <button
            className={`${styles.registrationToggleButton} ${duckFeatureEnabled ? styles.enabled : styles.disabled}`}
            onClick={handleToggleDuckFeature}
            disabled={duckFeatureLoading}
            type="button"
          >
            {duckFeatureLoading
              ? t('duckLoading')
              : duckFeatureEnabled
                ? t('duckEnabled')
                : t('duckDisabled')}
          </button>
          <span className={styles.registrationStatus}>
            {duckFeatureEnabled ? '🟢' : '🔴'}
          </span>
        </div>
      </div>

      <div className={styles.registrationSection}>
        <h4 className={styles.registrationSectionTitle}>{t('playlistToggle')}</h4>
        {playlistTestingError && <p className={styles.registrationError}>{playlistTestingError}</p>}
        <div className={styles.registrationControlRow}>
          <button
            className={`${styles.registrationToggleButton} ${playlistTestingEnabled ? styles.disabled : styles.enabled}`}
            onClick={handleTogglePlaylistTesting}
            disabled={playlistTestingLoading}
            type="button"
          >
            {playlistTestingLoading
              ? t('duckLoading')
              : playlistTestingEnabled
                ? t('playlistTesting')
                : t('playlistLive')}
          </button>
          <span className={styles.registrationStatus}>
            {playlistTestingEnabled ? '🧪' : '🟢'}
          </span>
        </div>
      </div>

      <div className={styles.registrationSection}>
        <h4 className={styles.registrationSectionTitle}>{t('moshsplitToggle')}</h4>
        <p className={styles.registrationSectionDescription}>{t('moshsplitToggleDescription')}</p>
        {moshSplitFeatureError && <p className={styles.registrationError}>{moshSplitFeatureError}</p>}
        <div className={styles.registrationControlRow}>
          <button
            className={`${styles.registrationToggleButton} ${moshSplitFeatureEnabled ? styles.enabled : styles.disabled}`}
            onClick={handleToggleMoshSplitFeature}
            disabled={moshSplitFeatureLoading}
            type="button"
          >
            {moshSplitFeatureLoading
              ? t('moshsplitLoading')
              : moshSplitFeatureEnabled
                ? t('moshsplitEnabled')
                : t('moshsplitDisabled')}
          </button>
          <span className={styles.registrationStatus}>
            {moshSplitFeatureEnabled ? '🟢' : '🔴'}
          </span>
        </div>
      </div>
    </>
  );
}
