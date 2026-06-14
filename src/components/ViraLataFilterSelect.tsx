import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';
import Icon from './icons/Icon';
import { Avatar } from '../ui';
import type { BandAttendee } from '../hooks/useBandAttendees';
import styles from './ViraLataFilterSelect.module.css';

const DISPLAY_NAME_MAX = 20;

function trimDisplayName(name: string, maxLen = DISPLAY_NAME_MAX): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

function matchesQuery(label: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q);
}

type Props = {
  value: string | null;
  onChange: (userId: string | null) => void;
  members: BandAttendee[];
  pickCounts: Record<string, number>;
};

export default function ViraLataFilterSelect({ value, onChange, members, pickCounts }: Props) {
  const { t } = useI18n('SchedulePage');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = members.find((m) => m.id === value) ?? null;
  const selectedCount = value ? (pickCounts[value] ?? 0) : 0;
  const trimmedQuery = query.trim();
  const filteredMembers = useMemo(
    () => (trimmedQuery ? members.filter((m) => matchesQuery(m.label, trimmedQuery)) : members),
    [members, trimmedQuery],
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  function pick(userId: string | null) {
    onChange(userId);
    setOpen(false);
  }

  const boxClass = [
    styles.selectBox,
    open ? styles.selectBoxOpen : '',
    value ? styles.selectBoxActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={boxClass} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('viraLataSelectAria')}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <span className={styles.triggerAvatar}>
            <Avatar
              size={32}
              src={selected.avatar_url}
              initial={(selected.label[0] ?? '?').toUpperCase()}
            />
          </span>
        ) : (
          <span className={styles.optionAllIcon} aria-hidden>
            ∅
          </span>
        )}

        <span className={styles.triggerBody}>
          <span
            className={`${styles.triggerLabel} ${selected ? '' : styles.triggerLabelMuted}`}
            title={selected?.label}
          >
            {selected ? trimDisplayName(selected.label) : t('viraLataSelectPrompt')}
          </span>
          {selected && (
            <span className={styles.triggerMeta}>
              {t('viraLataPickCount', { count: selectedCount })}
            </span>
          )}
          {!selected && (
            <span className={`${styles.triggerMeta} ${styles.triggerMetaMuted}`}>
              {t('todos')}
            </span>
          )}
        </span>

        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden>
          <Icon name="chevron" size={16} />
        </span>
      </button>

      {open && (
        <div className={styles.expandPanel}>
          <div className={styles.searchRow}>
            <input
              ref={searchRef}
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('viraLataSearchPlaceholder')}
              aria-label={t('viraLataSearchPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
            />
            {trimmedQuery.length > 0 && (
              <button
                type="button"
                className={styles.searchClear}
                aria-label={t('limpar')}
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
              >
                ×
              </button>
            )}
          </div>

          <div className={styles.list} role="listbox" aria-label={t('viraLata')}>
            {!trimmedQuery && (
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                className={`${styles.option} ${value === null ? styles.optionActive : ''}`}
                onClick={() => pick(null)}
              >
                <span className={styles.optionAllIcon} aria-hidden>
                  ∅
                </span>
                <span className={styles.optionBody}>
                  <span className={styles.optionName}>{t('todos')}</span>
                </span>
              </button>
            )}

            {filteredMembers.map((member) => {
              const active = value === member.id;
              const count = pickCounts[member.id] ?? 0;
              return (
                <button
                  key={member.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`${styles.option} ${active ? styles.optionActive : ''}`}
                  onClick={() => pick(member.id)}
                >
                  <Avatar
                    size={32}
                    src={member.avatar_url}
                    initial={(member.label[0] ?? '?').toUpperCase()}
                  />
                  <span className={styles.optionBody}>
                    <span className={styles.optionName} title={member.label}>
                      {trimDisplayName(member.label)}
                    </span>
                    <span className={styles.optionCount}>
                      {t('viraLataPickCount', { count })}
                    </span>
                  </span>
                </button>
              );
            })}

            {trimmedQuery.length > 0 && filteredMembers.length === 0 && (
              <p className={styles.emptySearch}>{t('viraLataSearchEmpty')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
