import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { PlantStage } from '@/domain/plant';

const LABELS: Record<PlantStage, string> = {
  0: 'Tohum',
  1: 'Filiz',
  2: 'Yapraklı bitki',
  3: 'Tomurcuk',
  4: 'Çiçek açmış bitki',
};

interface Props {
  stage: PlantStage;
  /** Piksel genişliği; yükseklik 1,2 katıdır. */
  width: number;
}

const LEAF_VEINS = '#D8F2CF';
const STEM = '#5FAE62';

/** Prototipteki saksı + beş aşamalı bitki çizimi (design/prototype.html → "Bitki" bileşeni). */
export function Plant({ stage, width }: Props) {
  return (
    <Svg
      width={width}
      height={width * 1.2}
      viewBox="0 0 200 240"
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABELS[stage]}
    >
      <Ellipse cx={100} cy={233} rx={50} ry={5} fill="#3D2B22" opacity={0.12} />
      <Path d="M62 172 H138 L131 222 Q129.5 232 120 232 H80 Q70.5 232 69 222 Z" fill="#E58E66" />
      <Rect x={54} y={156} width={92} height={20} rx={10} fill="#F0A27D" />

      {stage === 0 && (
        <G>
          <Ellipse cx={100} cy={150} rx={9.5} ry={8} fill="#B9855A" />
          <Path d="M95 146 q3 -3 7 -2" fill="none" stroke="#E0B78E" strokeWidth={2} strokeLinecap="round" />
        </G>
      )}

      <Ellipse cx={100} cy={159} rx={34} ry={4} fill="#6B4636" />
      <Circle cx={89} cy={197} r={2.8} fill="#4A2E24" />
      <Circle cx={111} cy={197} r={2.8} fill="#4A2E24" />
      <Path d="M95 204 Q100 209 105 204" fill="none" stroke="#4A2E24" strokeWidth={2.2} strokeLinecap="round" />
      <Ellipse cx={80} cy={204} rx={5} ry={3} fill="#F7B79B" />
      <Ellipse cx={120} cy={204} rx={5} ry={3} fill="#F7B79B" />

      {stage === 1 && (
        <G>
          <Path d="M100 158 V134" fill="none" stroke={STEM} strokeWidth={6} strokeLinecap="round" />
          <Path d="M100 136 Q80 142 72 120 Q96 110 100 136 Z" fill="#8ACB80" />
          <Path d="M100 136 Q120 142 128 120 Q104 110 100 136 Z" fill="#6DBB6B" />
        </G>
      )}

      {stage === 2 && (
        <G>
          <Path d="M100 158 C101 132 99 112 100 92" fill="none" stroke={STEM} strokeWidth={6} strokeLinecap="round" />
          <Path d="M100 144 Q70 156 56 126 Q86 108 100 144 Z" fill="#6DBB6B" />
          <Path d="M100 128 Q130 138 144 108 Q114 92 100 128 Z" fill="#8ACB80" />
          <Path d="M100 112 Q74 118 62 90 Q90 80 100 112 Z" fill="#8ACB80" />
          <Path d="M100 100 Q124 104 134 76 Q108 70 100 100 Z" fill="#6DBB6B" />
          <Path d="M100 94 Q82 74 100 50 Q118 74 100 94 Z" fill="#A5DB96" />
          <Path
            d="M90 139 L70 130 M110 123 L130 113 M91 107 L74 96 M108 95 L123 84 M100 84 L100 64"
            fill="none"
            stroke={LEAF_VEINS}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.8}
          />
        </G>
      )}

      {stage >= 3 && (
        <G>
          <Path d="M100 158 C101 130 99 100 100 66" fill="none" stroke={STEM} strokeWidth={6} strokeLinecap="round" />
          <Path d="M100 144 Q70 156 56 126 Q86 108 100 144 Z" fill="#6DBB6B" />
          <Path d="M100 128 Q130 138 144 108 Q114 92 100 128 Z" fill="#8ACB80" />
          <Path d="M100 112 Q74 118 62 90 Q90 80 100 112 Z" fill="#8ACB80" />
          <Path d="M100 100 Q124 104 134 76 Q108 70 100 100 Z" fill="#6DBB6B" />
          <Path
            d="M90 139 L70 130 M110 123 L130 113 M91 107 L74 96 M108 95 L123 84"
            fill="none"
            stroke={LEAF_VEINS}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.8}
          />
        </G>
      )}

      {stage === 3 && (
        <G>
          <Circle cx={100} cy={48} r={15} fill="#F58F9B" />
          <Path d="M92 41 q3.5 -5.5 9 -5.5" fill="none" stroke="#FFD0D5" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M84 53 Q100 76 116 53 Q100 64 84 53 Z" fill={STEM} />
        </G>
      )}

      {stage === 4 && (
        <G>
          <Circle cx={100} cy={29} r={12.5} fill="#F58F9B" />
          <Circle cx={115.2} cy={40} r={12.5} fill="#F58F9B" />
          <Circle cx={109.4} cy={58} r={12.5} fill="#F58F9B" />
          <Circle cx={90.6} cy={58} r={12.5} fill="#F58F9B" />
          <Circle cx={84.8} cy={40} r={12.5} fill="#F58F9B" />
          <Circle cx={100} cy={45} r={9.5} fill="#FFD46B" />
        </G>
      )}
    </Svg>
  );
}
