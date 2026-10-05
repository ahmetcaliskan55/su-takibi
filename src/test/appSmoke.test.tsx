import path from 'node:path';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

// Gerçek expo-sqlite yerine aynı migration/SQL'i çalıştıran bellek içi veritabanı.
jest.mock('@/db/appDatabase', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- jest.mock fabrikası import kullanamaz */
  const { createTestDb } = require('@/test/sqliteTestDb');
  const { runMigrations } = require('@/db/migrations');
  const test = createTestDb();
  return {
    getAppDatabase: async () => {
      await runMigrations(test.db);
      return test.db;
    },
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
});
