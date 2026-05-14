import { useEffect, useState } from 'react';
import {
  loadPatchesBackground,
  savePatchesBackground,
  PATCHES_BG_CHANGED_EVENT,
  PATCHES_BG_VALUES,
  type PatchesBackground,
} from '../../lib/patchesBackground';
import styles from './PatchesBackgroundPicker.module.css';

type TFn = (key: string, values?: Record<string, string | number>) => string;

type PatchesBackgroundPickerProps = {
  t: TFn;
};

const SWATCH_CLASS: Record<PatchesBackground, string> = {
  none: styles.swatchNone,
  grid: styles.swatchGrid,
  steel: styles.swatchSteel,
  indigo: styles.swatchIndigo,
  leather: styles.swatchLeather,
};

const LABEL_KEY: Record<PatchesBackground, string> = {
  none: 'bgNone',
  grid: 'bgGrid',
  steel: 'bgSteel',
  indigo: 'bgIndigo',
  leather: 'bgLeather',
};

export default function PatchesBackgroundPicker({ t }: PatchesBackgroundPickerProps) {
  const [selected, setSelected] = useState<PatchesBackground>(() => loadPatchesBackground());

  useEffect(() => {
    function onChange(event: Event) {
      const next = (event as CustomEvent<PatchesBackground>).detail;
      if (next) setSelected(next);
    }
    window.addEventListener(PATCHES_BG_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PATCHES_BG_CHANGED_EVENT, onChange);
  }, []);

  function handlePick(value: PatchesBackground) {
    setSelected(value);
    savePatchesBackground(value);
  }

  return (
    <div className={styles.row} role="radiogroup" aria-label={t('patchesBackground')}>
      {PATCHES_BG_VALUES.map((value) => {
        const isSelected = value === selected;
        const label = t(LABEL_KEY[value]);
        return (
          <div
            key={value}
            className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              className={`${styles.swatch} ${SWATCH_CLASS[value]} ${isSelected ? styles.selected : ''}`}
              onClick={() => handlePick(value)}
            />
            <span className={styles.label}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
