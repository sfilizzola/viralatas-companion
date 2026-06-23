import { useState, useEffect } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../types';
import { signOutUser } from '../lib/signOut';
import { useAuth } from '../hooks/useAuth';
import { useI18n, type Language } from '../lib/i18n';
import { announcementsRepository } from '../repositories';
import { getMoshSplitEnabled } from '../lib/appSettings';
import { VERSION } from '../version';
import BadgeHistorySection from '../components/BadgeHistorySection';
import BottomNav from '../components/BottomNav';
import BadgesDisplay from '../components/BadgesDisplay';
import ProfileHeader from '../components/profile/ProfileHeader';
import EditProfileForm from '../components/profile/EditProfileForm';
import ConflictSection from '../components/profile/ConflictSection';
import MoshSplitSection from '../components/profile/MoshSplitSection';
import GodlikeAdminPanel from '../components/profile/GodlikeAdminPanel';
import WrapTeaserBanner from '../components/wrap/WrapTeaserBanner';
import { useWrapTeaserVisible } from '../hooks/useWrapTeaserVisible';
import ManagerAdminPanel from '../components/profile/ManagerAdminPanel';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { language, setLanguage, t } = useI18n('ProfilePage');
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = (user?.user_metadata?.['display_name'] as string | undefined) ?? user?.email ?? '';
  const avatarUrl = user?.user_metadata?.['avatar_url'] as string | undefined;

  async function handleLogout() {
    await signOutUser();
    navigate('/login');
  }

  return (
    <div className={styles.container}>
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

      <div className={styles.pfSignOutWrap}>
        <button className={styles.pfSignOutBtn} onClick={handleLogout} type="button">
          {t('logout')}
        </button>
      </div>

      <div className={styles.pfVersion}>
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
};

function ProfileForm({ user, displayName, avatarUrl: initialAvatarUrl, language, setLanguage, t }: ProfileFormProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  const initial = displayName.charAt(0).toUpperCase();
  const savedCountry = (user.user_metadata?.['country'] as string | undefined) ?? null;
  const savedWackenYears: number[] = Array.isArray(user.user_metadata?.['wacken_years'])
    ? (user.user_metadata['wacken_years'] as number[])
    : [];

  useEffect(() => {
    announcementsRepository.fetchCurrentUserRole(user.id).then(setUserRole);
  }, [user.id]);

  const showWrapTeaser = useWrapTeaserVisible();

  const [moshSplitEnabled, setMoshSplitEnabledState] = useState(false);

  useEffect(() => {
    getMoshSplitEnabled().then(setMoshSplitEnabledState);
  }, []);

  return (
    <main className={styles.main}>
      <ProfileHeader
        displayName={displayName}
        initial={initial}
        avatarUrl={avatarUrl}
        email={user.email ?? ''}
        userRole={userRole}
        savedCountry={savedCountry}
        savedWackenYears={savedWackenYears}
        t={t}
      />

      {showWrapTeaser && <WrapTeaserBanner />}

      <section id="vest" className={styles.pfSection}>
        <BadgesDisplay user={user} />
      </section>

      <BadgeHistorySection userId={user.id} />

      <ConflictSection userId={user.id} t={t} />
      {moshSplitEnabled && <MoshSplitSection userEmail={user.email ?? ''} />}

      <EditProfileForm
        user={user}
        displayName={displayName}
        language={language}
        setLanguage={setLanguage}
        currentAvatarUrl={avatarUrl}
        onAvatarChange={setAvatarUrl}
        t={t}
      />

      <GodlikeAdminPanel userId={user.id} />
      <ManagerAdminPanel userId={user.id} />
    </main>
  );
}
