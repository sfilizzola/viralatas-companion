type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
  className?: string;
  'aria-hidden'?: boolean;
};

export type IconName =
  | 'pick'
  | 'live'
  | 'schedule'
  | 'popular'
  | 'profile'
  | 'search'
  | 'filter'
  | 'conflict'
  | 'sync'
  | 'offline'
  | 'dismiss'
  | 'chevron'
  | 'arrow'
  | 'time'
  | 'tent'
  | 'friend'
  | 'mural';

type PathDef = (filled: boolean) => React.ReactNode;

const ICONS: Record<IconName, PathDef> = {
  pick: (filled) => (
    <polygon
      points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"
      fill={filled ? 'currentColor' : 'none'}
    />
  ),
  live: (filled) => (
    <circle cx="12" cy="12" r="6" fill={filled ? 'currentColor' : 'none'} />
  ),
  schedule: (filled) => (
    <>
      <rect x="3" y="5" width="18" height="16" fill={filled ? 'currentColor' : 'none'} />
      <path d="M3 9 H21" />
      <path d="M8 3 V7" />
      <path d="M16 3 V7" />
    </>
  ),
  popular: (filled) =>
    filled ? (
      <>
        <rect x="2" y="12" width="4" height="8" />
        <rect x="9" y="7" width="4" height="13" />
        <rect x="16" y="3" width="4" height="17" />
      </>
    ) : (
      <>
        <path d="M3 18 V12" />
        <path d="M9 18 V8" />
        <path d="M15 18 V14" />
        <path d="M21 18 V4" />
      </>
    ),
  profile: (filled) => (
    <>
      <circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} />
      <path d="M3 21 c0 -5 4 -8 9 -8 s9 3 9 8" fill={filled ? 'currentColor' : 'none'} />
    </>
  ),
  search: (_filled) => (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M21 21 L16 16" />
    </>
  ),
  filter: (_filled) => (
    <>
      <path d="M3 6 H21" />
      <path d="M6 12 H18" />
      <path d="M9 18 H15" />
    </>
  ),
  conflict: (_filled) => (
    <>
      <path d="M12 2 L22 20 L2 20 Z" />
      <path d="M12 9 V14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </>
  ),
  sync: (_filled) => (
    <>
      <path d="M3 12 a9 9 0 0 1 18 0" />
      <polyline points="21 7 21 12 16 12" />
      <path d="M12 6 V12 L16 14" />
    </>
  ),
  offline: (_filled) => (
    <>
      <path d="M2 12 a10 10 0 0 1 20 0" />
      <path d="M5 12 a7 7 0 0 1 14 0" />
      <path d="M9 12 a3 3 0 0 1 6 0" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </>
  ),
  dismiss: (_filled) => (
    <>
      <path d="M3 3 L21 21" />
      <path d="M21 3 L3 21" />
    </>
  ),
  chevron: (_filled) => <path d="M5 8 L12 15 L19 8" />,
  arrow: (_filled) => (
    <>
      <path d="M3 12 H21" />
      <path d="M14 5 L21 12 L14 19" />
    </>
  ),
  time: (_filled) => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7 V12 L15 14" />
    </>
  ),
  tent: (_filled) => (
    <>
      <path d="M3 21 L8 4 L16 4 L21 21" />
      <path d="M8 12 H16" />
    </>
  ),
  friend: (_filled) => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9 H9.01" />
      <path d="M15 9 H15.01" />
      <path d="M8 15 c1 1 6 3 8 0" />
    </>
  ),
  mural: (_filled) => <path d="M3 11l19-9-9 19-2-8-8-2z" />,
};

export default function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  filled = false,
  className,
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={ariaHidden}
      className={className}
    >
      {ICONS[name](filled)}
    </svg>
  );
}
