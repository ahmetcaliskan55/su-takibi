import path from 'node:path';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

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
    fireEvent.press(screen.getByText('Başla'));
    expect(await screen.findByText('Uyanma ve uyuma saati aynı olamaz.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Uyuma saati'), '0100'); // gece yarısını aşan aralık geçerli
    fireEvent.press(screen.getByText('Başla'));

    expect(await screen.findByText('Bugünün saksısı')).toBeTruthy();
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
    expect(await screen.findByText('Diğer ayarlar sonraki aşamalarda geliyor')).toBeTruthy();

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
});

