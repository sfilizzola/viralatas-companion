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
type ViewState = 'collapsed' | 'days' | 'details';

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
  maxShow = 3,
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
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const labelKey = (() => {
    const keyMap: Record<ArrivalDay, string> = {
      'sun-jul26': 'arrivalDaySunJul26',
      'mon-jul27': 'arrivalDayMonJul27',
      'tue-jul28': 'arrivalDayTueJul28',
      'wed-jul29': 'arrivalDayWedJul29',
      'thu-plus': 'arrivalDayThuPlus',
      null: 'arrivalMapNotSet',
    };
    return keyMap[day];
  })();
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
  const isFestivalActive = currentTime >= FESTIVAL_DAY_1_START;

  // Start in 'days' view before festival, 'collapsed' after
  const defaultView: ViewState = isFestivalActive ? 'collapsed' : 'days';
  const [view, setView] = useState<ViewState>(defaultView);
  const [expandedDay, setExpandedDay] = useState<ArrivalDay | 'not-set' | null>(null);

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

  const totalArrived = useMemo(() => {
    return sortedDays
      .filter((day) => day && isPastDay(day, currentTime))
      .reduce((sum, day) => sum + (groupedByArrivalDay[day]?.length || 0), 0);
  }, [sortedDays, groupedByArrivalDay, currentTime]);

  const totalToArrive = useMemo(() => {
    return sortedDays
      .filter((day) => !day || !isPastDay(day, currentTime))
      .reduce((sum, day) => sum + (groupedByArrivalDay[day]?.length || 0), 0);
  }, [sortedDays, groupedByArrivalDay, currentTime]);

  // State 1: Collapsed (one-liner summary)
  if (view === 'collapsed') {
    const showArrivals = totalArrived > 0;
    const showToArrive = totalToArrive > 0;

    if (!showArrivals && !showToArrive) {
      return (
        <div className={styles.container}>
          <div className={styles.emptyState}>{t('arrivalMapEmpty')}</div>
        </div>
      );
    }

    let summary = '';
    if (showArrivals) summary += `${totalArrived} ${t('arrivalMapMinimized')}`;
    if (showArrivals && showToArrive) summary += ' · ';
    if (showToArrive) summary += `${totalToArrive} ${t('arrivalMapToArrive') || t('arrivalMapMinimized')}`;

    return (
      <div className={styles.container}>
        <div className={styles.collapsedView}>
          <button
            type="button"
            className={styles.chevron}
            onClick={() => setView('days')}
            aria-label="expand to days"
          >
            ▶
          </button>
          <span className={styles.summaryLabel}>{t('arrivalMapTitle')}</span>
          <span className={styles.summaryText}>{summary}</span>
        </div>
      </div>
    );
  }

  // Empty state for both expanded views
  if (sortedDays.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.chevron}
            onClick={() => setView('collapsed')}
            aria-label="collapse"
          >
            ▼
          </button>
          <h2 className={styles.title}>{t('arrivalMapTitle')}</h2>
        </div>
        <div className={styles.emptyState}>{t('arrivalMapEmpty')}</div>
      </div>
    );
  }

  // State 2: Day cluster (current behavior - rows with toggles)
  if (view === 'days') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.chevron}
            onClick={() => setView('collapsed')}
            aria-label="collapse"
          >
            ▼
          </button>
          <h2 className={styles.title}>{t('arrivalMapTitle')}</h2>
        </div>
        <div className={styles.dayRows}>
          {sortedDays.map((day) => {
            const dayKey = day === null ? 'not-set' : day;
            return (
              <ArrivalDayRow
                key={dayKey}
                day={day}
                users={groupedByArrivalDay[day] || []}
                currentUserId={currentUserId}
                currentTime={currentTime}
                isExpanded={expandedDay === dayKey}
                onToggleExpand={() => setExpandedDay(expandedDay === dayKey ? null : dayKey)}
                t={t}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // State 3: Details (all rows expanded)
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.chevron}
          onClick={() => setView('collapsed')}
          aria-label="collapse"
        >
          ▼
        </button>
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
            isExpanded={true}
            onToggleExpand={() => {}}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
