import { useEffect, useState, type FormEvent } from 'react';
import type { Announcement, UsefulLink } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useI18n } from '../lib/i18n';
import { loadUsefulLinks } from '../services/usefulLinks';
import { relativeTime } from '../services/announcementsDisplay';
import type { AnnouncementWithReactions } from '../services/announcementsDisplay';
import { isFestivalActive } from '../services/time';
import BottomNav from '../components/BottomNav';
import Icon from '../components/icons/Icon';
import ArrivalMap from '../components/ArrivalMap';
import { ReactionBar } from '../components/announcements/ReactionBar';
import { Avatar, Chip } from '../ui';
import { useNow } from '../hooks/useNow';
import styles from './AnnouncementsPage.module.css';

export default function AnnouncementsPage() {
  const { t } = useI18n('AnnouncementsPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const currentTime = useNow();

  const {
    announcements,
    visibleAnnouncements,
    crewUsers,
    userRoles,
    blockedUserIds,
    pendingAnnouncementIds,
    loading,
    isBlocked,
    canModerate,
    visibleCount,
    loadingMore,
    hasMore,
    blocking,
    pinning,
    loadMore,
    post,
    deleteAnnouncement,
    blockUser,
    pin,
    toggleReaction,
  } = useAnnouncements(userId);

  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>([]);

  useEffect(() => {
    let isMounted = true;
    loadUsefulLinks().then((links) => {
      if (isMounted) setUsefulLinks(links);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!userId || !draft.trim() || posting) return;
    setPosting(true);
    await post(draft);
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

  async function handleLoadMore() {
    const result = await loadMore();
    if (result === 'offline') alert(t('offlineCannotLoadMore'));
  }

  const festivalActive = isFestivalActive(currentTime);
  const showArrivalMapTop = userId && crewUsers.length > 0 && !festivalActive;
  const showArrivalMapBottom = userId && crewUsers.length > 0 && festivalActive;

  return (
    <div className={styles.page}>
      <div className={styles.grain} aria-hidden="true" />
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
          <div className={styles.mural}>
            <ul className={styles.feed}>
              {visibleAnnouncements.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  crewUsers={crewUsers}
                  userRoles={userRoles}
                  blockedUserIds={blockedUserIds}
                  pendingAnnouncementIds={pendingAnnouncementIds}
                  canModerate={canModerate}
                  blocking={blocking}
                  pinning={pinning}
                  t={t}
                  onPin={pin}
                  onBlock={blockUser}
                  onDelete={handleDelete}
                  onToggleReaction={toggleReaction}
                />
              ))}
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
          </div>
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

type AnnouncementCardProps = {
  announcement: AnnouncementWithReactions;
  crewUsers: ReturnType<typeof useAnnouncements>['crewUsers'];
  userRoles: ReturnType<typeof useAnnouncements>['userRoles'];
  blockedUserIds: Set<string>;
  pendingAnnouncementIds: Set<string>;
  canModerate: boolean;
  blocking: string | null;
  pinning: string | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  onPin: (a: Announcement) => void;
  onBlock: (authorId: string) => void;
  onDelete: (id: string) => void;
  onToggleReaction: (announcementId: string, emoji: string) => void;
};

function AnnouncementCard({
  announcement: a,
  crewUsers,
  userRoles,
  blockedUserIds,
  pendingAnnouncementIds,
  canModerate,
  blocking,
  pinning,
  t,
  onPin,
  onBlock,
  onDelete,
  onToggleReaction,
}: AnnouncementCardProps) {
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
    <li className={`${styles.card} ${a.is_pinned ? styles.cardPinned : ''}`}>
      <span className={styles.tapeCorner} aria-hidden="true" />
      <Avatar
        size={40}
        src={author?.avatar_url ?? null}
        initial={authorName.charAt(0).toUpperCase()}
        className={styles.avatar}
      />

      <div className={styles.head}>
        <span className={styles.name}>{authorName}</span>
        <Chip variant={roleVariant}>{t(`role_${authorRole}`)}</Chip>
        {a.is_pinned && <span className={styles.pinnedChip}>{t('pinned')}</span>}
        <span className={styles.ts}>{relativeTime(a.created_at, t)}</span>
      </div>

      <p className={styles.body}>
        {a.content}
        {pendingAnnouncementIds.has(a.id) && (
          <span className="pending-chip" style={{ marginLeft: '8px' }}>
            {t('pendingSync')}
          </span>
        )}
      </p>

      <ReactionBar
        announcementId={a.id}
        reactions={a.reactions}
        toggleReaction={onToggleReaction}
      />

      {(showBlock || showDelete || showPin) && (
        <div className={styles.cardActions}>
          {showPin && (
            <button
              className={`${styles.actionBtn} ${a.is_pinned ? styles.actionBtnActive : ''}`}
              onClick={() => onPin(a)}
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
              onClick={() => onBlock(a.author_id)}
              disabled={isBlocking || alreadyBlocked}
              aria-label={t('block')}
              type="button"
            >
              {isBlocking ? t('blockingUser') : alreadyBlocked ? t('blockedDone') : t('blockAction')}
            </button>
          )}
          {showDelete && (
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={() => onDelete(a.id)}
              aria-label={t('delete')}
              type="button"
            >
              {t('delete')}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
