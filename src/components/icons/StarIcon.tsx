// Canonical pick-star icon. SVG path matches the design system § 06 verbatim.
// Reused by BandCard, BandDetailModal, and (later) BottomNav. Pure
// presentational — currentColor + stroke/fill flips drive every visual state.

type StarIconProps = {
  filled: boolean;
  size?: number;
  strokeWidth?: number;
};

export default function StarIcon({ filled, size = 22, strokeWidth = 2 }: StarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
