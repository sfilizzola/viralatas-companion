import { useState, type ChangeEvent, type FormEvent, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import type { Band, LiveBandTestConfig, UserPick, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n, type Language } from '../lib/i18n';
import {
  loadAllUserPicks,
  loadBands,
  loadLiveBandTestConfig,
  loadMetalPlaceConfig,
  loadUserPicks,
  PICKS_CHANGED_EVENT,
} from '../lib/db';
import { togglePick } from '../lib/picks';
import { fetchCurrentUserRole, fetchAllUsers, fetchBlockedPostersWithUserDetails, setUserRole as updateUserRole, unblockUser } from '../lib/announcements';
import { invalidateCacheForAllUsers } from '../lib/cache';
import { getRegistrationEnabled, setRegistrationEnabled } from '../lib/appSettings';
import { saveMetalPlaceConfigRemote, autoCheckoutAllUsersFromMetalPlace } from '../lib/presence';
import { saveLiveBandTestConfigRemote } from '../lib/liveBandTest';
import {
  clearTimeOverride,
  getTimeOverride,
  setTimeOverride,
  TIME_OVERRIDE_CHANGED_EVENT,
} from '../lib/time';
import { VERSION } from '../version';
import BottomNav from '../components/BottomNav';
import BadgesDisplay from '../components/BadgesDisplay';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { language, setLanguage, t } = useI18n('ProfilePage');
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = (user?.user_metadata?.['display_name'] as string | undefined) ?? user?.email ?? '';
  const avatarUrl = user?.user_metadata?.['avatar_url'] as string | undefined;

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.appName}>Viralatas 🤘</span>
        <button className={styles.logoutBtn} onClick={handleLogout}>{t('logout')}</button>
      </header>

      {user && (
        <ProfileForm
          key={`${user.id}:${language}`}
          user={user}
          displayName={displayName}
          avatarUrl={avatarUrl ?? null}
          language={language}
          setLanguage={setLanguage}
          t={t}
          userId={user.id}
        />
      )}

      <div style={{ textAlign: 'center', padding: '2rem 1rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        Caramelo Tech v{VERSION}
      </div>

      <div style={{ height: 56 }} />
      <BottomNav />
    </div>
  );
}

type ProfileFormProps = {
  user: AuthUser;
  displayName: string;
  avatarUrl: string | null;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  userId: string;
};

function ProfileForm({
  user,
  displayName,
  avatarUrl,
  language,
  setLanguage,
  t,
  userId,
}: ProfileFormProps) {
  const initial = displayName.charAt(0).toUpperCase();
  const [newName, setNewName] = useState(displayName);
  const [newLanguage, setNewLanguage] = useState<Language>(language);
  const [newAvatarUrl, setNewAvatarUrl] = useState(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [newWackenYears, setNewWackenYears] = useState<number[]>(
    Array.isArray(user.user_metadata?.['wacken_years'])
      ? (user.user_metadata['wacken_years'] as number[])
      : []
  );
  const [newCountry, setNewCountry] = useState<string>(
    (user.user_metadata?.['country'] as string | undefined) ?? ''
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    setLanguage(newLanguage);
    await supabase.auth.updateUser({
      data: {
        display_name: newName,
        preferred_language: newLanguage,
        avatar_url: newAvatarUrl,
        wacken_years: newWackenYears,
        country: newCountry || null,
      },
    });
    await supabase
      .from('users')
      .update({
        display_name: newName,
        preferred_language: newLanguage,
        avatar_url: newAvatarUrl,
        wacken_years: newWackenYears,
        country: newCountry || null,
      })
      .eq('id', user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoError(false);
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setPhotoError(true);
      event.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      setPhotoError(true);
      setUploadingPhoto(false);
      event.target.value = '';
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setNewAvatarUrl(data.publicUrl);
    setUploadingPhoto(false);
    event.target.value = '';
  }

  function handleYearToggle(year: number, checked: boolean) {
    setNewWackenYears((prev) =>
      checked ? [...prev, year] : prev.filter((y) => y !== year)
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.avatar}>
        {newAvatarUrl ? (
          <img className={styles.avatarImg} src={newAvatarUrl} alt="" />
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </div>
      <h2 className={styles.name}>{displayName}</h2>
      <p className={styles.email}>{user.email}</p>

      <BadgesDisplay user={user} />

      <form onSubmit={handleSave} className={styles.form}>
        <label className={styles.label}>
          {t('crewName')}
          <input
            className={styles.input}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={30}
          />
        </label>
        <label className={styles.label}>
          {t('language')}
          <select
            className={styles.input}
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value as Language)}
          >
            <option value="br">{t('portuguese')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </label>
        <label className={styles.label}>
          {t('photo')}
          <span className={styles.photoHelp}>{t('photoHelp')}</span>
          <span className={styles.fileButton}>
            {uploadingPhoto ? t('uploadingPhoto') : t('choosePhoto')}
            <input
              className={styles.fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploadingPhoto}
              onChange={handlePhotoChange}
            />
          </span>
        </label>
        {photoError && <p className={styles.error}>{t('photoError')}</p>}

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('wackenYears')}</legend>
          {[2022, 2023, 2024, 2025, 2026].map((year) => (
            <label key={year} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newWackenYears.includes(year)}
                onChange={(e) => handleYearToggle(year, e.target.checked)}
              />
              {year}
            </label>
          ))}
        </fieldset>

        <label className={styles.label}>
          {t('country')}
          <select
            className={styles.input}
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
          >
            <option value="">{t('countryPlaceholder')}</option>
            <option value="de">{t('countryDe')}</option>
            <option value="es">{t('countryEs')}</option>
            <option value="br">{t('countryBr')}</option>
            <option value="us">{t('countryUs')}</option>
            <option value="co">{t('countryCo')}</option>
            <option value="be">{t('countryBe')}</option>
            <option value="other">{t('countryOther')}</option>
          </select>
        </label>

        <button className={styles.button} type="submit" disabled={saving}>
          {saved ? `${t('saveDone')} ✓` : saving ? t('saveLoading') : t('saveProfile')}
        </button>
      </form>

      <ConflictSection userId={userId} t={t} />
      <GodlikeSection userId={userId} t={t} />
      <ManagerSection userId={userId} t={t} />
    </main>
  );
}

// Helper functions for conflict detection
const WACKEN_START = new Date('2026-07-29T00:00:00Z');
const DAY_DURATION_MS = 24 * 60 * 60 * 1000;

function getFestivalDay(isoTime: string): number {
  const time = new Date(isoTime);
  const dayOffset = Math.floor((time.getTime() - WACKEN_START.getTime()) / DAY_DURATION_MS);
  return dayOffset + 1;
}

function hasConflict(bandA: Band, bandB: Band): boolean {
  const aStartMs = new Date(bandA.start_time).getTime();
  const aEndMs = new Date(bandA.end_time).getTime();
  const bStartMs = new Date(bandB.start_time).getTime();
  const bEndMs = new Date(bandB.end_time).getTime();
  const bufferMs = 30 * 60 * 1000;

  return aStartMs < bEndMs + bufferMs && bStartMs < aEndMs + bufferMs;
}

type ConflictPair = {
  bandA: Band;
  bandB: Band;
  day: number;
};

function detectConflicts(bands: Band[]): ConflictPair[] {
  const conflicts: ConflictPair[] = [];
  for (let i = 0; i < bands.length; i++) {
    for (let j = i + 1; j < bands.length; j++) {
      if (hasConflict(bands[i], bands[j])) {
        conflicts.push({
          bandA: bands[i],
          bandB: bands[j],
          day: getFestivalDay(bands[i].start_time),
        });
      }
    }
  }
  return conflicts;
}

function formatTime(isoTime: string): string {
  const date = new Date(isoTime);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

type ConflictSectionProps = {
  userId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
};

function ConflictSection({ userId, t }: ConflictSectionProps) {
  const [bands, setBands] = useState<Band[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictPair | null>(null);

  useEffect(() => {
    async function load() {
      const [loadedBands, loadedPicks] = await Promise.all([loadBands(), loadUserPicks(userId)]);
      setBands(loadedBands);
      setPicks(loadedPicks);
      setLoading(false);
    }

    load();

    function handlePicksChange() {
      loadUserPicks(userId).then(setPicks);
    }

    window.addEventListener(PICKS_CHANGED_EVENT, handlePicksChange);
    return () => window.removeEventListener(PICKS_CHANGED_EVENT, handlePicksChange);
  }, [userId]);

  const pickedBands = useMemo(() => {
    const pickedIds = new Set(picks.map((p) => p.band_id));
    return bands.filter((b) => pickedIds.has(b.id));
  }, [bands, picks]);

  const conflicts = useMemo(() => detectConflicts(pickedBands), [pickedBands]);

  const conflictsByDay = useMemo(() => {
    const grouped = new Map<number, ConflictPair[]>();
    for (const conflict of conflicts) {
      if (!grouped.has(conflict.day)) {
        grouped.set(conflict.day, []);
      }
      grouped.get(conflict.day)!.push(conflict);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, pairs]) => ({ day, pairs }));
  }, [conflicts]);

  const handleKeepBand = useCallback(
    async (_bandToKeep: Band, bandToRemove: Band) => {
      await togglePick(userId, bandToRemove.id, true);
      setSelectedConflict(null);
    },
    [userId],
  );

  if (loading || conflicts.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.conflictsSection}>
        <button
          className={styles.conflictsHeader}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <div className={styles.conflictsTitle}>
            <span>{t('conflicts')}</span>
            <div className={styles.conflictBadge}>{conflicts.length}</div>
          </div>
          <div className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>▼</div>
        </button>

        <div className={`${styles.conflictsContent} ${isOpen ? styles.open : ''}`}>
          <div className={styles.conflictsInner}>
            {conflictsByDay.map(({ day, pairs }) => (
              <div key={day} className={styles.dayGroup}>
                <div className={styles.dayGroupTitle}>{t('day', { day })}</div>
                {pairs.map((conflict, idx) => (
                  <button
                    key={idx}
                    className={styles.conflictCard}
                    onClick={() => setSelectedConflict(conflict)}
                    type="button"
                  >
                    <div className={styles.conflictCardBands}>
                      <span className={styles.bandName}>{conflict.bandA.name}</span>
                      <span className={styles.conflictIndicator}>⚠️</span>
                      <span className={styles.bandName}>{conflict.bandB.name}</span>
                    </div>
                    <div className={styles.conflictCardTimes}>
                      <span className={styles.bandTime}>
                        {formatTime(conflict.bandA.start_time)} - {formatTime(conflict.bandA.end_time)}
                      </span>
                      <span className={styles.bandTime}>
                        {formatTime(conflict.bandB.start_time)} - {formatTime(conflict.bandB.end_time)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedConflict && (
        <div
          className={styles.conflictModal}
          onClick={() => setSelectedConflict(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.conflictModalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.conflictModalTitle}>{t('conflictModalTitle')}</h3>

            {[selectedConflict.bandA, selectedConflict.bandB].map((band) => (
              <div key={band.id}>
                <div className={styles.conflictBandOption}>
                  <div className={styles.conflictBandName}>{band.name}</div>
                  <div className={styles.conflictBandInfo}>
                    <div>{band.stage}</div>
                    <div>
                      {formatTime(band.start_time)} - {formatTime(band.end_time)}
                    </div>
                  </div>
                </div>
                <button
                  className={styles.conflictButton}
                  onClick={() =>
                    handleKeepBand(
                      band,
                      band.id === selectedConflict.bandA.id
                        ? selectedConflict.bandB
                        : selectedConflict.bandA,
                    )
                  }
                  type="button"
                >
                  {t('keepBand', { band: band.name })}
                </button>
              </div>
            ))}

            <button
              className={`${styles.conflictButton} ${styles.conflictCloseButton}`}
              onClick={() => setSelectedConflict(null)}
              type="button"
            >
              {t('close') ?? 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

type GodlikeSectionProps = {
  userId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
};

type UserWithLoading = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  loading?: boolean;
  error?: string;
};

function GodlikeSection({ userId, t }: GodlikeSectionProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserWithLoading[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [blockedPosters, setBlockedPosters] = useState<Array<{ user_id: string }>>([]);
  const [registrationEnabled, setRegistrationEnabledState] = useState(true);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [metalPlaceLoading, setMetalPlaceLoading] = useState(true);
  const [metalPlaceSaving, setMetalPlaceSaving] = useState(false);
  const [metalPlaceError, setMetalPlaceError] = useState<string | null>(null);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [metalPlaceDay, setMetalPlaceDay] = useState<number | ''>(1);
  const [metalPlaceStartTime, setMetalPlaceStartTime] = useState('12:00');
  const [metalPlaceEndTime, setMetalPlaceEndTime] = useState('23:00');
  const previousTestModeRef = useRef(false);
  const [liveBandTestLoading, setLiveBandTestLoading] = useState(true);
  const [liveBandTestSaving, setLiveBandTestSaving] = useState(false);
  const [liveBandTestError, setLiveBandTestError] = useState<string | null>(null);
  const [liveBandTestSelectedId, setLiveBandTestSelectedId] = useState<string>('');
  const [liveBandTestEnabled, setLiveBandTestEnabled] = useState(false);
  const [liveBandTestActiveBandId, setLiveBandTestActiveBandId] = useState<string | null>(null);
  const [bandsByPopularity, setBandsByPopularity] = useState<Array<Band & { pickCount: number }>>([]);

  useEffect(() => {
    async function loadRole() {
      const role = await fetchCurrentUserRole(userId);
      setUserRole(role);
      setLoading(false);
    }
    loadRole();
  }, [userId]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const [users, blocked] = await Promise.all([
          fetchAllUsers(),
          fetchBlockedPostersWithUserDetails(),
        ]);
        setAllUsers(users as UserWithLoading[]);
        setBlockedPosters(blocked.map(b => ({ user_id: b.user_id })));
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setUsersLoading(false);
      }
    }

    if (userRole === 'godlike') {
      loadUsers();
    }
  }, [userRole]);

  useEffect(() => {
    async function loadRegistrationStatus() {
      try {
        const enabled = await getRegistrationEnabled();
        setRegistrationEnabledState(enabled);
      } catch (error) {
        console.error('Failed to load registration status:', error);
      }
    }

    if (userRole === 'godlike') {
      loadRegistrationStatus();
    }
  }, [userRole]);

  useEffect(() => {
    async function loadMetalPlaceConfigFromDB() {
      try {
        const config = await loadMetalPlaceConfig();
        if (config) {
          setMetalPlaceDay(config.festival_day || '');
          setMetalPlaceStartTime(config.start_time || '12:00');
          setMetalPlaceEndTime(config.end_time || '23:00');
          const isTestModeOn = config.test_override_day !== null && config.test_override_day !== undefined;
          setTestModeEnabled(isTestModeOn);
          previousTestModeRef.current = isTestModeOn;
        }
      } catch (error) {
        console.error('Failed to load Metal Place config:', error);
      } finally {
        setMetalPlaceLoading(false);
      }
    }

    if (userRole === 'godlike') {
      loadMetalPlaceConfigFromDB();
    }
  }, [userRole]);

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
          setLiveBandTestSelectedId(config.band_id ?? '');
          setLiveBandTestEnabled(config.enabled ?? false);
          setLiveBandTestActiveBandId(config.enabled && config.band_id ? config.band_id : null);
        }
      } catch (error) {
        console.error('Failed to load Live Band Test config:', error);
      } finally {
        setLiveBandTestLoading(false);
      }
    }

    if (userRole === 'godlike') {
      loadLiveBandTest();
    }
  }, [userRole]);

  const handleResetAllData = useCallback(async () => {
    const confirmMsg = t('resetConfirm');
    if (!window.confirm(confirmMsg)) return;

    setResetting(true);
    setResetMessage(null);

    try {
      await invalidateCacheForAllUsers();
      setResetMessage(t('resetSuccess'));
      setTimeout(() => setResetMessage(null), 4000);
    } catch (error) {
      console.error('Reset failed:', error);
      setResetMessage(t('resetError'));
      setTimeout(() => setResetMessage(null), 4000);
    } finally {
      setResetting(false);
    }
  }, [t]);

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

  const handlePromoteOrDemote = useCallback(
    async (targetUserId: string, currentRole: string) => {
      const newRole = currentRole === 'normal' ? 'manager' : 'normal';

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, loading: true, error: undefined } : u,
        ),
      );

      const originalUsers = [...allUsers];

      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)),
      );

      try {
        await updateUserRole(targetUserId, newRole as 'normal' | 'manager');
      } catch (error) {
        console.error('Failed to update user role:', error);
        setAllUsers(originalUsers);
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === targetUserId
              ? { ...u, role: currentRole, error: t('erroRole') }
              : u,
          ),
        );

        setTimeout(() => {
          setAllUsers((prev) =>
            prev.map((u) => (u.id === targetUserId ? { ...u, error: undefined } : u)),
          );
        }, 3000);
      } finally {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, loading: false } : u)),
        );
      }
    },
    [allUsers, t],
  );

  const handleUnblock = useCallback(
    async (targetUserId: string) => {
      const confirmMsg = t('unblockConfirm');
      if (!window.confirm(confirmMsg)) return;

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, loading: true, error: undefined } : u,
        ),
      );

      try {
        await unblockUser(targetUserId);
        setBlockedPosters((prev) => prev.filter((bp) => bp.user_id !== targetUserId));
      } catch (error) {
        console.error('Unblock failed:', error);
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === targetUserId
              ? { ...u, error: t('unblockError') }
              : u,
          ),
        );

        setTimeout(() => {
          setAllUsers((prev) =>
            prev.map((u) => (u.id === targetUserId ? { ...u, error: undefined } : u)),
          );
        }, 3000);
      } finally {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, loading: false } : u)),
        );
      }
    },
    [t],
  );

  if (loading || userRole !== 'godlike') {
    return null;
  }

  const getInitial = (displayName: string | null, email: string): string => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'godlike':
        return '#d97706';
      case 'manager':
        return '#3b82f6';
      default:
        return 'var(--text-muted)';
    }
  };

  return (
    <div className={styles.godlikeSection}>
      <div className={styles.divider} />
      <div className={styles.collapsibleCard}>
        <button
          className={styles.conflictsHeader}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-expanded={isOpen}
        >
          <h3 className={styles.godlikeTitle}>🤘 GODLIKE POWERS</h3>
          <div className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>▼</div>
        </button>
        <div className={`${styles.conflictsContent} ${isOpen ? styles.open : ''}`}>
          <div className={styles.conflictsInner}>
            <div className={styles.godlikeSectionContent}>
        <button
          className={`${styles.resetButton} ${resetting ? styles.resetting : ''}`}
          onClick={handleResetAllData}
          disabled={resetting}
          type="button"
        >
          {resetting ? `${t('resetting')} ⏳` : t('resetAllData')}
        </button>

        {resetMessage && <p className={styles.resetMessage}>{resetMessage}</p>}

        <div className={styles.registrationControlContainer}>
          <label className={styles.registrationControlLabel}>
            {t('registrationToggle')}
            <button
              className={`${styles.registrationToggleButton} ${registrationEnabled ? styles.enabled : styles.disabled}`}
              onClick={handleToggleRegistration}
              disabled={registrationLoading}
              type="button"
            >
              {registrationLoading ? (
                '⏳'
              ) : registrationEnabled ? (
                `${t('registrationEnabled')} ✓`
              ) : (
                `${t('registrationDisabled')} ✗`
              )}
            </button>
          </label>
          {registrationError && <p className={styles.registrationError}>{registrationError}</p>}
        </div>

        {!metalPlaceLoading && (
          <div className={styles.metalPlaceSection}>
            <h4 className={styles.metalPlaceSectionTitle}>{t('metalPlaceTitle')}</h4>
            {metalPlaceError && (
              <div className={styles.metalPlaceError}>
                ⚠️ {metalPlaceError}
              </div>
            )}
            <div className={styles.metalPlaceForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('metalPlaceFestivalDay')}</label>
                <select
                  value={metalPlaceDay}
                  onChange={(e) => setMetalPlaceDay(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className={styles.formInput}
                  disabled={metalPlaceSaving}
                >
                  <option value="">{t('metalPlaceDayUnset')}</option>
                  <option value={1}>{t('metalPlaceDay1')}</option>
                  <option value={2}>{t('metalPlaceDay2')}</option>
                  <option value={3}>{t('metalPlaceDay3')}</option>
                  <option value={4}>{t('metalPlaceDay4')}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('metalPlaceStartTime')}</label>
                <input
                  type="time"
                  value={metalPlaceStartTime}
                  onChange={(e) => setMetalPlaceStartTime(e.target.value)}
                  className={styles.formInput}
                  disabled={metalPlaceSaving}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('metalPlaceEndTime')}</label>
                <input
                  type="time"
                  value={metalPlaceEndTime}
                  onChange={(e) => setMetalPlaceEndTime(e.target.value)}
                  className={styles.formInput}
                  disabled={metalPlaceSaving}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={testModeEnabled}
                    onChange={(e) => setTestModeEnabled(e.target.checked)}
                    disabled={metalPlaceSaving}
                  />
                  {t('metalPlaceTestMode')}
                </label>
                {testModeEnabled && (
                  <p className={styles.testModeHint}>{t('metalPlaceTestModeHint')}</p>
                )}
              </div>
              <button
                className={styles.saveButton}
                onClick={async () => {
                  setMetalPlaceSaving(true);
                  setMetalPlaceError(null);
                  try {
                    const wasTestModeOn = previousTestModeRef.current;
                    const isTestModeNowOff = !testModeEnabled && wasTestModeOn;
                    const enablingTestMode = testModeEnabled && !wasTestModeOn;
                    const festivalDay = metalPlaceDay === '' ? null : metalPlaceDay;

                    // Mutual safety: enabling Metal Place test mode disables Live Band Test.
                    if (enablingTestMode && liveBandTestActiveBandId) {
                      const ok = window.confirm(t('liveBandTestConflictWithMetalPlace'));
                      if (!ok) {
                        setMetalPlaceSaving(false);
                        return;
                      }
                      await saveLiveBandTestConfigRemote({
                        id: 1,
                        band_id: null,
                        enabled: false,
                      });
                      setLiveBandTestSelectedId('');
                      setLiveBandTestEnabled(false);
                      setLiveBandTestActiveBandId(null);
                    }

                    // Test mode pins the active day via test_override_day; the real
                    // festival_day, start_time, and end_time stay as configured.
                    await saveMetalPlaceConfigRemote({
                      id: 1,
                      festival_day: festivalDay,
                      start_time: metalPlaceStartTime || null,
                      end_time: metalPlaceEndTime || null,
                      test_override_day: testModeEnabled ? (festivalDay ?? 1) : null,
                    });

                    if (isTestModeNowOff) {
                      await autoCheckoutAllUsersFromMetalPlace();
                    }

                    previousTestModeRef.current = testModeEnabled;
                  } catch (err) {
                    setMetalPlaceError(err instanceof Error ? err.message : t('metalPlaceSaveError'));
                  } finally {
                    setMetalPlaceSaving(false);
                  }
                }}
                disabled={metalPlaceSaving}
              >
                {metalPlaceSaving ? t('metalPlaceSaving') : t('metalPlaceSave')}
              </button>
            </div>
          </div>
        )}

        {!liveBandTestLoading && (
          <div className={styles.liveBandTestSection}>
            <h4 className={styles.liveBandTestSectionTitle}>{t('liveBandTestTitle')}</h4>
            <p className={styles.liveBandTestDescription}>{t('liveBandTestDescription')}</p>
            {liveBandTestActiveBandId && (
              <p className={styles.liveBandTestActive}>
                {t('liveBandTestActive', {
                  band:
                    bandsByPopularity.find((b) => b.id === liveBandTestActiveBandId)?.name ?? '?',
                })}
              </p>
            )}
            {liveBandTestError && (
              <div className={styles.metalPlaceError}>⚠️ {liveBandTestError}</div>
            )}
            <div className={styles.metalPlaceForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('liveBandTestSelect')}</label>
                <select
                  value={liveBandTestSelectedId}
                  onChange={(e) => setLiveBandTestSelectedId(e.target.value)}
                  className={styles.formInput}
                  disabled={liveBandTestSaving}
                >
                  <option value="">{t('liveBandTestUnset')}</option>
                  {bandsByPopularity.map((band) => (
                    <option key={band.id} value={band.id}>
                      {band.name} — {band.pickCount}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={liveBandTestEnabled}
                    onChange={(e) => setLiveBandTestEnabled(e.target.checked)}
                    disabled={liveBandTestSaving || !liveBandTestSelectedId}
                  />
                  {t('liveBandTestEnable')}
                </label>
              </div>
              <div className={styles.liveBandTestButtonRow}>
                <button
                  className={styles.saveButton}
                  onClick={async () => {
                    setLiveBandTestSaving(true);
                    setLiveBandTestError(null);
                    try {
                      const enabling = liveBandTestEnabled && !!liveBandTestSelectedId;
                      // Mutual safety: enabling Live Band Test disables Metal Place test mode.
                      if (enabling && previousTestModeRef.current) {
                        const ok = window.confirm(t('liveBandTestConflictWithMetalPlace'));
                        if (!ok) {
                          setLiveBandTestSaving(false);
                          return;
                        }
                        const festivalDay = metalPlaceDay === '' ? null : metalPlaceDay;
                        await saveMetalPlaceConfigRemote({
                          id: 1,
                          festival_day: festivalDay,
                          start_time: metalPlaceStartTime || null,
                          end_time: metalPlaceEndTime || null,
                          test_override_day: null,
                        });
                        setTestModeEnabled(false);
                        previousTestModeRef.current = false;
                        await autoCheckoutAllUsersFromMetalPlace();
                      }

                      const config: LiveBandTestConfig = {
                        id: 1,
                        band_id: liveBandTestSelectedId || null,
                        enabled: enabling,
                      };
                      await saveLiveBandTestConfigRemote(config);
                      setLiveBandTestActiveBandId(enabling ? liveBandTestSelectedId : null);
                    } catch (err) {
                      setLiveBandTestError(
                        err instanceof Error ? err.message : t('liveBandTestSaveError'),
                      );
                    } finally {
                      setLiveBandTestSaving(false);
                    }
                  }}
                  disabled={liveBandTestSaving}
                >
                  {liveBandTestSaving ? t('metalPlaceSaving') : t('liveBandTestSave')}
                </button>
                <button
                  className={styles.liveBandTestClearButton}
                  onClick={async () => {
                    setLiveBandTestSaving(true);
                    setLiveBandTestError(null);
                    try {
                      await saveLiveBandTestConfigRemote({
                        id: 1,
                        band_id: null,
                        enabled: false,
                      });
                      setLiveBandTestSelectedId('');
                      setLiveBandTestEnabled(false);
                      setLiveBandTestActiveBandId(null);
                    } catch (err) {
                      setLiveBandTestError(
                        err instanceof Error ? err.message : t('liveBandTestSaveError'),
                      );
                    } finally {
                      setLiveBandTestSaving(false);
                    }
                  }}
                  disabled={liveBandTestSaving}
                  type="button"
                >
                  {t('liveBandTestClear')}
                </button>
              </div>
            </div>
          </div>
        )}

        <TimeTravelSection />

        <div className={styles.userManagementSection}>
          <h4 className={styles.userManagementTitle}>{t('registeredUsers')}</h4>
          {usersLoading ? (
            <p className={styles.userListLoading}>{t('registeredUsersLoading')}</p>
          ) : allUsers.length === 0 ? (
            <p className={styles.emptyUserList}>{t('registeredUsersEmpty')}</p>
          ) : (
            <div className={styles.userList}>
              {allUsers.map((user) => (
                <div key={user.id} className={styles.userRow}>
                  <div className={styles.userInfo}>
                    <div
                      className={styles.userAvatar}
                      style={{
                        backgroundColor: 'var(--accent)',
                      }}
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className={styles.userAvatarImg} />
                      ) : (
                        <span>{getInitial(user.display_name, user.email)}</span>
                      )}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userDisplayName}>
                        {user.display_name || user.email}
                      </div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                  </div>

                  <div className={styles.userActionArea}>
                    <div
                      className={styles.roleBadge}
                      style={{ color: getRoleBadgeColor(user.role) }}
                    >
                      {user.role === 'godlike' ? '🤘' : user.role === 'manager' ? '🔧' : '👤'}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </div>

                    {user.role !== 'godlike' && (
                      <button
                        className={`${styles.userActionButton} ${user.loading ? styles.loading : ''}`}
                        onClick={() => handlePromoteOrDemote(user.id, user.role)}
                        disabled={user.loading}
                        type="button"
                      >
                        {user.loading ? (
                          <span className={styles.spinner}>⏳</span>
                        ) : user.role === 'normal' ? (
                          t('promoverManager')
                        ) : (
                          t('removerManager')
                        )}
                      </button>
                    )}

                    {blockedPosters.some((bp) => bp.user_id === user.id) && (
                      <button
                        className={`${styles.userActionButton} ${user.loading ? styles.loading : ''}`}
                        onClick={() => handleUnblock(user.id)}
                        disabled={user.loading}
                        type="button"
                      >
                        {user.loading ? (
                          <span className={styles.spinner}>⏳</span>
                        ) : (
                          t('unblockUser')
                        )}
                      </button>
                    )}
                  </div>

                  {user.error && <p className={styles.userRowError}>{user.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWackenLocal(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'br' ? 'pt-BR' : 'en-GB', {
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

// Replace the date portion of an existing local datetime string ("YYYY-MM-DDTHH:mm")
// with the date implied by the chip's UTC instant, projected into the user's TZ.
// Keeps whatever HH:mm the user has already typed.
function chipDateWithCurrentTime(chipIso: string, currentInput: string): string {
  const chipLocal = toDatetimeLocalValue(chipIso); // chip default at 22:00 CEST in local TZ
  if (!currentInput || currentInput.length < 16) return chipLocal;
  const [chipDate] = chipLocal.split('T');
  const [, currentTime] = currentInput.split('T');
  return `${chipDate}T${currentTime}`;
}

function TimeTravelSection() {
  const { t, language } = useI18n('ProfilePage');
  const [override, setOverride] = useState<string | null>(() => getTimeOverride());
  const [inputValue, setInputValue] = useState<string>(() => {
    const stored = getTimeOverride();
    return stored ? toDatetimeLocalValue(stored) : '';
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handler() {
      const next = getTimeOverride();
      setOverride(next);
      if (next) setInputValue(toDatetimeLocalValue(next));
    }
    window.addEventListener(TIME_OVERRIDE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(TIME_OVERRIDE_CHANGED_EVENT, handler);
  }, []);

  function applyLocalInput(value: string) {
    setError(null);
    try {
      setTimeOverride(new Date(value).toISOString());
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

type ManagerSectionProps = {
  userId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
};

function ManagerSection({ userId, t }: ManagerSectionProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<UserWithLoading[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadRole() {
      const role = await fetchCurrentUserRole(userId);
      setUserRole(role);
    }
    loadRole();
  }, [userId]);

  useEffect(() => {
    async function loadBlocked() {
      if (userRole === 'manager' || userRole === 'godlike') {
        try {
          const blocked = await fetchBlockedPostersWithUserDetails();
          setBlockedUsers(blocked.map(bp => ({
            id: bp.user_id,
            email: bp.user_email,
            display_name: bp.user_display_name,
            avatar_url: bp.user_avatar_url,
            role: 'blocked',
          })));
        } catch (error) {
          console.error('Failed to load blocked users:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadBlocked();
  }, [userRole]);

  const handleUnblock = useCallback(
    async (blockedUserId: string) => {
      const confirmMsg = t('unblockConfirm');
      if (!window.confirm(confirmMsg)) return;

      setBlockedUsers((prev) =>
        prev.map((u) =>
          u.id === blockedUserId ? { ...u, loading: true, error: undefined } : u,
        ),
      );

      try {
        await unblockUser(blockedUserId);
        setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedUserId));
      } catch (error) {
        console.error('Unblock failed:', error);
        setBlockedUsers((prev) =>
          prev.map((u) =>
            u.id === blockedUserId
              ? { ...u, error: t('unblockError') }
              : u,
          ),
        );
        setTimeout(() => {
          setBlockedUsers((prev) =>
            prev.map((u) => (u.id === blockedUserId ? { ...u, error: undefined } : u)),
          );
        }, 3000);
      } finally {
        setBlockedUsers((prev) =>
          prev.map((u) =>
            u.id === blockedUserId ? { ...u, loading: false } : u,
          ),
        );
      }
    },
    [t],
  );

  if (loading || userRole !== 'manager') {
    return null;
  }

  const getInitial = (displayName: string | null, email: string): string => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className={styles.managerSection}>
      <div className={styles.divider} />
      <div className={styles.collapsibleCard}>
        <button
          className={styles.conflictsHeader}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-expanded={isOpen}
        >
          <h3 className={styles.managerTitle}>🔧 MANAGER POWERS</h3>
          <div className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>▼</div>
        </button>
        <div className={`${styles.conflictsContent} ${isOpen ? styles.open : ''}`}>
          <div className={styles.conflictsInner}>
            <div className={styles.managerSectionContent}>
        <div className={styles.blockedUsersSection}>
          <h4 className={styles.blockedUsersTitle}>{t('blockedUsers')}</h4>
          {blockedUsers.length === 0 ? (
            <p className={styles.emptyBlockedList}>{t('noBlockedUsers')}</p>
          ) : (
            <div className={styles.blockedUserList}>
              {blockedUsers.map((user) => (
                <div key={user.id} className={styles.blockedUserRow}>
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar} style={{ backgroundColor: 'var(--accent)' }}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className={styles.userAvatarImg} />
                      ) : (
                        <span>{getInitial(user.display_name, user.email)}</span>
                      )}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userDisplayName}>
                        {user.display_name || user.email}
                      </div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                  </div>

                  {user.id === userId ? (
                    <div className={styles.cantUnblockSelf}>
                      {t('cantUnblockSelf') || 'Ask another manager'}
                    </div>
                  ) : (
                    <button
                      className={`${styles.userActionButton} ${user.loading ? styles.loading : ''}`}
                      onClick={() => handleUnblock(user.id)}
                      disabled={user.loading}
                      type="button"
                    >
                      {user.loading ? <span className={styles.spinner}>⏳</span> : t('unblockUser')}
                    </button>
                  )}

                  {user.error && <p className={styles.userRowError}>{user.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
