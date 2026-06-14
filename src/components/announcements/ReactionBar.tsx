import { useRef, useState } from 'react';
import { useI18n } from '../../lib/i18n';
import type { AnnouncementReactionSummary } from '../../services/announcementsDisplay';
import { EmojiPicker, useLongPressTooltip, useOutsideClick } from './EmojiPicker';
import styles from './ReactionBar.module.css';

type ReactionBarProps = {
  announcementId: string;
  reactions: AnnouncementReactionSummary[];
  toggleReaction: (announcementId: string, emoji: string) => void;
};

export function ReactionBar({ announcementId, reactions, toggleReaction }: ReactionBarProps) {
  const { t } = useI18n('AnnouncementsPage');
  const [pickerOpen, setPickerOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  useOutsideClick(barRef, () => setPickerOpen(false));

  const activeEmojis = new Set(reactions.filter((r) => r.reactedByMe).map((r) => r.emoji));
  const sorted = reactions.filter((r) => r.count > 0);

  return (
    <div className={styles.bar} ref={barRef}>
      {pickerOpen && (
        <EmojiPicker
          activeEmojis={activeEmojis}
          label={t('reactionPicker')}
          onSelect={(emoji) => {
            toggleReaction(announcementId, emoji);
            setPickerOpen(false);
          }}
        />
      )}
      <div className={styles.stampRow}>
        {sorted.map((r, index) => (
          <ReactionStamp
            key={r.emoji}
            reaction={r}
            index={index}
            onToggle={() => toggleReaction(announcementId, r.emoji)}
            countLabel={t('reactionCount', { count: r.count })}
          />
        ))}
        <button
          type="button"
          className={styles.stampAdd}
          aria-label={t('reactionAdd')}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

function ReactionStamp({
  reaction,
  index,
  onToggle,
  countLabel,
}: {
  reaction: AnnouncementReactionSummary;
  index: number;
  onToggle: () => void;
  countLabel: string;
}) {
  const tooltip = useLongPressTooltip(reaction.reactors.join(', '));
  const rotationClass =
    index % 3 === 1 ? styles.stampAlt1 : index % 3 === 2 ? styles.stampAlt2 : '';

  return (
    <button
      type="button"
      className={`${reaction.reactedByMe ? styles.stampMine : styles.stamp} ${rotationClass}`}
      aria-label={countLabel}
      onClick={onToggle}
      {...tooltip}
    >
      {reaction.emoji}
      <span className={styles.badge}>{reaction.count}</span>
    </button>
  );
}
