import Icon from './Icon';

type StarIconProps = {
  filled: boolean;
  size?: number;
  strokeWidth?: number;
};

export default function StarIcon({ filled, size = 22, strokeWidth = 2 }: StarIconProps) {
  return <Icon name="pick" size={size} strokeWidth={strokeWidth} filled={filled} />;
}
