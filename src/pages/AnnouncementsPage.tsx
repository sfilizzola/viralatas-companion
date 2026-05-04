import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Announcement, CrewUser, UserRole } from '../types';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  loadAnnouncementsFromCache,
  loadCrewUsers,
  removeAnnouncementFromCache,
  saveAnnouncement,
} from '../lib/db';
import {
  deleteAnnouncement,
  fetchCurrentUserRole,
  fetchIsBlocked,
  postAnnouncement,
  syncAnnouncements,
} from '../lib/announcements';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import styles from './AnnouncementsPage.module.css';

function relativeTime(
  isoString: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  return t('daysAgo', { n: Math.floor(hours / 24) });
}

export default function AnnouncementsPage() {
  const { t } = useI18n('AnnouncementsPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [crewUsers, setCrewUsers] = useState<CrewUser[]>([]);
  const [role, setRole] = useState<UserRole>('normal');
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const refreshFromCache = useCallback(async () => {
    const [cached, users] = await Promise.all([
      loadAnnouncementsFromCache(),
      loadCrewUsers(),
    ]);
    setAnnouncements(cached);
    setCrewUsers(users);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshFromCache();
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, refreshFromCache);
    return () => window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, refreshFromCache);
  }, [refreshFromCache]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([fetchCurrentUserRole(userId), fetchIsBlocked(userId)]).then(([r, b]) => {
      setRole(r);
      setIsBlocked(b);
    });
  }, [userId]);

  useEffect(() => {
    syncAnnouncements().catch(() => {});

    const channel = supabase
      .channel('announcements_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        async (payload) => {
          await saveAnnouncement(payload.new as Announcement);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'announcements' },
        async (payload) => {
          const updated = payload.new as Announcement;
          if (updated.deleted_at) {
            await removeAnnouncementFromCache(updated.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!userId || !draft.trim() || posting) return;
    setPosting(true);
    await postAnnouncement(userId, draft.trim());
    setDraft('');
    setPosting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return;
    await deleteAnnouncement(id);
  }

  const canModerate = role === 'manager' || role === 'godlike';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
      </header>

      <main className={styles.main}>
        {isBlocked ? (
          <p className={styles.blockedMsg}>{t('blocked')}</p>
        ) : (
          <form className={styles.postBox} onSubmit={handlePost}>
            <textarea
              className={styles.textarea}
              placeholder={t('placeholder')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
            />
            <button className={styles.postBtn} type="submit" disabled={posting || !draft.trim()}>
              {posting ? t('posting') : t('post')}
            </button>
          </form>
        )}

        {loading ? (
          <p className={styles.empty}>{t('loading')}</p>
        ) : announcements.length === 0 ? (
          <p className={styles.empty}>{t('empty')}</p>
        ) : (
          <ul className={styles.feed}>
            {announcements.map((a) => {
              const author = crewUsers.find((u) => u.id === a.author_id);
              const authorName = author?.display_name ?? t('anonymous');
              return (
                <li key={a.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.authorRow}>
                      {author?.avatar_url ? (
                        <img
                          className={styles.avatar}
                          src={author.avatar_url}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className={styles.avatarInitial} aria-hidden>
                          {authorName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <span className={styles.authorName}>{authorName}</span>
                        <span className={styles.timestamp}>{relativeTime(a.created_at, t)}</span>
                      </div>
                    </div>
                    {canModerate && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(a.id)}
                        aria-label={t('delete')}
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                  <p className={styles.content}>{a.content}</p>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
