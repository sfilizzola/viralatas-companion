import type { Announcement, CrewUser } from '../../types';
import styles from '../../pages/RightNowPage.module.css';

type TFn = (key: string, values?: Record<string, string | number>) => string;

function relativeAnnouncementTime(isoString: string, t: TFn): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

type LatestAnnouncementBannerProps = {
  announcement: Announcement;
  crewUsers: CrewUser[];
  t: TFn;
};

export default function LatestAnnouncementBanner({
  announcement,
  crewUsers,
  t,
}: LatestAnnouncementBannerProps) {
  const author = crewUsers.find((u) => u.id === announcement.author_id);
  const authorName = author?.display_name?.trim() || t('anonymous');

  return (
    <section className={styles.latestSignal} aria-labelledby="latest-mural-signal">
      <span className={styles.latestSignalKicker} id="latest-mural-signal">
        {t('latestNews')}
      </span>
      <div className={styles.latestSignalBody}>
        <div className={styles.latestSignalContent}>
          <p className={styles.latestSignalText}>{announcement.content}</p>
          <div className={styles.latestSignalMeta}>
            <span className={styles.latestAvatar}>
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" loading="lazy" />
              ) : (
                <span aria-hidden>{authorName.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className={styles.latestSignalName}>{authorName}</span>
            <span className={styles.latestSignalTime}>
              {relativeAnnouncementTime(announcement.created_at, t)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
