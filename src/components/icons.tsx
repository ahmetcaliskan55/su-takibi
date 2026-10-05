import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color: string;
}

const stroke = (color: string, w: number) =>
  ({ fill: 'none', stroke: color, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' }) as const;

export function SproutIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21v-9" {...stroke(color, 2.2)} />
      <Path d="M12 12c0-3.5-2.5-6-6.5-6 0 3.8 2.5 6 6.5 6z" {...stroke(color, 2.2)} />
      <Path d="M12 14c0-3 2.2-5 6-5 0 3.3-2.2 5-6 5z" {...stroke(color, 2.2)} />
    </Svg>
  );
}

export function CalendarIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={5} width={16} height={15} rx={3} {...stroke(color, 2.2)} />
      <Path d="M8 3v4M16 3v4M4 10h16" {...stroke(color, 2.2)} />
    </Svg>
  );
}

export function SlidersIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...stroke(color, 2.2)} />
      <Circle cx={16} cy={7} r={2} {...stroke(color, 2.2)} />
      <Circle cx={8} cy={17} r={2} {...stroke(color, 2.2)} />
    </Svg>
  );
}

export function ClockIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.5} {...stroke(color, 2.2)} />
      <Path d="M12 7.5V12l3 2" {...stroke(color, 2.2)} />
    </Svg>
  );
}

export function PlusIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" {...stroke(color, 2.6)} />
    </Svg>
  );
}

export function ChevronIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5l7 7-7 7" {...stroke(color, 2.6)} />
    </Svg>
  );
}

export function PencilIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20h4L19 9l-4-4L4 16v4z" {...stroke(color, 2.4)} />
    </Svg>
  );
}
