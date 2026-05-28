import PawIcon from './PawIcon';

type StarIconProps = {
  filled: boolean;
  size?: number;
  strokeWidth?: number;
};

/** Pick toggle on BandCard — locked canine paw (Phase 32 asset). */
export default function StarIcon({ filled, size = 22 }: StarIconProps) {
  return <PawIcon filled={filled} size={size} />;
}
