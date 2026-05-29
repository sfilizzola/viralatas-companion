import { useState } from 'react';
import Avatar from '../../ui/Avatar';
import type { Placement } from '../../services/minimapPlacement';
import styles from './MinimapOverlay.module.css';

const MAP_SRC = '/infield_map.png';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type Props = {
  placements: Placement[];
  mapAlt: string;
};

/**
 * Presentation-only minimap. Renders the cartoon map image with one
 * absolutely-positioned avatar `<button>` per placement at fractional
 * coordinates, so dots scale with the image from 375 px to desktop.
 *
 * - Self dot: gold ring + halo, larger, rendered last (already ordered last in
 *   `placements`) so it is never buried; its name pill shows by default.
 * - Tap a dot toggles its name pill (single selection); tapping the map or the
 *   dot again dismisses, falling back to the self pill.
 * - Image-load failure degrades to a flat backdrop; dots still render.
 */
export default function MinimapOverlay({ placements, mapAlt }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={styles.wrap}
      onClick={() => setSelected(null)}
      data-img-failed={imgFailed || undefined}
    >
      {imgFailed ? (
        <div className={styles.imgFallback} role="img" aria-label={mapAlt} />
      ) : (
        <img
          src={MAP_SRC}
          alt={mapAlt}
          className={styles.img}
          loading="eager"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      )}

      {placements.map((p) => {
        const isOpen = selected === p.userId || (selected === null && p.isSelf);
        return (
          <button
            key={p.userId}
            type="button"
            className={[styles.dot, p.isSelf ? styles.self : ''].filter(Boolean).join(' ')}
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            aria-label={p.displayName}
            aria-pressed={isOpen}
            onClick={(e) => {
              e.stopPropagation();
              setSelected((cur) => (cur === p.userId ? null : p.userId));
            }}
          >
            <span className={styles.avatarRing}>
              <Avatar src={p.avatarUrl} initial={initialsOf(p.displayName)} size={24} color={p.color} />
            </span>
            {isOpen && <span className={styles.pill}>{p.displayName}</span>}
          </button>
        );
      })}
    </div>
  );
}
