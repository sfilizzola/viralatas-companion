import type { MetalPlaceConfig } from '../../types';
import type { CrewLiveGroup, CrewLivePlan } from '../../services/livePreview';
import { formatFestivalTime } from '../../services/livePreview';
import { stageColor } from '../../services/stageColors';
import styles from './LiveCardSheet.module.css';

type TFn = (key: string, values?: Record<string, string | number>) => string;

type LiveCardSheetProps = {
  group: CrewLiveGroup;
  crewPlans: CrewLivePlan[];
  userId: string | null;
  metalPlaceConfig: MetalPlaceConfig | null;
  onClose: () => void;
  t: TFn;
};

/**
 * Returns the accent colour for each card type.
 * Band cards use the stage colour; presence cards use their system colour.
 */
function groupAccentColor(group: CrewLiveGroup): string {
  if (group.kind === 'band') return stageColor(group.band.stage);
  if (group.kind === 'metal_place') return 'rgba(217, 119, 6, 1)';
  if (group.kind === 'camping') return 'var(--signal-ok)';
  return 'var(--signal-lost)';
}

/**
 * CSS-variable theme bundle injected inline on the sheet element.
 * Keeps colour logic in one place; the CSS module references only var(--sheet-*).
 */
function sheetTheme(accent: string): Record<string, string> {
  return {
    '--sheet-accent': accent,
    '--sheet-accent-pulse': accent,
    '--sheet-bg': 'var(--bg-surface)',
    '--sheet-header-bg': 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
    '--sheet-handle': 'rgba(255,255,255,0.15)',
    '--sheet-title': 'rgba(255,255,255,0.95)',
    '--sheet-member-name': 'rgba(255,255,255,0.85)',
    '--sheet-avatar-bg': 'rgba(255,255,255,0.08)',
    '--sheet-avatar-border': 'rgba(255,255,255,0.12)',
    '--sheet-you-bg': 'rgba(255,255,255,0.08)',
  };
}

function sheetTitle(group: CrewLiveGroup, t: TFn): string {
  if (group.kind === 'band') return group.band.name;
  if (group.kind === 'metal_place') return t('metalPlaceGroupTitle');
  if (group.kind === 'camping') return t('campingGroupTitle');
  return t('lostGroupTitle');
}

function sheetCountLabel(group: CrewLiveGroup, t: TFn): string {
  const n = group.members.length;
  if (group.kind === 'band') return `${n} ${t('crewCountLabel')}`;
  if (group.kind === 'metal_place') return `${n} ${t('metalPlaceCountLabel')}`;
  if (group.kind === 'camping') return `${n} ${t('campingCountLabel')}`;
  return `${n} ${t('lostCountLabel')}`;
}

function MemberRow({
  crew,
  isCurrentUser,
  accent,
}: {
  crew: CrewLivePlan;
  isCurrentUser: boolean;
  accent: string;
}) {
  const nextBand = crew.plan.nextBand ?? null;

  return (
    <div className={styles.memberRow}>
      <div className={`${styles.avatar} ${isCurrentUser ? styles.avatarYou : ''}`}>
        {crew.avatar_url ? (
          <img src={crew.avatar_url} alt="" loading="lazy" />
        ) : (
          <span aria-hidden>{crew.label.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>
          {crew.label}
          {isCurrentUser && <span className={styles.youTag}>you</span>}
        </span>
        {nextBand ? (
          <div className={styles.nextPill}>
            <div
              className={styles.nextStageDot}
              style={{ background: stageColor(nextBand.stage) }}
            />
            <span className={styles.nextBandName}>{nextBand.name}</span>
            <span className={styles.nextArrow}>›</span>
          </div>
        ) : (
          <div className={styles.liveDot} style={{ '--sheet-accent': accent } as React.CSSProperties} />
        )}
      </div>
    </div>
  );
}

export default function LiveCardSheet({
  group,
  userId,
  metalPlaceConfig,
  onClose,
  t,
}: LiveCardSheetProps) {
  const accent = groupAccentColor(group);
  const theme = sheetTheme(accent);

  const hereNow = group.members.filter((m) => !m.plan.nextBand);
  const headingNext = group.members.filter((m) => !!m.plan.nextBand);

  const isBandCard = group.kind === 'band';

  function formatHm(iso?: string | null): string {
    if (!iso) return '';
    return iso.slice(11, 16);
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div
        className={styles.sheet}
        style={theme as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={sheetTitle(group, t)}
      >
        <div className={styles.header}>
          <div className={styles.handle} />

          {isBandCard && (
            <div className={styles.stageRow}>
              <div className={styles.stageDot} />
              <span className={styles.stageName}>{group.band.stage}</span>
              <span className={styles.stageTime}>
                {formatHm(group.band.start_time)} – {formatFestivalTime(group.band.end_time)}
              </span>
            </div>
          )}

          {!isBandCard && metalPlaceConfig && group.kind === 'metal_place' && (
            <div className={styles.stageRow}>
              <div className={styles.stageDot} />
              <span className={styles.stageName}>W.E.T.</span>
              {metalPlaceConfig.start_time && metalPlaceConfig.end_time && (
                <span className={styles.stageTime}>
                  {formatHm(metalPlaceConfig.start_time)} – {formatHm(metalPlaceConfig.end_time)}
                </span>
              )}
            </div>
          )}

          <h2 className={styles.title}>{sheetTitle(group, t)}</h2>
          <p className={styles.count}>{sheetCountLabel(group, t)}</p>
        </div>

        <div className={styles.memberList}>
          {hereNow.length > 0 && (
            <>
              {headingNext.length > 0 && (
                <p className={styles.sectionLabel}>{t('hereNowSection')}</p>
              )}
              {hereNow.map((crew) => (
                <MemberRow
                  key={crew.id}
                  crew={crew}
                  isCurrentUser={crew.id === userId}
                  accent={accent}
                />
              ))}
            </>
          )}

          {hereNow.length > 0 && headingNext.length > 0 && (
            <div className={styles.divider} />
          )}

          {headingNext.length > 0 && (
            <>
              {hereNow.length > 0 && (
                <p className={styles.sectionLabel}>{t('headingNextSection')}</p>
              )}
              {headingNext.map((crew) => (
                <MemberRow
                  key={crew.id}
                  crew={crew}
                  isCurrentUser={crew.id === userId}
                  accent={accent}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
