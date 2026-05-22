import { useEffect, useState } from 'react';
import type { Band, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { getPlaylistTesting } from '../lib/appSettings';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import styles from './PlaylistLaunchButton.module.css';

const SETLIST_BASE = 'https://setlist.viralatas.org';

interface PlaylistLaunchButtonProps {
  readonly bands: Band[];
  readonly userName: string;
}

export default function PlaylistLaunchButton({ bands, userName }: PlaylistLaunchButtonProps) {
  const { t } = useI18n('MyPicksPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!userId || bands.length === 0) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const uid = userId;

    async function load() {
      try {
        const [testing, userRow] = await Promise.all([
          getPlaylistTesting(),
          supabase
            .from('users')
            .select('role, preferred_language')
            .eq('id', uid)
            .single(),
        ]);

        if (cancelled) return;

        const rawRole = userRow.data?.role;
        const role: UserRole = rawRole === 'godlike' || rawRole === 'manager' ? rawRole : 'normal';
        const lang = userRow.data?.preferred_language ?? 'en';

        const canSee =
          !testing ||
          role === 'godlike' ||
          role === 'manager';

        if (!canSee) {
          setVisible(false);
          return;
        }

        const params = new URLSearchParams();
        params.set('user_name', userName.slice(0, 20));
        for (const band of bands) {
          params.append('bands', band.name);
        }
        params.set('lang', lang === 'br' ? 'pt-BR' : 'en');

        setUrl(`${SETLIST_BASE}/launch?${params.toString()}`);
        setVisible(true);
      } catch {
        setVisible(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, bands, userName]);

  if (!visible) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.strip}
      aria-label={t('generateSetlist')}
    >
      <span className={styles.left}>
        <span className={styles.iconWrap} aria-hidden="true">
          <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="22" height="22" rx="5" fill="rgba(22,160,133,0.18)" />
            <line x1="6" y1="7" x2="16" y2="7" stroke="#16a085" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="6" y1="11" x2="16" y2="11" stroke="#16a085" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="6" y1="15" x2="12" y2="15" stroke="#16a085" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="16" cy="15" r="2" stroke="#16a085" strokeWidth="1.4" />
            <line x1="18" y1="13.5" x2="18" y2="11" stroke="#16a085" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className={styles.textStack}>
          <span className={styles.label}>{t('generateSetlist')}</span>
          <span className={styles.sub}>
            {t('generateSetlistSub', { count: bands.length })}
          </span>
        </span>
      </span>
      <span className={styles.arrow} aria-hidden="true">→</span>
    </a>
  );
}
