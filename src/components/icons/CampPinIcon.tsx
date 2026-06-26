type CampPinIconProps = {
  size?: number;
  className?: string;
  showCross?: boolean;
};

export default function CampPinIcon({ size = 24, className, showCross = false }: CampPinIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21s-6.5-5.2-6.5-10a6.5 6.5 0 1 1 13 0c0 4.8-6.5 10-6.5 10Z" />
      <path d="M9.2 5.8 7.8 3.2h8.4L14.8 5.8" fill="currentColor" stroke="none" />
      {showCross && <path d="M12 7.5v5.2M10.2 10.8h3.6" strokeWidth="1.4" />}
    </svg>
  );
}
