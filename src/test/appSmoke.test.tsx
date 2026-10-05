import path from 'node:path';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { expoDriver } from '@/notifications/expoDriver';
import type { FakeDriver } from '@/test/fakeDriver';

// Gerçek bildirimler yerine bellek içi sürücü: çağrılar ve planlananlar denetlenir.
jest.mock('@/notifications/expoDriver', () => {
  const { createFakeDriver } = require('@/test/fakeDriver'); // eslint-disable-line @typescript-eslint/no-require-imports
  return { expoDriver: createFakeDriver({ state: 'undetermined', canAskAgain: true }), CHANNEL_ID: 'test' };
});
const driver = expoDriver as unknown as FakeDriver;

// Gerçek expo-sqlite yerine aynı migration/SQL'i çalıştıran bellek içi veritabanı.
jest.mock('@/db/appDatabase', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- jest.mock fabrikası import kullanamaz */
  const { createTestDb } = require('@/test/sqliteTestDb');
  const { runMigrations } = require('@/db/migrations');
  let opened: Promise<unknown> | null = null;
  return {
    getAppDatabase: () =>
      (opened ??= createTestDb().then(async (t: { db: unknown }) => {
        await runMigrations(t.db);
        return t.db;
      })),
  };
});

describe('uygulama duman testi (rota + sağlayıcılar + veritabanı)', () => {
  it('Bugün açılır, hızlı ekleme çalışır, çift dokunma tek kayıt üretir, sekmeler gezilir', async () => {
    renderRouter(path.resolve(__dirname, '../app'));

    // İlk açılış: ilk kurulum (bildirim izni istenmez), hedef değişmeden bitirilir; bardak 330 ml seçilir.
    expect(await screen.findByText('Her güne bir tohum')).toBeTruthy();
    fireEvent.press(screen.getByText('Başlayalım'));
    fireEvent.changeText(await screen.findByLabelText('Yaş'), '200');
    fireEvent.press(screen.getByText('Devam'));
    expect(await screen.findByText('Yaşı 1–120 arasında, rakamla gir.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Yaş'), '');
    fireEvent.press(screen.getByText('Devam')); // boş bırakmak serbest
    expect(await screen.findByText('Günlük hedefin')).toBeTruthy();
    fireEvent.press(screen.getByText('330'));
    fireEvent.press(screen.getByText('Devam'));
    fireEvent.changeText(await screen.findByLabelText('Uyuma saati'), '0800');
    fireEvent.press(screen.getByText('Bildirimlere izin ver'));
    expect(await screen.findByText('Uyanma ve uyuma saati aynı olamaz.')).toBeTruthy();
    expect(driver.calls).not.toContain('request'); // hata varken kurulum da izin isteği de yok
    fireEvent.changeText(screen.getByLabelText('Uyuma saati'), '0100'); // gece yarısını aşan aralık geçerli
    fireEvent.press(screen.getByText('Bildirimlere izin ver'));

    expect(await screen.findByText('Bugünün saksısı')).toBeTruthy();
    // izin istendi, verildi ve hatırlatmalar planlandı (yinelenen kimlik yok)
    expect(driver.calls).toContain('request');
    await waitFor(() => expect(driver.scheduled.length).toBeGreaterThan(0));
    expect(new Set(driver.scheduled.map((p) => p.id)).size).toBe(driver.scheduled.length);
    expect(driver.scheduled.every((p) => !(p.fireAt.getHours() >= 1 && p.fireAt.getHours() < 8))).toBe(true); // 08:00–01:00 dışında sessiz
    expect(screen.getByText('Bugün henüz kayıt yok')).toBeTruthy();
    expect(screen.getByText('Kalan 2.000 ml')).toBeTruthy();

    const quick250 = screen.getByLabelText('250 mililitre hemen ekle');
    fireEvent.press(quick250);
    fireEvent.press(quick250); // istemsiz çift dokunma
    await waitFor(() => expect(screen.getByText('Kalan 1.750 ml')).toBeTruthy());
    expect(screen.queryByText('Kalan 1.500 ml')).toBeNull();
    expect(screen.getByText(/^Son kayıt: \d\d\.\d\d · 250 ml$/)).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Geçmiş' }));
    expect(await screen.findByText('Önceki günlerin bitkileri')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Ayarlar' }));
    expect(await screen.findByText('Uygulama tercihlerin')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Bugün' }));
    expect(await screen.findByText('Bugünün saksısı')).toBeTruthy();
    expect(screen.getByText('Kalan 1.750 ml')).toBeTruthy();
  });

  // Not: Aynı bellek içi veritabanını paylaşır; önceki testten kalan 250 ml'lik kayıttan devam eder.
  it('Su ekle paneli doğrular, kaydeder; kayıt listesinden silinir ve "Geri al" ile geri gelir', async () => {
    renderRouter(path.resolve(__dirname, '../app'));
    expect(await screen.findByText('Kalan 1.750 ml')).toBeTruthy();

    fireEvent.press(screen.getByText('Su ekle'));
    const amount = await screen.findByLabelText('Özel miktar, mililitre');
    expect(amount.props.value).toBe('330'); // ilk kurulumda seçilen bardak miktarı hazır gelir
    const time = screen.getByLabelText('İçme saati, saat ve dakika');

    fireEvent.changeText(amount, '');
    fireEvent.press(screen.getByText('Kaydet'));
    expect(await screen.findByText('Önce bir miktar gir.')).toBeTruthy();

    fireEvent.changeText(amount, '5000');
    fireEvent.press(screen.getByText('Kaydet'));
    expect(await screen.findByText('10 ile 2.000 ml arasında bir miktar gir.')).toBeTruthy();

    fireEvent.changeText(amount, '300');
    fireEvent.changeText(time, '2500');
    fireEvent.press(screen.getByText('Kaydet'));
    expect(await screen.findByText('Saati 16:30 biçiminde yaz.')).toBeTruthy();

    fireEvent.changeText(time, '0000');
    fireEvent.press(screen.getByText('Kaydet'));
    expect(await screen.findByText('Kalan 1.450 ml')).toBeTruthy();
    expect(screen.getByText('300 ml eklendi')).toBeTruthy();
    expect(screen.queryByLabelText('Özel miktar, mililitre')).toBeNull(); // panel kapandı

    fireEvent.press(screen.getByLabelText('Bugünkü kayıtları göster'));
    expect(await screen.findByText('Toplam 550 ml · 2 kayıt')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('00.00 kaydını sil'));
    expect(await screen.findByText('Toplam 250 ml · 1 kayıt')).toBeTruthy();
    expect(screen.getByText('Kayıt silindi')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Kayıt silindi. Geri al'));
    expect(await screen.findByText('Toplam 550 ml · 2 kayıt')).toBeTruthy();
    expect(screen.queryByText('Kayıt silindi')).toBeNull();
  });

  it('hedef değişince bugünün hedefi güncellenir; profil geçersiz yaşı kaydetmez', async () => {
    renderRouter(path.resolve(__dirname, '../app'));
    expect(await screen.findByText('Kalan 1.450 ml')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Günlük hedefi düzenle'));
    expect(await screen.findByText('Hedef ve profil')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Hedefi 100 ml artır'));
    expect(await screen.findByLabelText('Günlük hedef 2.100 mililitre')).toBeTruthy();

    const age = screen.getByLabelText('Yaş');
    fireEvent.changeText(age, '150');
    fireEvent(age, 'endEditing');
    expect(await screen.findByText('Yaşı 1–120 arasında, rakamla gir.')).toBeTruthy();
    fireEvent.changeText(age, '22');
    fireEvent(age, 'endEditing');
    await waitFor(() => expect(screen.queryByText('Yaşı 1–120 arasında, rakamla gir.')).toBeNull());

    fireEvent.press(screen.getByLabelText('Geri'));
    expect(await screen.findByText('Kalan 1.550 ml')).toBeTruthy();
  });

  it('Geçmiş: takvimde bugün görünür, gün ayrıntısı salt okunur açılır; istatistik özetlenir', async () => {
    renderRouter(path.resolve(__dirname, '../app'));
    expect(await screen.findByText('Kalan 1.550 ml')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Geçmiş' }));
    // bugün: 550 ml / 2.100 ml → %26, filiz, kısmi
    const cell = await screen.findByLabelText(/\(bugün\), filiz, yüzde 26, kısmi/);
    fireEvent.press(cell);
    expect(await screen.findByText('Kısmi · %26')).toBeTruthy();
    expect(screen.getByText('/ 2.100 ml hedef')).toBeTruthy();
    expect(screen.getByText('2 kayıt')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Kapat'));

    fireEvent.press(screen.getByText('İstatistik'));
    expect(await screen.findByText('550 ml')).toBeTruthy(); // günlük ortalama (yalnızca bugün verisi var)
    expect(screen.getByText('0 / 7 gün')).toBeTruthy();
    expect(screen.getByText('Veri yok · 6 gün')).toBeTruthy();
    fireEvent.press(screen.getByText('Son 30 gün'));
    expect(await screen.findByText('Veri yok · 29 gün')).toBeTruthy();
  });

  it('Ayarlar: hatırlatma tercihleri, mesaj tarzı ve bardak miktarı kaydedilir', async () => {
    renderRouter(path.resolve(__dirname, '../app'));
    expect(await screen.findByText('Kalan 1.550 ml')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarlar' }));
    expect(await screen.findByText('Uygulama tercihlerin')).toBeTruthy();

    // ilk kurulumda seçilen değerler: 08:00 – 01:00 (gece yarısını aşan)
    expect(screen.getByText(/Hatırlatmalar 08\.00 – 01\.00 arasında gelir \(gece yarısını aşar\)\. 01\.00 – 08\.00 arasında bildirim gelmez\./)).toBeTruthy();
    expect(screen.getByText('330 ml')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Hatırlatmalar'));
    expect(await screen.findByText('Hatırlatmalar kapalı. Su kayıtların ve bitkin bundan etkilenmez.')).toBeTruthy();
    await waitFor(() => expect(driver.scheduled).toEqual([])); // kapatınca planlı bildirimler iptal edilir
    fireEvent.press(screen.getByLabelText('Hatırlatmalar'));
    await waitFor(() => expect(driver.scheduled.length).toBeGreaterThan(0)); // açınca yeniden planlanır
    fireEvent.press(await screen.findByText('3 saat'));

    const sleep = screen.getByLabelText('Uyuma saati');
    const wake = screen.getByLabelText('Uyanma saati');
    fireEvent.changeText(sleep, '2500');
    expect(await screen.findByText('Saati 16:30 biçiminde yaz.')).toBeTruthy();
    fireEvent.changeText(sleep, '0800'); // uyanma ile aynı
    expect(await screen.findByText('Uyanma ve uyuma saati aynı olamaz.')).toBeTruthy();
    // geçerli saate düzeltilince eski hata silinir ve not hemen güncellenir (alandan çıkmadan, "Bitti" tuşu olmadan)
    fireEvent.changeText(sleep, '2200');
    expect(await screen.findByText(/Hatırlatmalar 08\.00 – 22\.00 arasında gelir\. 22\.00 – 08\.00 arasında bildirim gelmez\./)).toBeTruthy();
    expect(screen.queryByText('Uyanma ve uyuma saati aynı olamaz.')).toBeNull();
    expect(screen.queryByText(/01\.00 – 08\.00/)).toBeNull();
    fireEvent.changeText(sleep, '2300');
    expect(await screen.findByText(/08\.00 – 23\.00 arasında gelir\. 23\.00 – 08\.00 arasında bildirim gelmez\./)).toBeTruthy();
    fireEvent.changeText(sleep, '0100');
    expect(await screen.findByText(/08\.00 – 01\.00 arasında gelir \(gece yarısını aşar\)\. 01\.00 – 08\.00 arasında bildirim gelmez\./)).toBeTruthy();
    fireEvent.changeText(wake, '0900');
    expect(await screen.findByText(/09\.00 – 01\.00 arasında gelir/)).toBeTruthy();
    fireEvent.changeText(wake, '0800');
    fireEvent.changeText(sleep, '2300');
    expect(await screen.findByText(/08\.00 – 23\.00 arasında gelir/)).toBeTruthy();

    // aralık (3 saat) uyanık süreden uzunsa hiç hatırlatma gelmez: kullanıcı uyarılır
    expect(screen.queryByText('Bu saatlerde hiç hatırlatma gelmez')).toBeNull();
    fireEvent.changeText(wake, '0002');
    fireEvent.changeText(sleep, '0258');
    expect(await screen.findByText('Bu saatlerde hiç hatırlatma gelmez')).toBeTruthy();
    fireEvent.changeText(sleep, '0900');
    await waitFor(() => expect(screen.queryByText('Bu saatlerde hiç hatırlatma gelmez')).toBeNull());
    fireEvent.changeText(wake, '0800');
    fireEvent.changeText(sleep, '2300');
    expect(await screen.findByText(/08\.00 – 23\.00 arasında gelir/)).toBeTruthy();

    // tanılama: gerçekten planlı sayı + test bildirimi
    expect(await screen.findByText(/Planlı hatırlatma: \d+/)).toBeTruthy();
    fireEvent.press(screen.getByText('Test bildirimi gönder'));
    await waitFor(() => expect(driver.calls).toContain('test'));
    expect(await screen.findByText(/Test bildirimi 5 saniye içinde gelecek/)).toBeTruthy();

    fireEvent.press(screen.getByText('Nazik'));
    expect(await screen.findByText('Sakin ve kısa hatırlatmalar; ton hep aynı kalır.')).toBeTruthy();
    fireEvent.press(screen.getByText('Mesaj örneklerini gör'));
    expect(await screen.findByText('Seçili tarz: Nazik')).toBeTruthy();
    expect(screen.getByText('1. seviye · son kayıttan 3 saat sonra')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Kapat'));

    fireEvent.press(screen.getByText('Bardak / şişe miktarı'));
    expect(await screen.findByText('Şu an seçili')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/400/)).toBeNull(); // karışıklık yaratan örnek yazı yok
    const custom = await screen.findByLabelText('Özel miktar (ml)');
    fireEvent.changeText(custom, '10');
    fireEvent.press(screen.getByText('Uygula'));
    expect(await screen.findByText('Miktarı 50 ile 2.000 ml arasında rakamla gir.')).toBeTruthy();
    fireEvent.changeText(custom, '400');
    fireEvent.press(screen.getByText('Uygula'));
    expect(await screen.findByText('400 ml')).toBeTruthy();

    // tercihler kalıcı: sekmeler arasında gezince korunur ve Bugün'deki balon yeni tarza geçer
    fireEvent.press(screen.getByRole('tab', { name: 'Bugün' }));
    expect(await screen.findByText('Bugünün saksısı')).toBeTruthy();
    expect(screen.getByText(/Kaydedildi\.|Hoş geldin\./)).toBeTruthy();
  });

  it('Bildirim izni: reddedilmişse uyarı ve ayar bağlantısı, hiçbir şey planlanmaz; sorulmamışsa açarken izin istenir', async () => {
    driver.setPermission({ state: 'denied', canAskAgain: false });
    driver.calls.length = 0;
    const first = renderRouter(path.resolve(__dirname, '../app'));
    expect(await screen.findByText('Bugünün saksısı')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarlar' }));
    expect(await screen.findByText('Bildirim izni kapalı')).toBeTruthy();
    await waitFor(() => expect(driver.scheduled).toEqual([])); // izinsiz: uygulama çalışır, bildirim yok
    fireEvent.press(screen.getByText('Telefon ayarlarını aç'));
    await waitFor(() => expect(driver.calls).toContain('settings'));

    // izin henüz sorulmamış: hatırlatmayı kapatıp açmak izin penceresini açar
    first.unmount();
    driver.setPermission({ state: 'undetermined', canAskAgain: true });
    renderRouter(path.resolve(__dirname, '../app'));
    expect(await screen.findByText('Bugünün saksısı')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarlar' }));
    fireEvent.press(await screen.findByLabelText('Hatırlatmalar'));
    expect(await screen.findByText('Hatırlatmalar kapalı. Su kayıtların ve bitkin bundan etkilenmez.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Hatırlatmalar'));
    await waitFor(() => expect(driver.calls).toContain('request'));
    await waitFor(() => expect(driver.scheduled.length).toBeGreaterThan(0));
  });

  it('Tüm verilerimi sil: onay penceresi, vazgeçince veri durur; onaylayınca veriler silinir, bildirimler iptal edilir, ilk kuruluma dönülür', async () => {
    driver.setPermission({ state: 'granted', canAskAgain: true });
    renderRouter(path.resolve(__dirname, '../app'));
    expect(await screen.findByText('Bugünün saksısı')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Ayarlar' }));
    fireEvent.press(await screen.findByText('Tüm verilerimi sil'));
    expect(await screen.findByText('Tüm veriler silinsin mi?')).toBeTruthy();

    fireEvent.press(screen.getByText('Vazgeç'));
    await waitFor(() => expect(screen.queryByText('Tüm veriler silinsin mi?')).toBeNull());
    fireEvent.press(screen.getByRole('tab', { name: 'Bugün' }));
    expect(await screen.findByText(/Kalan 1\.5\d\d ml/)).toBeTruthy(); // vazgeçildi: kayıtlar yerinde

    fireEvent.press(screen.getByRole('tab', { name: 'Ayarlar' }));
    fireEvent.press(await screen.findByText('Tüm verilerimi sil'));
    fireEvent.press(await screen.findByText('Evet, hepsini sil'));
    expect(await screen.findByText('Her güne bir tohum')).toBeTruthy(); // ilk kurulum yeniden
    expect(driver.scheduled).toEqual([]); // planlı bildirimler iptal edildi

    // yeniden kurulum: kayıtlar gerçekten silinmiş, hedef varsayılan
    fireEvent.press(screen.getByText('Başlayalım'));
    fireEvent.press(await screen.findByText('Devam'));
    fireEvent.press(await screen.findByText('Devam'));
    fireEvent.press(await screen.findByText('Şimdi değil'));
    expect(await screen.findByText('Bugün henüz kayıt yok')).toBeTruthy();
    expect(screen.getByText('Kalan 2.000 ml')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Geçmiş' }));
    fireEvent.press(await screen.findByText('İstatistik'));
    expect(await screen.findByText('Veri yok · 6 gün')).toBeTruthy(); // geçmiş de temiz: yalnızca bugünün satırı var
  });
});

