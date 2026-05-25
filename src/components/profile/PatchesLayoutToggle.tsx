import { useEffect, useState } from 'react';
import {
  loadPatchesLayout,
  PATCHES_LAYOUT_CHANGED_EVENT,
  savePatchesLayout,
  type PatchesLayout,
} from '../../lib/patchesLayout';
import styles from './PatchesLayoutToggle.module.css';

type TFn = (key: string, values?: Record<string, string | number>) => string;

type PatchesLayoutToggleProps = Readonly<{
  t: TFn;
}>;

function ChaoticIcon() {
  return (
    <svg className={styles.icon} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="5" cy="6" r="2.2" fill="currentColor" opacity="0.85" />
      <circle cx="14" cy="4" r="2" fill="currentColor" />
      <circle cx="17" cy="13" r="2.2" fill="currentColor" opacity="0.9" />
      <circle cx="7" cy="16" r="1.8" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

function NeatIcon() {
  return (
    <svg className={styles.icon} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="8" cy="11" r="4.5" fill="currentColor" opacity="0.55" />
      <circle cx="13" cy="11" r="4.5" fill="currentColor" opacity="0.75" />
      <circle cx="18" cy="11" r="4.5" fill="currentColor" />
    </svg>
  );
}

export default function PatchesLayoutToggle({ t }: PatchesLayoutToggleProps) {
  const [selected, setSelected] = useState<PatchesLayout>(() => loadPatchesLayout());

  useEffect(() => {
    function onChange(event: Event) {
      const next = (event as CustomEvent<PatchesLayout>).detail;
      if (next) setSelected(next);
    }
    globalThis.addEventListener(PATCHES_LAYOUT_CHANGED_EVENT, onChange);
    return () => globalThis.removeEventListener(PATCHES_LAYOUT_CHANGED_EVENT, onChange);
  }, []);

  function handlePick(value: PatchesLayout) {
    setSelected(value);
    savePatchesLayout(value);
  }

  return (
    <div className={styles.group} role="radiogroup" aria-label={t('patchesLayout')}>
      <button
        type="button"
        role="radio"
        aria-checked={selected === 'chaotic'}
        aria-label={t('layoutChaotic')}
        className={`${styles.btn} ${selected === 'chaotic' ? styles.selected : ''}`}
        onClick={() => handlePick('chaotic')}
      >
        <ChaoticIcon />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={selected === 'neat'}
        aria-label={t('layoutNeat')}
        className={`${styles.btn} ${selected === 'neat' ? styles.selected : ''}`}
        onClick={() => handlePick('neat')}
      >
        <NeatIcon />
      </button>
    </div>
  );
}
