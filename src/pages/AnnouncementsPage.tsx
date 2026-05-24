import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Announcement, CrewUser, UserRole, UsefulLink } from '../types';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  loadAnnouncementsFromCache,
  loadCrewUsers,
  loadOfflineAnnouncementsQueue,
  removeAnnouncementFromCache,
  saveAnnouncement,
} from '../lib/db';
import { announcementsRepository, usersRepository } from '../repositories';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import { loadUsefulLinks } from '../services/usefulLinks';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import Icon from '../components/icons/Icon';
import ArrivalMap from '../components/ArrivalMap';
import { Avatar, Chip } from '../ui';
import { useNow } from '../hooks/useNow';
import { isFestivalActive } from '../services/time';
import styles from './AnnouncementsPage.module.css';

const PAGE_SIZE = 10;
const LOAD_MORE_SIZE = 5;

function applyPinSort(announcements: Announcement[]): Announcement[] {
  if (announcements.length < 2) return announcements;
  const pinnedIdx = announcements.findIndex((a) => a.is_pinned);
  if (pinnedIdx === -1) return announcements;
  const pinned = announcements[pinnedIdx];
  const rest = announcements.filter((_, i) => i !== pinnedIdx);
  // rest[0] is the most recent non-pinned; insert pinned at position 1
  return [rest[0], pinned, ...rest.slice(1)];
}

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pinning, setPinning] = useState<string | null>(null);

  const refreshFromCache = useCallback(async () => {
    const [cached, users, pendingQueue] = await Promise.all([
      loadAnnouncementsFromCache(),
      loadCrewUsers(),
      loadOfflineAnnouncementsQueue(),
    ]);
    setAnnouncements(cached);
    setCrewUsers(users);
    setPendingAnnouncementIds(new Set(pendingQueue.map((a) => a.id)));

    setUserRoles(await usersRepository.fetchUserRolesMap());

    setLoading(false);
  }, []);

  const sortedAnnouncements = useMemo(() => applyPinSort(announcements), [announcements]);
  const visibleAnnouncements = useMemo(
    () => sortedAnnouncements.slice(0, visibleCount),
    [sortedAnnouncements, visibleCount],
  );

  async function handleLoadMore() {
    if (loadingMore) return;

    // If we have more items in cache than currently shown, just reveal them
    if (announcements.length > visibleCount) {
      setVisibleCount((v) => v + LOAD_MORE_SIZE);
      return;
    }

    // Need to fetch from network
    if (!navigator.onLine) {
      alert(t('offlineCannotLoadMore'));
      return;
    }

    setLoadingMore(true);
    const oldest = announcements[announcements.length - 1]?.created_at;
    if (!oldest) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const fetched = await announcementsRepository.fetchMore(oldest, LOAD_MORE_SIZE);
    setLoadingMore(false);

    if (fetched.length < LOAD_MORE_SIZE) setHasMore(false);
    if (fetched.length > 0) {
      await refreshFromCache();
      setVisibleCount((v) => v + LOAD_MORE_SIZE);
    }
  }

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
    usersRepository.fetchBlockedPosters().then((blocked) => {
      setBlockedUserIds(new Set(blocked.map(b => b.user_id)));
    });

    const unsubscribeRealtime = subscribePostgresChanges('announcements_live', [
      {
        filter: { event: 'INSERT', table: 'announcements' },
        handler: async (payload) => {
          await saveAnnouncement(payload.new as Announcement);
        },
      },
      {
        filter: { event: 'UPDATE', table: 'announcements' },
        handler: async (payload) => {
          await saveAnnouncement(payload.new as Announcement);
        },
      },
      {
        filter: { event: 'DELETE', table: 'announcements' },
        handler: async (payload) => {
          await removeAnnouncementFromCache(payload.old.id as string);
        },
      },
      {
        filter: { event: 'INSERT', table: 'blocked_posters' },
        handler: async (payload) => {
          const blocked = payload.new as { user_id: string };
          setBlockedUserIds(prev => new Set([...prev, blocked.user_id]));
        },
      },
      {
        filter: { event: 'DELETE', table: 'blocked_posters' },
        handler: async (payload) => {
          const unblocked = payload.old as { user_id: string };
          setBlockedUserIds(prev => {
            const next = new Set(prev);
            next.delete(unblocked.user_id);
            return next;
          });
        },
      },
    ]);

    return () => {
      unsubscribeRealtime();
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
      await usersRepository.blockUser(authorId, userId);
      await announcementsRepository.sync();
    } catch (error) {
      console.error('Block failed:', error);
    } finally {
      setBlocking(null);
    }
  }

  async function handlePin(a: Announcement) {
    if (!navigator.onLine) return;
    setPinning(a.id);
    try {
      if (a.is_pinned) {
        await announcementsRepository.unpinAnnouncement(a.id);
      } else {
        await announcementsRepository.pinAnnouncement(a.id);
      }
      await announcementsRepository.sync();
      await refreshFromCache();
    } finally {
      setPinning(null);
    }
  }

  const canModerate = role === 'manager' || role === 'godlike';
  const festivalActive = isFestivalActive(currentTime);
  const showArrivalMapTop = userId && crewUsers.length > 0 && !festivalActive;
  const showArrivalMapBottom = userId && crewUsers.length > 0 && festivalActive;

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

        {showArrivalMapTop && (
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
          <div className={styles.emptyState}>
            <Icon name="mural" size={24} aria-hidden />
            {t('empty')}
          </div>
        ) : (
          <>
            <ul className={styles.feed}>
              {visibleAnnouncements.map((a) => {
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
                const showPin = canModerate;
                const alreadyBlocked = blockedUserIds.has(a.author_id);
                const isBlocking = blocking === a.author_id;
                const isPinning = pinning === a.id;
                return (
                  <li key={a.id} className={`${styles.card} ${a.is_pinned ? styles.cardPinned : ''}`}>
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
                      {a.is_pinned && (
                        <span className={styles.pinnedChip}>{t('pinned')}</span>
                      )}
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
                    {(showBlock || showDelete || showPin) && (
                      <div className={styles.cardActions}>
                        {showPin && (
                          <button
                            className={`${styles.actionBtn} ${a.is_pinned ? styles.actionBtnActive : ''}`}
                            onClick={() => handlePin(a)}
                            disabled={isPinning || !navigator.onLine}
                            aria-label={a.is_pinned ? t('unpin') : t('pin')}
                            type="button"
                          >
                            {a.is_pinned ? t('unpin') : t('pin')}
                          </button>
                        )}
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

            {hasMore && announcements.length >= visibleCount && (
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                disabled={loadingMore}
                type="button"
              >
                {loadingMore ? t('loadingMore') : t('loadMore')}
              </button>
            )}
          </>
        )}

        {showArrivalMapBottom && (
          <div className={styles.arrivalMapBottom}>
            <ArrivalMap crewUsers={crewUsers} currentUserId={userId} currentTime={currentTime} />
          </div>
        )}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
