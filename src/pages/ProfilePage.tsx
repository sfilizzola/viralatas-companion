import { useState, type ChangeEvent, type FormEvent, useEffect, useCallback, useMemo } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import type { Band, UserPick } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n, type Language } from '../lib/i18n';
import { loadBands, loadUserPicks, PICKS_CHANGED_EVENT } from '../lib/db';
import { togglePick } from '../lib/picks';
import BottomNav from '../components/BottomNav';
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

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    setLanguage(newLanguage);
    await supabase.auth.updateUser({
      data: {
        display_name: newName,
        preferred_language: newLanguage,
        avatar_url: newAvatarUrl,
      },
    });
    await supabase
      .from('users')
      .update({
        display_name: newName,
        preferred_language: newLanguage,
        avatar_url: newAvatarUrl,
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
        <button className={styles.button} type="submit" disabled={saving}>
          {saved ? `${t('saveDone')} ✓` : saving ? t('saveLoading') : t('saveProfile')}
        </button>
      </form>

      <ConflictSection userId={userId} t={t} />
    </main>
  );
}

// Helper functions for conflict detection
const WACKEN_START = new Date('2025-08-01T00:00:00Z');
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
