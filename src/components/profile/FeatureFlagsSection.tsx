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

type FlagRowProps = {
  label: string;
  hint: string;
  isOn: boolean;
  isLoading: boolean;
  error: string | null;
  onToggle: () => void;
};

function FlagRow({ label, hint, isOn, isLoading, error, onToggle }: FlagRowProps) {
  return (
    <div className={styles.ffRow}>
      <div className={styles.ffRowLeft}>
        <span className={styles.ffLabel}>{label}</span>
        <button
          className={styles.ffHintBtn}
          type="button"
          aria-label="Info"
          tabIndex={0}
          data-hint={hint}
        >
          ?
        </button>
      </div>
      <button
        className={`${styles.ffPill} ${isOn ? styles.ffOn : styles.ffOff}`}
        onClick={onToggle}
        disabled={isLoading}
        type="button"
        aria-pressed={isOn}
        aria-label={label}
      />
      {error && <span className={styles.ffRowError}>{error}</span>}
    </div>
  );
}

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
    getRegistrationEnabled().then(setRegistrationEnabledState).catch(console.error);
  }, []);

  useEffect(() => {
    getDuckEnabled()
      .then((enabled) => {
        setDuckFeatureEnabledState(enabled);
        onDuckEnabledChange?.(enabled);
      })
      .catch(console.error);
  }, [onDuckEnabledChange]);

  useEffect(() => {
    getPlaylistTesting().then(setPlaylistTestingEnabledState).catch(console.error);
  }, []);

  useEffect(() => {
    getMoshSplitEnabled().then(setMoshSplitFeatureEnabledState).catch(console.error);
  }, []);

  const handleToggleRegistration = useCallback(async () => {
    setRegistrationLoading(true);
    setRegistrationError(null);
    try {
      const newValue = !registrationEnabled;
      await setRegistrationEnabled(newValue);
      setRegistrationEnabledState(newValue);
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      setMoshSplitFeatureError(t('moshsplitToggleError'));
      setTimeout(() => setMoshSplitFeatureError(null), 3000);
    } finally {
      setMoshSplitFeatureLoading(false);
    }
  }, [moshSplitFeatureEnabled, t]);

  return (
    <div className={styles.ffCard}>
      <p className={styles.ffCardTitle}>{t('featureFlagsTitle')}</p>
      <div className={styles.ffList}>
        <FlagRow
          label={t('registrationToggle')}
          hint={t('registrationToggleDescription')}
          isOn={registrationEnabled}
          isLoading={registrationLoading}
          error={registrationError}
          onToggle={handleToggleRegistration}
        />
        <FlagRow
          label={t('duckToggle')}
          hint={t('duckToggleDescription')}
          isOn={duckFeatureEnabled}
          isLoading={duckFeatureLoading}
          error={duckFeatureError}
          onToggle={handleToggleDuckFeature}
        />
        <FlagRow
          label={t('playlistToggle')}
          hint={t('playlistToggleDescription')}
          isOn={!playlistTestingEnabled}
          isLoading={playlistTestingLoading}
          error={playlistTestingError}
          onToggle={handleTogglePlaylistTesting}
        />
        <FlagRow
          label={t('moshsplitToggle')}
          hint={t('moshsplitToggleDescription')}
          isOn={moshSplitFeatureEnabled}
          isLoading={moshSplitFeatureLoading}
          error={moshSplitFeatureError}
          onToggle={handleToggleMoshSplitFeature}
        />
      </div>
    </div>
  );
}
