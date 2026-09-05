import { useMemo, useState } from 'react';
import BottomNav from '../BottomNav';
import FestivalSwitcher from '../FestivalSwitcher';
import OfflineBanner from '../OfflineBanner';
import { BandDetailModalHost } from '../BandDetailModalHost';
import Avatar from '../../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useBandAttendees } from '../../hooks/useBandAttendees';
import { useBandDetailModal } from '../../hooks/useBandDetailModal';
import { useBandRatings } from '../../hooks/useBandRatings';
import { useMissedBands } from '../../hooks/useMissedBands';
import { usePickActions } from '../../hooks/usePickActions';
import { usePlanningNowData } from '../../hooks/usePlanningNowData';
import { useI18n } from '../../lib/i18n';
import type { CrewUser } from '../../types';
import PlanningMemberSheet from './PlanningMemberSheet';
import styles from './PlanningNow.module.css';

function memberName(member: CrewUser, fallback: string): string {
  return member.display_name?.trim() || fallback;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2) || 'VL')
    .toUpperCase();
}

/**
 * Same buckets as the mural's relative time, but read from the planning clock
 * (`useNow`, godlike override included) instead of the device clock.
 */
function relativePickTime(
  createdAt: string,
  now: Date,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';

  const minutes = Math.floor(Math.max(0, now.getTime() - created.getTime()) / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });

  const day = String(created.getDate()).padStart(2, '0');
  const month = String(created.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export default function PlanningNowView() {
  const { t } = useI18n('RightNowPage');
  const data = usePlanningNowData();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const { pickedIds, togglePick } = usePickActions(userId);
  const attendeesByBand = useBandAttendees();
  const { allMissed, missedBandIds, toggleMissed } = useMissedBands(userId);
  const { userRatingByBand, toggleRating, clearRating } = useBandRatings(userId);
  const conflicts = useMemo(() => new Map(), []);
  const [membersOpen, setMembersOpen] = useState(false);

  const { openBand, modalProps } = useBandDetailModal({
    bands: data.bands,
    pickedIds,
    togglePick,
    allMissed,
    missedBandIds,
    toggleMissed,
    attendeesByBand,
    currentNow: data.now,
    conflicts,
    userRatingByBand,
    toggleRating,
    clearRating,
    festival: data.festival,
  });

  const countdown =
    data.countdown.kind === 'days'
      ? t('planningDays', { count: data.countdown.days })
      : data.countdown.kind === 'today'
        ? t('planningToday')
        : t('planningDatesTba');
  const rosterTitle =
    data.members.length === 1
      ? t('planningSolo')
      : t('planningGoing', { count: data.members.length });
  const shownMembers = data.members.slice(0, 4);
  const overflowCount = Math.max(0, data.members.length - shownMembers.length);

  return (
    <div className={styles.page} data-testid="planning-now">
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.switcherSlot}>
          <FestivalSwitcher />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.eraLine}>
          <span className={styles.era}>{t('planningEra')}</span>
          <span className={data.countdown.kind === 'tba' ? styles.countdownMuted : styles.countdown}>
            {countdown}
          </span>
        </div>

        {data.loading ? (
          <p className={styles.loading}>{t('loading')}</p>
        ) : (
          <>
            <button
              type="button"
              className={styles.packHero}
              data-count={String(data.members.length).padStart(2, '0')}
              aria-haspopup="dialog"
              aria-expanded={membersOpen}
              onClick={() => setMembersOpen(true)}
            >
              <span className={styles.heroKicker}>{t('planningPackStatus')}</span>
              <strong className={styles.heroTitle}>{rosterTitle}</strong>
              <span className={styles.heroFooter}>
                <span className={styles.avatarStack} aria-hidden="true">
                  {shownMembers.map((member) => {
                    const name = memberName(member, t('planningUnknownMember'));
                    return (
                      <Avatar
                        key={member.id}
                        src={member.avatar_url}
                        initial={initials(name)}
                        size={40}
                        className={styles.heroAvatar}
                      />
                    );
                  })}
                  {overflowCount > 0 && (
                    <span className={styles.avatarOverflow}>+{overflowCount}</span>
                  )}
                </span>
                <span className={styles.seeAll}>
                  {t('planningSeeAll')} <span aria-hidden="true">→</span>
                </span>
              </span>
            </button>

            <section aria-labelledby="planning-announced">
              <div className={styles.ribbon}>
                <h2 id="planning-announced">{t('planningJustAnnounced')}</h2>
                <span>
                  {data.newestBands.length > 0
                    ? t('planningNewNames', { count: data.newestBands.length })
                    : t('planningFirstWave')}
                </span>
              </div>
              {data.newestBands.length > 0 ? (
                <div className={styles.bandList}>
                  {data.newestBands.map((band, index) => (
                    <button
                      key={band.id}
                      type="button"
                      className={styles.bandRow}
                      onClick={() => openBand(band.id)}
                    >
                      <span className={styles.bandName}>{band.name}</span>
                      <span className={styles.bandIndex}>{String(index + 1).padStart(2, '0')}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.lineupEmpty}>{t('planningLineupEmpty')}</p>
              )}
            </section>

            {data.activity.length > 0 && (
              <section className={styles.picks} aria-labelledby="planning-picks">
                <h2 id="planning-picks" className={styles.picksLabel}>
                  {t('planningPackPicks')}
                </h2>
                <div className={styles.pickList}>
                  {data.activity.map(({ pick, member, band }) => {
                    const name = memberName(member, t('planningUnknownMember'));
                    return (
                      <button
                        key={`${pick.user_id}:${pick.band_id}:${pick.created_at}`}
                        type="button"
                        className={styles.pickRow}
                        onClick={() => openBand(band.id)}
                      >
                        <Avatar
                          src={member.avatar_url}
                          initial={initials(name)}
                          size={32}
                          className={styles.pickAvatar}
                        />
                        <span className={styles.pickText}>
                          {t('planningPicked', { name, band: band.name })}
                        </span>
                        <time className={styles.pickTime} dateTime={pick.created_at}>
                          {relativePickTime(pick.created_at, data.now, t)}
                        </time>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BandDetailModalHost modalProps={modalProps} />
      <PlanningMemberSheet
        members={data.members}
        open={membersOpen}
        title={t('planningMembersTitle')}
        unknownName={t('planningUnknownMember')}
        closeLabel={t('planningClose')}
        onClose={() => setMembersOpen(false)}
      />
      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
