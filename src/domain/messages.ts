import type { PlantStage } from './plant';

/**
 * Saksının uygulama içi balon mesajları (prototipin "Komik" tarzı).
 * Hakaret, suçlama veya fazla su içmeye teşvik içermez.
 * Aşama 1'de yalnızca bunlar kullanılır; hatırlatma metinleri bildirim aşamasında eklenecek.
 */
export const BUBBLE_HELLO = 'Merhaba! Ben bugünün tohumuyum. İlk bardakla uyanırım 🌱';

/** Kayıttan sonra aşama değiştiyse. İndeks = yeni aşama. */
const STAGE_UP: Record<PlantStage, string> = {
  0: '',
  1: 'Filiz verdim! Devamı gelsin 🌱',
  2: 'Oh be! Hem sen ferahladın hem ben yapraklandım 🌿',
  3: 'Tomurcuk göründü! Çiçeğe az kaldı 🌷',
  4: 'Bugünün çiçeği açtı! Görev tamam 🌸',
};

/** Kayıttan sonra aşama aynı kaldıysa. */
const STAGE_SAME: Record<PlantStage, string> = {
  0: 'İlk yudumlar geldi, tohum kıpırdanıyor 💧',
  1: 'Sağ ol! Filizim dikleşti 🌱',
  2: 'İyi geldi! Yapraklarım parlıyor 🌿',
  3: 'Tomurcuk doldu doldu, az kaldı 🌷',
  4: 'Kaydettim. Çiçek zaten açık, keyfine bak 🌸',
};

/** Kayıt düzeltildi/silindi/geri alındı: bitki yeni toplama göre yeniden çizilir. */
export const BUBBLE_EDIT = 'Kaydı düzelttim, boyumu da ona göre ayarladım 🌱';

export type BubbleEvent = 'idle' | 'stage-up' | 'stage-same' | 'edited';

export function bubbleText(event: BubbleEvent, stage: PlantStage, total: number): string {
  if (event === 'stage-up' && stage > 0) return STAGE_UP[stage];
  if (event === 'stage-same') return STAGE_SAME[stage];
  if (event === 'edited') return BUBBLE_EDIT;
  // Uygulama yeni açıldı: kayıt yoksa karşılama, varsa durumu özetleyen cümle.
  if (total <= 0) return BUBBLE_HELLO;
  return stage === 4 ? STAGE_UP[4] : STAGE_SAME[stage];
}
