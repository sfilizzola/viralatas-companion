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
  blockUser,
  deleteAnnouncement,
  fetchBlockedPosters,
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
  const [userRoles, setUserRoles] = useState<Record<string, UserRole>>({});
  const [role, setRole] = useState<UserRole>('normal');
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  const refreshFromCache = useCallback(async () => {
    const [cached, users] = await Promise.all([
      loadAnnouncementsFromCache(),
      loadCrewUsers(),
    ]);
    setAnnouncements(cached);
    setCrewUsers(users);

    // Load user roles
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, role');
    if (allUsers) {
      const rolesMap = Object.fromEntries(
        allUsers.map(u => [u.id, u.role as UserRole])
      );
      setUserRoles(rolesMap);
    }

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

    // Load blocked users
    fetchBlockedPosters().then((blocked) => {
      setBlockedUserIds(new Set(blocked.map(b => b.user_id)));
    });

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
        { event: 'DELETE', schema: 'public', table: 'announcements' },
        async (payload) => {
          await removeAnnouncementFromCache(payload.old.id);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blocked_posters' },
        async (payload) => {
          const blocked = payload.new as { user_id: string };
          setBlockedUserIds(prev => new Set([...prev, blocked.user_id]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'blocked_posters' },
        async (payload) => {
          const unblocked = payload.old as { user_id: string };
          setBlockedUserIds(prev => {
            const next = new Set(prev);
            next.delete(unblocked.user_id);
            return next;
          });
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
    try {
      await deleteAnnouncement(id);
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleBlock(authorId: string) {
    if (!userId) return;
    setBlocking(authorId);
    try {
      await blockUser(authorId, userId);
      await syncAnnouncements();
    } catch (error) {
      console.error('Block failed:', error);
    } finally {
      setBlocking(null);
    }
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
                    <div className={styles.cardActions}>
                      {canModerate && userRoles[a.author_id] !== 'godlike' && (
                        <button
                          className={`${styles.blockBtn} ${blocking === a.author_id ? styles.blocking : ''} ${blockedUserIds.has(a.author_id) ? styles.blocked : ''}`}
                          onClick={() => handleBlock(a.author_id)}
                          disabled={blocking === a.author_id || blockedUserIds.has(a.author_id)}
                          aria-label={t('block')}
                          type="button"
                        >
                          {blocking === a.author_id ? `${t('blockingUser')}` : blockedUserIds.has(a.author_id) ? `✓ ${t('block')}` : `🚫 ${t('block')}`}
                        </button>
                      )}
                      {canModerate && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(a.id)}
                          aria-label={t('delete')}
                          type="button"
                        >
                          {t('delete')}
                        </button>
                      )}
                    </div>
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
