import type { KeyboardEvent, MouseEvent } from 'react';
import type { Band } from '../types';
import styles from './AnnouncementPosterGrid.module.css';

type Props = {
  hero: Band | null;
  rest: Band[];
  pickCounts: Record<string, number>;
  pickedIds: Set<string>;
  pendingBandIds: Set<string>;
  heroBadge: string;
  onOpenBand: (bandId: string) => void;
  onTogglePick: (bandId: string) => void;
};

export default function AnnouncementPosterGrid({
  hero,
  rest,
  pickCounts,
  pickedIds,
  pendingBandIds,
  heroBadge,
  onOpenBand,
  onTogglePick,
}: Props) {
  const bands = hero ? [hero, ...rest] : rest;

  function openFromKeyboard(event: KeyboardEvent<HTMLElement>, bandId: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpenBand(bandId);
  }

  function toggleFromStamp(event: MouseEvent<HTMLButtonElement>, bandId: string) {
    event.stopPropagation();
    onTogglePick(bandId);
  }

  return (
    <div className={styles.grid}>
      {bands.map((band) => {
        const isHero = hero?.id === band.id;
        const isPicked = pickedIds.has(band.id);
        const isPending = pendingBandIds.has(band.id);
        return (
          <article
            key={band.id}
            className={`${styles.poster} ${isHero ? styles.hero : ''}`}
            onClick={() => onOpenBand(band.id)}
            onKeyDown={(event) => openFromKeyboard(event, band.id)}
            role="button"
            tabIndex={0}
            aria-label={band.name}
          >
            {band.image_url ? (
              <img className={styles.image} src={band.image_url} alt="" loading="lazy" />
            ) : (
              <div className={styles.initials} aria-hidden="true">
                {initials(band.name)}
              </div>
            )}
            {isHero && <span className={styles.heroBadge}>{heroBadge}</span>}
            <button
              className={`${styles.stamp} ${isPicked ? styles.stampPicked : ''} ${isPending ? styles.stampPending : ''}`}
              type="button"
              aria-label={`${isPicked ? 'Remove' : 'Add'} ${band.name}`}
              aria-pressed={isPicked}
              onClick={(event) => toggleFromStamp(event, band.id)}
            >
              {pickCounts[band.id] ?? 0}
            </button>
            <div className={styles.caption}>
              <h2>{band.name}</h2>
              {band.genre && <span>{band.genre}</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
