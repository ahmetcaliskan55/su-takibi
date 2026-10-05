/**
 * Günlük bitki aşamaları.
 *
 * Eşikler hedefin %0 / %25 / %50 / %75 / %100'ünde başlar.
 * Karşılaştırmalar tam sayı çarpımıyla yapılır (toplam * 4 >= hedef * k); kayan nokta
 * yuvarlama hatası sınırdaki değerleri yanlış aşamaya düşüremez.
 *
 * Bitki ölmez: aşama yalnızca 0..4 arasındadır, hedefin üzerindeki miktar ek aşama vermez.
 */

export type PlantStage = 0 | 1 | 2 | 3 | 4;

export const STAGE_NAMES = ['Tohum', 'Filiz', 'Yapraklı', 'Tomurcuk', 'Çiçek'] as const;

export function plantStage(totalMl: number, goalMl: number): PlantStage {
  if (!(goalMl > 0) || !(totalMl > 0)) return 0;
  const scaled = totalMl * 4;
  if (scaled >= goalMl * 4) return 4;
  if (scaled >= goalMl * 3) return 3;
  if (scaled >= goalMl * 2) return 2;
  if (scaled >= goalMl) return 1;
  return 0;
}

/** Tam yüzde (0..100). Hedefin üstü %100'de kalır. */
export function progressPercent(totalMl: number, goalMl: number): number {
  if (!(goalMl > 0) || !(totalMl > 0)) return 0;
  return Math.min(100, Math.round((totalMl / goalMl) * 100));
}

/** Hedefe kalan ml; hedef aşılmışsa 0. */
export function remainingMl(totalMl: number, goalMl: number): number {
  return Math.max(0, goalMl - totalMl);
}

export interface NextStage {
  /** Bir sonraki aşamanın adı */
  name: string;
  /** O aşamaya kalan ml (>= 1) */
  mlLeft: number;
}

/** Çiçek açtıysa `null`. */
export function nextStage(totalMl: number, goalMl: number): NextStage | null {
  const stage = plantStage(totalMl, goalMl);
  if (stage === 4) return null;
  const threshold = Math.ceil((goalMl * (stage + 1)) / 4);
  return { name: STAGE_NAMES[stage + 1] ?? STAGE_NAMES[4], mlLeft: threshold - totalMl };
}
