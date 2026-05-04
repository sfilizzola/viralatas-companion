import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n, type Language } from '../lib/i18n';
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
};

function ProfileForm({
  user,
  displayName,
  avatarUrl,
  language,
  setLanguage,
  t,
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
    </main>
  );
}
