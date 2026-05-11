import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Announcement, CrewUser, UserRole, UsefulLink } from '../types';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  loadAnnouncementsFromCache,
  loadCrewUsers,
  loadOfflineAnnouncementsQueue,
  removeAnnouncementFromCache,
  saveAnnouncement,
} from '../lib/db';
import { announcementsRepository } from '../repositories';
import { supabase } from '../lib/supabase';
import { loadUsefulLinks } from '../services/usefulLinks';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import Icon from '../components/icons/Icon';
import ArrivalMap from '../components/ArrivalMap';
import { Avatar, Chip } from '../ui';
import { useNow } from '../hooks/useNow';
import styles from './AnnouncementsPage.module.css';

function relativeTime(
  isoString: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

export default function AnnouncementsPage() {
  const { t } = useI18n('AnnouncementsPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const currentTime = useNow();

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
  const [pendingAnnouncementIds, setPendingAnnouncementIds] = useState<Set<string>>(new Set());
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>([]);

  const refreshFromCache = useCallback(async () => {
    const [cached, users, pendingQueue] = await Promise.all([
      loadAnnouncementsFromCache(),
      loadCrewUsers(),
      loadOfflineAnnouncementsQueue(),
    ]);
    setAnnouncements(cached);
    setCrewUsers(users);
    setPendingAnnouncementIds(new Set(pendingQueue.map((a) => a.id)));

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
    let isMounted = true;

    loadUsefulLinks().then((links) => {
      if (isMounted) setUsefulLinks(links);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    Promise.all([announcementsRepository.fetchCurrentUserRole(userId), announcementsRepository.fetchIsBlocked(userId)]).then(([r, b]) => {
      setRole(r);
      setIsBlocked(b);
    });
  }, [userId]);

  useEffect(() => {
    announcementsRepository.sync().catch(() => {});

    // Load blocked users
    announcementsRepository.fetchBlockedPosters().then((blocked) => {
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
    await announcementsRepository.post(userId, draft.trim());
    setDraft('');
    setPosting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await announcementsRepository.delete(id);
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleBlock(authorId: string) {
    if (!userId) return;
    setBlocking(authorId);
    try {
      await announcementsRepository.blockUser(authorId, userId);
      await announcementsRepository.sync();
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
        {usefulLinks.length > 0 && (
          <section className={styles.usefulLinksRow} aria-labelledby="useful-links-title">
            <h2 className={styles.usefulLinksTitle} id="useful-links-title">
              {t('usefulLinksTitle')}
            </h2>
            <div className={styles.usefulLinksList}>
              {usefulLinks.map((link) => (
                <a
                  className={styles.usefulLinkPill}
                  href={link.url}
                  key={`${link.title}-${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{link.title}</span>
                  <Icon name="arrow" size={12} strokeWidth={2.2} className={styles.usefulLinkIcon} />
                </a>
              ))}
            </div>
          </section>
        )}

        {userId && crewUsers.length > 0 && (
          <ArrivalMap crewUsers={crewUsers} currentUserId={userId} currentTime={currentTime} />
        )}

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
              const authorRole = userRoles[a.author_id] ?? 'normal';
              const roleVariant =
                authorRole === 'godlike'
                  ? 'role-godlike'
                  : authorRole === 'manager'
                    ? 'role-manager'
                    : ('role-normal' as const);
              const showBlock = canModerate && authorRole !== 'godlike';
              const showDelete = canModerate;
              const alreadyBlocked = blockedUserIds.has(a.author_id);
              const isBlocking = blocking === a.author_id;
              return (
                <li key={a.id} className={styles.card}>
                  {/* col 1: avatar */}
                  <Avatar
                    size={40}
                    src={author?.avatar_url ?? null}
                    initial={authorName.charAt(0).toUpperCase()}
                    className={styles.avatar}
                  />

                  {/* col 2: head row */}
                  <div className={styles.head}>
                    <span className={styles.name}>{authorName}</span>
                    <Chip variant={roleVariant}>{t(`role_${authorRole}`)}</Chip>
                    <span className={styles.ts}>{relativeTime(a.created_at, t)}</span>
                  </div>

                  {/* col 2: body */}
                  <p className={styles.body}>
                    {a.content}
                    {pendingAnnouncementIds.has(a.id) && (
                      <span className="pending-chip" style={{ marginLeft: '8px' }}>
                        {t('pendingSync')}
                      </span>
                    )}
                  </p>

                  {/* col 2: actions */}
                  {(showBlock || showDelete) && (
                    <div className={styles.cardActions}>
                      {showBlock && (
                        <button
                          className={`${styles.actionBtn} ${!alreadyBlocked && !isBlocking ? styles.actionBtnDanger : ''}`}
                          onClick={() => handleBlock(a.author_id)}
                          disabled={isBlocking || alreadyBlocked}
                          aria-label={t('block')}
                          type="button"
                        >
                          {isBlocking
                            ? t('blockingUser')
                            : alreadyBlocked
                              ? t('blockedDone')
                              : t('blockAction')}
                        </button>
                      )}
                      {showDelete && (
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => handleDelete(a.id)}
                          aria-label={t('delete')}
                          type="button"
                        >
                          ⚐ {t('delete')}
                        </button>
                      )}
                    </div>
                  )}
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
