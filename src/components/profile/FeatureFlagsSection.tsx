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
  getBadgesEnabled,
  setBadgesEnabled,
} from '../../lib/appSettings';
import { useRefreshDuckEnabled } from '../../contexts/DuckEnabledContext';
import { useSetBadgesEnabled } from '../../contexts/BadgesEnabledContext';
import styles from '../../pages/ProfilePage.module.css';

type FeatureFlagsSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
  onDuckEnabledChange?: (enabled: boolean) => void;
  // Duck is festival-scoped, so the caller decides whether the row belongs here.
  // Defaults to hidden: a caller that never opts in never fetches duck_enabled.
  showDuckToggle?: boolean;
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

export default function FeatureFlagsSection({
  t,
  onDuckEnabledChange,
  showDuckToggle = false,
}: FeatureFlagsSectionProps) {
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

  // Fail-hidden default, matching BadgesEnabledContext: never show the pill as ON
  // before the real value is known.
  const [badgesFeatureEnabled, setBadgesFeatureEnabledState] = useState(false);
  // Starts true so the pill is disabled until the initial read settles. Toggling
  // off an unknown value would write the negation of the placeholder `false`
  // rather than of the stored flag.
  const [badgesFeatureLoading, setBadgesFeatureLoading] = useState(true);
  const [badgesFeatureError, setBadgesFeatureError] = useState<string | null>(null);
  const applyBadgesEnabled = useSetBadgesEnabled();

  useEffect(() => {
    getRegistrationEnabled().then(setRegistrationEnabledState).catch(console.error);
  }, []);

  useEffect(() => {
    if (!showDuckToggle) return;
    let cancelled = false;
    getDuckEnabled()
      .then((enabled) => {
        if (cancelled) return;
        setDuckFeatureEnabledState(enabled);
        onDuckEnabledChange?.(enabled);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [onDuckEnabledChange, showDuckToggle]);

  useEffect(() => {
    let cancelled = false;
    getBadgesEnabled()
      .then(
        (enabled) => {
          if (cancelled) return;
          setBadgesFeatureEnabledState(enabled);
          setBadgesFeatureLoading(false);
        },
        (err) => {
          console.error(err);
          if (cancelled) return;
          // Fail-hidden: leave the flag false, but release the pill so the admin
          // can still turn badges on.
          setBadgesFeatureLoading(false);
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleToggleBadgesFeature = useCallback(async () => {
    setBadgesFeatureLoading(true);
    setBadgesFeatureError(null);
    try {
      const newValue = !badgesFeatureEnabled;
      await setBadgesEnabled(newValue);
      setBadgesFeatureEnabledState(newValue);
      // The write already confirms the value. Apply it directly so a failed
      // follow-up read cannot replace a successful ON with fail-hidden false.
      applyBadgesEnabled(newValue);
    } catch {
      setBadgesFeatureError(t('badgesToggleError'));
      setTimeout(() => setBadgesFeatureError(null), 3000);
    } finally {
      setBadgesFeatureLoading(false);
    }
  }, [applyBadgesEnabled, badgesFeatureEnabled, t]);

  return (
    <div className={styles.ffCard}>
      <p className={styles.ffCardTitle}>{t('featureFlagsTitle')}</p>
      <div className={styles.ffList}>
        <FlagRow
          label={t('badgesToggle')}
          hint={t('badgesToggleDescription')}
          isOn={badgesFeatureEnabled}
          isLoading={badgesFeatureLoading}
          error={badgesFeatureError}
          onToggle={handleToggleBadgesFeature}
        />
        <FlagRow
          label={t('registrationToggle')}
          hint={t('registrationToggleDescription')}
          isOn={registrationEnabled}
          isLoading={registrationLoading}
          error={registrationError}
          onToggle={handleToggleRegistration}
        />
        {showDuckToggle && (
          <FlagRow
            label={t('duckToggle')}
            hint={t('duckToggleDescription')}
            isOn={duckFeatureEnabled}
            isLoading={duckFeatureLoading}
            error={duckFeatureError}
            onToggle={handleToggleDuckFeature}
          />
        )}
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
