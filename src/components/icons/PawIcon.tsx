type Props = {
  filled: boolean;
  size?: number;
};

function Toe({
  cx,
  cy,
  rx,
  ry,
  color,
  fill,
  strokeWidth,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  fill: string;
  strokeWidth: number;
}) {
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={color} strokeWidth={strokeWidth} />
  );
}

function MainPad({
  cx,
  cy,
  rx,
  ry,
  color,
  fill,
  strokeWidth,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  fill: string;
  strokeWidth: number;
}) {
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={color} strokeWidth={strokeWidth} />
  );
}

/** Locked Phase 32 icon — Canine + heel at −14° (IconPawFinal). */
export default function PawIcon({ filled, size = 20 }: Props) {
  const color = filled ? 'currentColor' : 'currentColor';
  const fill = filled ? 'currentColor' : 'none';
  const strokeWidth = filled ? 0 : 1.35;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <g transform="rotate(-14 12 12)">
        <Toe cx={6.5} cy={8.8} rx={1.95} ry={2.45} color={color} fill={fill} strokeWidth={strokeWidth} />
        <Toe cx={9.8} cy={5.5} rx={2.1} ry={2.7} color={color} fill={fill} strokeWidth={strokeWidth} />
        <Toe cx={14.2} cy={5.5} rx={2.1} ry={2.7} color={color} fill={fill} strokeWidth={strokeWidth} />
        <Toe cx={17.5} cy={8.8} rx={1.95} ry={2.45} color={color} fill={fill} strokeWidth={strokeWidth} />
        <MainPad cx={12} cy={15.8} rx={5.8} ry={4.2} color={color} fill={fill} strokeWidth={strokeWidth} />
        <ellipse
          cx={12}
          cy={19.2}
          rx={2.8}
          ry={1.6}
          fill={fill}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={filled ? 0.85 : 1}
        />
      </g>
    </svg>
  );
}
