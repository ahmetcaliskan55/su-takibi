import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';

/** Su damlası. `filled`: dolu mavi damla (üzerinde tik), değilse kesik çizgili boş damla. */
export function DropIcon({ width, height, filled, check = false }: { width: number; height: number; filled: boolean; check?: boolean }) {
  if (!filled) {
    return (
      <Svg width={width} height={height} viewBox="0 0 30 36">
        <Path
          d="M15 3 C21 11 26 16.5 26 23 A11 11 0 0 1 4 23 C4 16.5 9 11 15 3 Z"
          fill={colors.cream}
          stroke={colors.borderDashed}
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={width} height={height} viewBox="0 0 30 36">
      <Path d="M15 2 C21 10 27 16 27 23 A12 12 0 0 1 3 23 C3 16 9 10 15 2 Z" fill={colors.water} />
      {check && (
        <Path d="M10 23 l4 4 l7 -8" fill="none" stroke={colors.white} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}
