import type { PlantStage } from './plant';
import type { Tone } from './profile';

/**
 * Saksının metinleri (prototipten). Hakaret, suçlama veya fazla su içmeye teşvik içermez.
 * `rem`: hatırlatma seviyeleri 1–4 (son seviyeden sonra ton sertleşmez), `alt`: aynı seviyenin alternatifi.
 * `up`/`same`: kayıttan sonra uygulama içi balon (indeks = yeni aşama). `edit`/`hello`: düzeltme ve karşılama.
 */
export interface ToneTexts {
  label: string;
  description: string;
  rem: readonly [string, string, string, string];
  alt: readonly [string, string, string, string];
  up: Record<PlantStage, string>;
  same: Record<PlantStage, string>;
  edit: string;
  hello: string;
}

export const MESSAGES: Record<Tone, ToneTexts> = {
  komik: {
    label: 'Komik ve giderek daha direkt',
    description: 'Saksı araya girer; kayıt gelmedikçe biraz daha üsteler.',
    rem: [
      'Su molası! Saksı hazır, bardak nerede? 🌱',
      'Bardağın seni özledi. Bir görüşseniz mi? 🥤',
      'Bitkiyle bakışıyoruz. İkimiz de senden haber bekliyoruz 👀',
      'Erteleme konusunda kök saldın. Şimdi su molası verelim 😂',
    ],
    alt: [
      'Yudum molası! Toprağım hazır, sıra sende 🌱',
      'Bardak masada yalnız kaldı. Bir uğrasan mı? 🥤',
      'Saksıdan sesleniyorum: Kayıt yok, merak ettik 👀',
      'Erteleme şampiyonu sensin. Şimdi bir su molası 😄',
    ],
    up: {
      0: '',
      1: 'Filiz verdim! Devamı gelsin 🌱',
      2: 'Oh be! Hem sen ferahladın hem ben yapraklandım 🌿',
      3: 'Tomurcuk göründü! Çiçeğe az kaldı 🌷',
      4: 'Bugünün çiçeği açtı! Görev tamam 🌸',
    },
    same: {
      0: 'İlk yudumlar geldi, tohum kıpırdanıyor 💧',
      1: 'Sağ ol! Filizim dikleşti 🌱',
      2: 'İyi geldi! Yapraklarım parlıyor 🌿',
      3: 'Tomurcuk doldu doldu, az kaldı 🌷',
      4: 'Kaydettim. Çiçek zaten açık, keyfine bak 🌸',
    },
    edit: 'Kaydı düzelttim, boyumu da ona göre ayarladım 🌱',
    hello: 'Merhaba! Ben bugünün tohumuyum. İlk bardakla uyanırım 🌱',
  },
  nazik: {
    label: 'Nazik',
    description: 'Sakin ve kısa hatırlatmalar; ton hep aynı kalır.',
    rem: [
      'Su molası zamanı 🌱',
      'Su içmeyi unuttun mu? İçtiysen kaydet.',
      'Bir süredir kayıt yok. Kısa bir su molası verebilirsin.',
      'Mola zamanı. İçtiğin suyu kaydetmeyi unutma.',
    ],
    alt: [
      'Bir bardak su iyi gelebilir.',
      'İçtiysen kaydetmeyi unutma.',
      'Kayıt eklemek için uygun bir an olabilir.',
      'Hazır olduğunda kaydını ekleyebilirsin.',
    ],
    up: {
      0: '',
      1: 'Kaydedildi. Bitkin filizlendi.',
      2: 'Kaydedildi. Bitkin yapraklandı.',
      3: 'Kaydedildi. Tomurcuk göründü.',
      4: 'Günlük hedef tamamlandı. Bugünlük hatırlatma yok.',
    },
    same: {
      0: 'Kaydedildi. Tohum büyümeye hazırlanıyor.',
      1: 'Kaydedildi. Filiz büyüyor.',
      2: 'Kaydedildi. Yapraklar güçleniyor.',
      3: 'Kaydedildi. Çiçeğe az kaldı.',
      4: 'Kaydedildi. Günlük hedef zaten tamam.',
    },
    edit: 'Kayıt güncellendi. Bitkin yeni toplama göre ayarlandı.',
    hello: 'Hoş geldin. İlk kaydınla tohum büyümeye başlar.',
  },
};

/** Kayıt düzeltildi/silindi/geri alındı: bitki yeni toplama göre yeniden çizilir. */
export type BubbleEvent = 'idle' | 'stage-up' | 'stage-same' | 'edited';

export function bubbleText(event: BubbleEvent, stage: PlantStage, total: number, tone: Tone = 'komik'): string {
  const m = MESSAGES[tone];
  if (event === 'stage-up' && stage > 0) return m.up[stage];
  if (event === 'stage-same') return m.same[stage];
  if (event === 'edited') return m.edit;
  // Uygulama yeni açıldı: kayıt yoksa karşılama, varsa durumu özetleyen cümle.
  if (total <= 0) return m.hello;
  return stage === 4 ? m.up[4] : m.same[stage];
}

export interface MessageRow {
  when: string;
  main: string;
  alt: string;
}

/** "Mesaj örnekleri" tablosu: seviye zamanı hatırlatma aralığına göre (seviye n = n × aralık sonra). */
export function messageRows(tone: Tone, intervalMin: number): MessageRow[] {
  const m = MESSAGES[tone];
  const hours = (n: number) => {
    const h = (n * intervalMin) / 60;
    return Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',');
  };
  const rows: MessageRow[] = m.rem.map((text, i) => ({
    when:
      i === 0
        ? `1. seviye · son kayıttan ${hours(1)} saat sonra`
        : i < 3
          ? `${i + 1}. seviye · ${hours(i + 1)} saat sonra`
          : `Son seviye · ${hours(4)} saat ve sonrası`,
    main: text,
    alt: `Alternatif: ${m.alt[i]}`,
  }));
  rows.push({ when: 'Kayıt sonrası · aşama değişince', main: m.up[2], alt: `Aşama aynı kalınca: ${m.same[2]}` });
  rows.push({ when: 'Hedef tamamlanınca', main: m.up[4], alt: `Sonraki kayıtlarda: ${m.same[4]}` });
  rows.push({ when: 'Kayıt düzeltilince ya da silinince', main: m.edit, alt: 'Bitki, düzeltilmiş günlük toplama göre yeniden çizilir.' });
  return rows;
}
