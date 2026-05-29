/* eslint-disable */
/**
 * DEV-ONLY zone-box calibration harness — Phase 35.B/C.
 *
 * Reached at `/map?calibrate` in dev builds only (gated in MapPage). Lets you
 * drag/resize each MINIMAP_ZONES box over the real `infield_map.png`, edit
 * fractional {x,y,w,h}, preview the deterministic dot crowding, flip to a 375px
 * viewport, and copy a paste-ready `MINIMAP_ZONES` object back into
 * `minimapZones.ts`. Box correctness is a VISUAL sign-off, never a unit test.
 *
 * This whole file (+ its CSS + the MapPage gate) is DELETED in Phase 35.E.
 */
import { useRef, useState } from 'react';
import { MINIMAP_ZONES, type FractionalBox, type ZoneId } from './minimapZones';
import styles from './MinimapCalibrate.module.css';

const MAP_SRC = '/infield_map.png';

const ZONE_META: Record<ZoneId, { color: string; label: string }> = {
  wasteland: { color: '#c0392b', label: 'Wasteland' },
  camping: { color: '#2e7d32', label: 'Camping' },
  wet: { color: '#7cb342', label: 'W.E.T' },
  headbangers: { color: '#43a047', label: 'Headbangers' },
  wackinger: { color: '#8e44ad', label: 'Wackinger' },
  louder: { color: '#2980b9', label: 'Louder' },
  faster: { color: '#e67e22', label: 'Faster' },
  harder: { color: '#d35400', label: 'Harder' },
  metal_place: { color: '#d4af37', label: 'Metal Place' },
  elsewhere: { color: '#777777', label: 'Elsewhere' },
};

const ZONE_ORDER = Object.keys(MINIMAP_ZONES) as ZoneId[];

const INSET = 0.16;
const GOLDEN_ANGLE = 2.399963;

function layoutInBox(box: FractionalBox, n: number): Array<{ xPct: number; yPct: number }> {
  const out: Array<{ xPct: number; yPct: number }> = [];
  for (let i = 0; i < n; i++) {
    const r = 0.5 * Math.sqrt((i + 0.5) / Math.max(n, 1));
    const a = i * GOLDEN_ANGLE;
    let fx = 0.5 + Math.cos(a) * r;
    let fy = 0.5 + Math.sin(a) * r;
    fx = INSET + fx * (1 - 2 * INSET);
    fy = INSET + fy * (1 - 2 * INSET);
    out.push({ xPct: (box.x + fx * box.w) * 100, yPct: (box.y + fy * box.h) * 100 });
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const f3 = (n: number) => n.toFixed(3);

function zonesToSource(zones: Record<ZoneId, FractionalBox>): string {
  const body = ZONE_ORDER.map((id) => {
    const z = zones[id];
    return `  ${`${id}:`.padEnd(13)}{ x: ${f3(z.x)}, y: ${f3(z.y)}, w: ${f3(z.w)}, h: ${f3(z.h)} },`;
  }).join('\n');
  return `export const MINIMAP_ZONES: Record<ZoneId, FractionalBox> = {\n${body}\n};`;
}

export default function MinimapCalibrate() {
  const [zones, setZones] = useState<Record<ZoneId, FractionalBox>>(() =>
    structuredClone(MINIMAP_ZONES),
  );
  const [selected, setSelected] = useState<ZoneId | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDots, setShowDots] = useState(false);
  const [dotCount, setDotCount] = useState(6);
  const [w375, setW375] = useState(false);
  const [copied, setCopied] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: ZoneId;
    mode: 'move' | 'resize';
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent, id: ZoneId, mode: 'move' | 'resize') {
    e.preventDefault();
    e.stopPropagation();
    setSelected(id);
    const z = zones[id];
    drag.current = {
      id,
      mode,
      sx: e.clientX,
      sy: e.clientY,
      ox: z.x,
      oy: z.y,
      ow: z.w,
      oh: z.h,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.sx) / rect.width;
    const dy = (e.clientY - d.sy) / rect.height;
    setZones((prev) => {
      const z = { ...prev[d.id] };
      if (d.mode === 'move') {
        z.x = clamp(d.ox + dx, 0, 1 - z.w);
        z.y = clamp(d.oy + dy, 0, 1 - z.h);
      } else {
        z.w = clamp(d.ow + dx, 0.02, 1 - z.x);
        z.h = clamp(d.oh + dy, 0.02, 1 - z.y);
      }
      return { ...prev, [d.id]: z };
    });
  }

  function onPointerUp() {
    drag.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  function setField(id: ZoneId, key: keyof FractionalBox, value: number) {
    if (Number.isNaN(value)) return;
    setZones((prev) => ({ ...prev, [id]: { ...prev[id], [key]: clamp(value, 0, 1) } }));
  }

  async function copySource() {
    try {
      await navigator.clipboard.writeText(zonesToSource(zones));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={styles.harness}>
      <p className={styles.lede}>
        <strong>DEV harness</strong> — drag/resize boxes over the real artwork or edit fractional
        values, then copy <code>MINIMAP_ZONES</code> into <code>minimapZones.ts</code>. Deleted in
        Phase&nbsp;35.E.
      </p>

      <div className={styles.toolbar}>
        <button
          className={`${styles.btn} ${showBoxes ? styles.on : ''}`}
          onClick={() => setShowBoxes((v) => !v)}
        >
          Boxes
        </button>
        <button
          className={`${styles.btn} ${showLabels ? styles.on : ''}`}
          onClick={() => setShowLabels((v) => !v)}
        >
          Labels
        </button>
        <button
          className={`${styles.btn} ${showDots ? styles.on : ''}`}
          onClick={() => setShowDots((v) => !v)}
        >
          Sample dots
        </button>
        <label className={styles.rangeLabel}>
          Dots/zone
          <input
            type="range"
            min={0}
            max={14}
            value={dotCount}
            onChange={(e) => setDotCount(Number(e.target.value))}
          />
          <b>{dotCount}</b>
        </label>
        <button
          className={`${styles.btn} ${w375 ? styles.on : ''}`}
          onClick={() => setW375((v) => !v)}
        >
          375px
        </button>
        <button className={styles.btn} onClick={() => setZones(structuredClone(MINIMAP_ZONES))}>
          Reset
        </button>
        <button className={styles.btn} onClick={copySource}>
          {copied ? 'Copied ✓' : 'Copy MINIMAP_ZONES'}
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.stageHost}>
          <div
            ref={stageRef}
            className={`${styles.stage} ${w375 ? styles.w375 : ''}`}
            onClick={() => setSelected(null)}
          >
            <img src={MAP_SRC} alt="Wacken infield map" className={styles.img} />

            {showBoxes &&
              ZONE_ORDER.map((id) => {
                const z = zones[id];
                const meta = ZONE_META[id];
                return (
                  <div
                    key={id}
                    className={`${styles.zone} ${selected === id ? styles.sel : ''}`}
                    style={{
                      left: `${z.x * 100}%`,
                      top: `${z.y * 100}%`,
                      width: `${z.w * 100}%`,
                      height: `${z.h * 100}%`,
                      borderColor: meta.color,
                      background: `${meta.color}29`,
                    }}
                    onPointerDown={(e) => onPointerDown(e, id, 'move')}
                  >
                    {showLabels && (
                      <span className={styles.zlabel} style={{ background: meta.color }}>
                        {meta.label}
                      </span>
                    )}
                    <span
                      className={styles.handle}
                      onPointerDown={(e) => onPointerDown(e, id, 'resize')}
                    />
                  </div>
                );
              })}

            {showDots &&
              dotCount > 0 &&
              ZONE_ORDER.flatMap((id) =>
                layoutInBox(zones[id], dotCount).map((pt, i) => (
                  <span
                    key={`${id}-${i}`}
                    className={`${styles.dot} ${id === 'faster' && i === 0 ? styles.dotSelf : ''}`}
                    style={{
                      left: `${pt.xPct}%`,
                      top: `${pt.yPct}%`,
                      background: id === 'faster' && i === 0 ? '#16a085' : ZONE_META[id].color,
                    }}
                  />
                )),
              )}
          </div>
        </div>

        <div className={styles.panel}>
          {ZONE_ORDER.map((id) => {
            const z = zones[id];
            const meta = ZONE_META[id];
            const isSel = selected === id;
            return (
              <div
                key={id}
                className={`${styles.row} ${isSel ? styles.rowSel : ''}`}
                onClick={() => setSelected(isSel ? null : id)}
              >
                <span className={styles.sw} style={{ background: meta.color }} />
                <span className={styles.zid}>{id}</span>
                {isSel && (
                  <div className={styles.fields} onClick={(e) => e.stopPropagation()}>
                    {(['x', 'y', 'w', 'h'] as const).map((k) => (
                      <label key={k} className={styles.field}>
                        <span>{k}</span>
                        <input
                          type="number"
                          step={0.005}
                          min={0}
                          max={1}
                          value={z[k]}
                          onChange={(e) => setField(id, k, parseFloat(e.target.value))}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <pre className={styles.output}>{zonesToSource(zones)}</pre>
    </div>
  );
}
