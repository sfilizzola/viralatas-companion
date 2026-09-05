import type { CrewUser } from '../../types';
import Avatar from '../../ui/Avatar';
import Modal from '../../ui/Modal';
import styles from './PlanningNow.module.css';

type PlanningMemberSheetProps = {
  members: CrewUser[];
  open: boolean;
  title: string;
  unknownName: string;
  closeLabel: string;
  onClose: () => void;
};

function memberName(member: CrewUser, unknownName: string): string {
  return member.display_name?.trim() || unknownName;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2) || 'VL')
    .toUpperCase();
}

export default function PlanningMemberSheet({
  members,
  open,
  title,
  unknownName,
  closeLabel,
  onClose,
}: PlanningMemberSheetProps) {
  if (!open) return null;

  return (
    // The shared Modal exposes only `aria-label` for its dialog node, so the
    // roster title doubles as the accessible name and the visible heading.
    <Modal
      position="bottom"
      aria-label={title}
      onClose={onClose}
      contentClassName={styles.memberSheet}
    >
      <div className={styles.sheetHeader}>
        <h2 className={styles.sheetTitle}>{title}</h2>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          {closeLabel}
        </button>
      </div>
      <ul className={styles.memberList}>
        {members.map((member) => {
          const name = memberName(member, unknownName);
          return (
            <li key={member.id} className={styles.memberRow}>
              <Avatar src={member.avatar_url} initial={initials(name)} size={32} />
              <span>{name}</span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
