import { bubbleText, MESSAGES, messageRows } from './messages';
import { parseGlassAmount } from './profile';

describe('MESSAGES', () => {
  it.each(['komik', 'nazik'] as const)('%s tarzı eksiksiz: 4 hatırlatma seviyesi, alternatifler ve balon metinleri', (tone) => {
    const m = MESSAGES[tone];
    expect(m.rem).toHaveLength(4);
    expect(m.alt).toHaveLength(4);
    for (const t of [...m.rem, ...m.alt, m.edit, m.hello, m.label, m.description]) expect(t.trim().length).toBeGreaterThan(0);
    for (const stage of [1, 2, 3, 4] as const) {
      expect(m.up[stage]).not.toBe('');
      expect(m.same[stage]).not.toBe('');
    }
    expect(m.same[0]).not.toBe('');
  });

  it('komik tarz örnek metinleri korunur', () => {
    expect(MESSAGES.komik.rem[0]).toBe('Su molası! Saksı hazır, bardak nerede? 🌱');
    expect(MESSAGES.komik.rem[1]).toBe('Bardağın seni özledi. Bir görüşseniz mi? 🥤');
    expect(MESSAGES.komik.rem[2]).toBe('Bitkiyle bakışıyoruz. İkimiz de senden haber bekliyoruz 👀');
    expect(MESSAGES.komik.rem[3]).toBe('Erteleme konusunda kök saldın. Şimdi su molası verelim 😂');
    expect(MESSAGES.komik.up[4]).toBe('Bugünün çiçeği açtı! Görev tamam 🌸');
  });
});

describe('bubbleText tona göre', () => {
  it('karşılama, aşama değişimi, aynı kalma ve düzeltme', () => {
    expect(bubbleText('idle', 0, 0, 'nazik')).toBe(MESSAGES.nazik.hello);
    expect(bubbleText('idle', 0, 0)).toBe(MESSAGES.komik.hello);
    expect(bubbleText('stage-up', 2, 1000, 'nazik')).toBe('Kaydedildi. Bitkin yapraklandı.');
    expect(bubbleText('stage-same', 1, 600, 'komik')).toBe(MESSAGES.komik.same[1]);
    expect(bubbleText('edited', 1, 600, 'nazik')).toBe(MESSAGES.nazik.edit);
    expect(bubbleText('idle', 4, 2000, 'komik')).toBe(MESSAGES.komik.up[4]);
  });
});

describe('messageRows', () => {
  const whens = (tone: 'komik' | 'nazik', min: number) => messageRows(tone, min).map((r) => r.when);

  it('seviye zamanları aralığa göre (varsayılan 2 saat)', () => {
    expect(whens('komik', 120).slice(0, 4)).toEqual(['1. seviye · son kayıttan 2 saat sonra', '2. seviye · 4 saat sonra', '3. seviye · 6 saat sonra', 'Son seviye · 8 saat ve sonrası']);
  });
  it('1 ve 3 saatlik aralık', () => {
    expect(whens('nazik', 60)[3]).toBe('Son seviye · 4 saat ve sonrası');
    expect(whens('nazik', 180)[1]).toBe('2. seviye · 6 saat sonra');
    expect(whens('nazik', 180)[3]).toBe('Son seviye · 12 saat ve sonrası');
  });
  it('kayıt sonrası, hedef ve düzeltme satırları eklenir', () => {
    const rows = messageRows('komik', 120);
    expect(rows).toHaveLength(7);
    expect(rows[5]!.main).toBe('Bugünün çiçeği açtı! Görev tamam 🌸');
  });
});

describe('parseGlassAmount', () => {
  it('50–2.000 ml', () => {
    expect(parseGlassAmount('400')).toEqual({ ok: true, value: 400 });
    expect(parseGlassAmount('50').ok).toBe(true);
    expect(parseGlassAmount('2000').ok).toBe(true);
  });
  it.each(['49', '2001', '-5', '2.5', 'abc'])('%j reddedilir', (t) => expect(parseGlassAmount(t).ok).toBe(false));
  it('boş için ayrı mesaj', () => expect(parseGlassAmount('  ')).toEqual({ ok: false, message: 'Önce bir miktar gir.' }));
});
