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
    expect(await screen.findByText('Geçmiş sonraki aşamada geliyor')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Ayarlar' }));
    expect(await screen.findByText('Ayarlar sonraki aşamalarda geliyor')).toBeTruthy();

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
});

