import { useState, useMemo } from 'react';
import type { CrewUser } from '../types';
import { useI18n } from '../lib/i18n';
import styles from './ArrivalMap.module.css';

type ArrivalMapProps = {
  crewUsers: CrewUser[];
  currentUserId: string;
  currentTime: Date;
};

type ArrivalDay = 'sun-jul26' | 'mon-jul27' | 'tue-jul28' | 'wed-jul29' | 'thu-plus' | null;

const ARRIVAL_DAY_ORDER: ArrivalDay[] = ['sun-jul26', 'mon-jul27', 'tue-jul28', 'wed-jul29', 'thu-plus'];

const FESTIVAL_DAY_1_START = new Date('2026-07-29T00:00:00+01:00');

function getArrivalDayLabel(day: ArrivalDay): string {
  const keyMap: Record<ArrivalDay, string> = {
    'sun-jul26': 'arrivalDaySunJul26',
    'mon-jul27': 'arrivalDayMonJul27',
    'tue-jul28': 'arrivalDayTueJul28',
    'wed-jul29': 'arrivalDayWedJul29',
    'thu-plus': 'arrivalDayThuPlus',
    null: 'arrivalMapNotSet',
  };
  return keyMap[day] || '';
}

function isToday(day: ArrivalDay, currentTime: Date): boolean {
  if (day !== 'wed-jul29') return false;
  return currentTime >= new Date('2026-07-29T00:00:00+01:00') && currentTime < new Date('2026-07-30T00:00:00+01:00');
}

function isPastDay(day: ArrivalDay, currentTime: Date): boolean {
  const dayMap: Record<ArrivalDay, Date> = {
    'sun-jul26': new Date('2026-07-26T00:00:00+01:00'),
    'mon-jul27': new Date('2026-07-27T00:00:00+01:00'),
    'tue-jul28': new Date('2026-07-28T00:00:00+01:00'),
    'wed-jul29': new Date('2026-07-29T00:00:00+01:00'),
    'thu-plus': new Date('2026-07-30T00:00:00+01:00'),
    null: new Date('2026-07-26T00:00:00+01:00'),
  };
  return currentTime > dayMap[day];
}

function AvatarCluster({
  users,
  currentUserId,
  maxShow = 5,
}: {
  users: CrewUser[];
  currentUserId: string;
  maxShow?: number;
}) {
  const shown = users.slice(0, maxShow);
  const remaining = Math.max(0, users.length - maxShow);

  return (
    <div className={styles.cluster}>
      {shown.map((user) => {
        const initials = (user.display_name || 'V')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <span
            key={user.id}
            className={styles.avatar}
            title={user.display_name || 'Unknown'}
          >
            {initials}
          </span>
        );
      })}
      {remaining > 0 && <span className={styles.more}>+{remaining}</span>}
    </div>
  );
}

function LocationChip({
  user,
  isCurrentUser,
}: {
  user: CrewUser;
  isCurrentUser: boolean;
}) {
  const initials = (user.display_name || 'V')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <span className={`${styles.locChip} ${isCurrentUser ? styles.locChipMe : ''}`}>
      <span className={styles.chipAvatar}>{initials}</span>
      <span className={styles.chipName}>{user.display_name}</span>
    </span>
  );
}

function ArrivalDayRow({
  day,
  users,
  currentUserId,
  currentTime,
  isExpanded,
  onToggleExpand,
  t,
}: {
  day: ArrivalDay;
  users: CrewUser[];
  currentUserId: string;
  currentTime: Date;
  isExpanded: boolean;
  onToggleExpand: () => void;
  t: (key: string) => string;
}) {
  const labelKey = getArrivalDayLabel(day);
  const label = t(labelKey);
  const today = isToday(day, currentTime);
  const past = isPastDay(day, currentTime);
  const stripColor = today ? 'var(--signal-warn)' : past ? 'var(--signal-ok)' : 'var(--accent)';

  const countLabel = users.length === 1 ? t('arrivalMapCountOne') : t('arrivalMapCountOther', { n: users.length });

  return (
    <div className={styles.dayRow} style={{ borderLeftColor: stripColor }}>
      <div className={styles.rowHeader}>
        <div className={styles.dayLabel}>
          {label}
          {day === 'wed-jul29' && <span className={styles.d1Badge}>D1</span>}
          {today && <span className={styles.todayBadge}>{t('arrivalMapToday')}</span>}
        </div>
        <div className={styles.rowStats}>
          <span className={styles.count}>{countLabel}</span>
          <button
            type="button"
            className={styles.expandButton}
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('arrivalMapCollapseLabel') : t('arrivalMapExpandLabel')}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.chipList}>
            {users.map((user) => (
              <LocationChip key={user.id} user={user} isCurrentUser={user.id === currentUserId} />
            ))}
          </div>
        </div>
      )}

      {!isExpanded && (
        <div className={styles.collapsedContent}>
          <AvatarCluster users={users} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}

export default function ArrivalMap({
  crewUsers,
  currentUserId,
  currentTime,
}: ArrivalMapProps) {
  const { t } = useI18n('AnnouncementsPage');
  const [expandedDay, setExpandedDay] = useState<ArrivalDay | null>(null);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  const isFestivalActive = currentTime >= FESTIVAL_DAY_1_START;
  const shouldMinimize = isFestivalActive && !isManuallyExpanded;

  const groupedByArrivalDay = useMemo(() => {
    const grouped: Record<ArrivalDay, CrewUser[]> = {
      'sun-jul26': [],
      'mon-jul27': [],
      'tue-jul28': [],
      'wed-jul29': [],
      'thu-plus': [],
      null: [],
    };

    crewUsers.forEach((user) => {
      const day = (user.wacken_arrival_day as ArrivalDay) || null;
      if (day && grouped[day]) {
        grouped[day].push(user);
      } else if (!day) {
        grouped[null].push(user);
      }
    });

    return grouped;
  }, [crewUsers]);

  const sortedDays = useMemo(() => {
    return [...ARRIVAL_DAY_ORDER, null].filter(
      (day) => groupedByArrivalDay[day] && groupedByArrivalDay[day].length > 0,
    );
  }, [groupedByArrivalDay]);

  if (sortedDays.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>{t('arrivalMapEmpty')}</div>
      </div>
    );
  }

  const totalCount = sortedDays.reduce((sum, day) => sum + (groupedByArrivalDay[day]?.length || 0), 0);

  if (shouldMinimize) {
    const minLabel = `${t('arrivalMapTitle')}  ${totalCount} ${t('arrivalMapMinimized')}`;

    return (
      <div className={styles.container}>
        <div className={styles.minimizedRow}>
          <span className={styles.minimizedLabel}>{minLabel}</span>
          <button
            type="button"
            className={styles.minimizedToggle}
            onClick={() => setIsManuallyExpanded(true)}
            aria-label="expand"
          >
            ▼
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('arrivalMapTitle')}</h2>
      </div>
      <div className={styles.dayRows}>
        {sortedDays.map((day) => (
          <ArrivalDayRow
            key={day || 'not-set'}
            day={day}
            users={groupedByArrivalDay[day] || []}
            currentUserId={currentUserId}
            currentTime={currentTime}
            isExpanded={expandedDay === day}
            onToggleExpand={() => setExpandedDay(expandedDay === day ? null : day)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
