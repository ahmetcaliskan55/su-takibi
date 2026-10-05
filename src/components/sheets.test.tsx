import { act, create, type ReactTestInstance } from 'react-test-renderer';
import type { DaySummary, WaterLog } from '@/db/waterRepository';
import { fredokaLacksGlyphs } from '@/theme/fonts';
import { AddWaterSheet } from './AddWaterSheet';
import { RecordsSheet } from './RecordsSheet';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const NOW = new Date(2026, 9, 2, 16, 30);
beforeAll(() => jest.useFakeTimers({ now: NOW }));
afterAll(() => jest.useRealTimers());

const texts = (root: ReactTestInstance) =>
  root
    .findAll((n) => (n.type as unknown) === 'Text')
    .map((n) => n.children.filter((c): c is string => typeof c === 'string').join(''));
const press = (el: ReactTestInstance) => act(() => el.props.onPress());
const byLabel = (root: ReactTestInstance, label: string) => root.findByProps({ accessibilityLabel: label });
const buttonWithText = (root: ReactTestInstance, text: string) =>
  root.findAll((n) => typeof n.props.onPress === 'function' && texts(n).includes(text))[0]!;

const log = (over: Partial<WaterLog> = {}): WaterLog => ({ id: 1, localDate: '2026-10-02', minuteOfDay: 990, amountMl: 250, createdAt: 0, ...over });

function renderAdd(props: Partial<Parameters<typeof AddWaterSheet>[0]> = {}) {
  const onSubmit = jest.fn().mockResolvedValue({ ok: true });
  const onClose = jest.fn();
  let r!: ReturnType<typeof create>;
  act(() => {
    r = create(<AddWaterSheet editing={null} now={NOW} saving={false} onSubmit={onSubmit} onClose={onClose} {...props} />);
  });
  return { root: r.root, onSubmit, onClose };
}

const type = (root: ReactTestInstance, label: string, value: string) => act(() => byLabel(root, label).props.onChangeText(value));
const submit = async (root: ReactTestInstance) => {
  await act(async () => void buttonWithText(root, 'Kaydet').props.onPress());
};

describe('AddWaterSheet', () => {
  it('yeni kayıtta 250 ml ve şu anki saatle açılır', () => {
    const { root } = renderAdd();
    expect(byLabel(root, 'Özel miktar, mililitre').props.value).toBe('250');
    expect(byLabel(root, 'İçme saati, saat ve dakika').props.value).toBe('16:30');
    expect(texts(root)).toContain('Su ekle');
  });

  it('boş miktar: hata gösterir, kaydetmez', async () => {
    const { root, onSubmit } = renderAdd();
    type(root, 'Özel miktar, mililitre', '');
    await submit(root);
    expect(texts(root)).toContain('Önce bir miktar gir.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['5000', '10 ile 2.000 ml arasında bir miktar gir.'],
    ['3900', '10 ile 2.000 ml arasında bir miktar gir.'],
    ['0', '10 ile 2.000 ml arasında bir miktar gir.'],
  ])('miktar %s reddedilir', async (value, message) => {
    const { root, onSubmit } = renderAdd();
    type(root, 'Özel miktar, mililitre', value);
    await submit(root);
    expect(texts(root)).toContain(message);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('negatif işareti ve ondalık ayırıcı girişte ayıklanır (yalnızca rakam kalır)', () => {
    const { root } = renderAdd();
    type(root, 'Özel miktar, mililitre', '-250');
    expect(byLabel(root, 'Özel miktar, mililitre').props.value).toBe('250');
    type(root, 'Özel miktar, mililitre', '25.5');
    expect(byLabel(root, 'Özel miktar, mililitre').props.value).toBe('255');
  });

  it.each([
    ['2500', 'Saati 16:30 biçiminde yaz.'],
    ['12', 'Saati 16:30 biçiminde yaz.'],
    ['1631', 'Gelecekteki bir saat girilemez.'],
    ['2359', 'Gelecekteki bir saat girilemez.'],
  ])('saat %s reddedilir', async (value, message) => {
    const { root, onSubmit } = renderAdd();
    type(root, 'İçme saati, saat ve dakika', value);
    await submit(root);
    expect(texts(root)).toContain(message);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('geçerli girişte doğru değerlerle gönderir; hata varsa temizlenir', async () => {
    const { root, onSubmit } = renderAdd();
    type(root, 'Özel miktar, mililitre', '');
    await submit(root);
    type(root, 'Özel miktar, mililitre', '300');
    expect(texts(root)).not.toContain('Önce bir miktar gir.');
    type(root, 'İçme saati, saat ve dakika', '1000');
    await submit(root);
    expect(onSubmit).toHaveBeenCalledWith({ amountMl: 300, minuteOfDay: 600 });
  });

  it('hazır miktar çipi alanı doldurur', () => {
    const { root } = renderAdd();
    press(buttonWithText(root, '500 ml'));
    expect(byLabel(root, 'Özel miktar, mililitre').props.value).toBe('500');
  });

  it('kayıt başarısızsa hata metnini gösterir', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ ok: false, message: 'Kaydedilemedi. Biraz sonra tekrar dene.' });
    const { root } = renderAdd({ onSubmit });
    await submit(root);
    expect(texts(root)).toContain('Kaydedilemedi. Biraz sonra tekrar dene.');
  });

  it('düzenleme modunda kayıt değerleri dolu gelir ve silme sunulur', () => {
    const onDelete = jest.fn();
    const { root } = renderAdd({ editing: log({ amountMl: 2000, minuteOfDay: 600 }), onDelete });
    expect(texts(root)).toContain('Kaydı düzenle');
    expect(byLabel(root, 'Özel miktar, mililitre').props.value).toBe('2000');
    expect(byLabel(root, 'İçme saati, saat ve dakika').props.value).toBe('10:00');
    press(buttonWithText(root, 'Bu kaydı sil'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('yeni kayıtta "Bu kaydı sil" yok', () => {
    expect(texts(renderAdd().root)).not.toContain('Bu kaydı sil');
  });

  it('kaydederken Kaydet düğmesi devre dışı', () => {
    const { root } = renderAdd({ saving: true });
    expect(buttonWithText(root, 'Kaydet').props.disabled).toBe(true);
  });
});

describe('RecordsSheet', () => {
  const day = (logs: WaterLog[]): DaySummary => ({
    localDate: '2026-10-02',
    goalMl: 2000,
    totalMl: logs.reduce((t, l) => t + l.amountMl, 0),
    logs,
  });
  function renderRecords(d: DaySummary) {
    const handlers = { onEdit: jest.fn(), onDelete: jest.fn(), onAdd: jest.fn(), onClose: jest.fn() };
    let r!: ReturnType<typeof create>;
    act(() => {
      r = create(<RecordsSheet day={d} saving={false} {...handlers} />);
    });
    return { root: r.root, ...handlers };
  }

  it('kayıtları saat, miktar ve toplamla listeler', () => {
    const { root } = renderRecords(day([log({ id: 2, minuteOfDay: 990, amountMl: 500 }), log({ id: 1, minuteOfDay: 510, amountMl: 250 })]));
    const t = texts(root);
    expect(t).toEqual(expect.arrayContaining(['Bugünkü kayıtlar', 'Toplam 750 ml · 2 kayıt', '16.30', '500 ml', '08.30', '250 ml']));
  });

  it('düzenle ve sil, doğru kayıtla çağrılır', () => {
    const l1 = log({ id: 1, minuteOfDay: 510 });
    const l2 = log({ id: 2, minuteOfDay: 990 });
    const { root, onEdit, onDelete } = renderRecords(day([l2, l1]));
    press(byLabel(root, '08.30 kaydını düzenle'));
    press(byLabel(root, '16.30 kaydını sil'));
    expect(onEdit).toHaveBeenCalledWith(l1);
    expect(onDelete).toHaveBeenCalledWith(l2);
  });

  it('büyük bir hatalı kaydı (2.000 ml) silme düğmesiyle silinebilir', () => {
    const big = log({ id: 9, minuteOfDay: 600, amountMl: 2000 });
    const { root, onDelete } = renderRecords(day([big]));
    press(byLabel(root, '10.00 kaydını sil'));
    expect(onDelete).toHaveBeenCalledWith(big);
  });

  it('kayıt yoksa boş durum ve "Su ekle" gösterir', () => {
    const { root, onAdd } = renderRecords(day([]));
    expect(texts(root)).toContain('Bugün henüz kayıt yok');
    press(buttonWithText(root, 'Su ekle'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe('fredokaLacksGlyphs', () => {
  it('ğ/ş/İ içeren metinleri yakalar, diğerlerini geçirir', () => {
    for (const s of ['Geçmiş', 'Ayarlar şimdi', 'Hedef değişti', 'İyi', 'Çiçek']) {
      expect(fredokaLacksGlyphs(s)).toBe(s !== 'Çiçek');
    }
    for (const s of ['Su ekle', 'Kaydı düzenle', 'Bugünkü kayıtlar', 'Bugünün saksısı', 'Bugün henüz kayıt yok', 'Kaydet']) {
      expect(fredokaLacksGlyphs(s)).toBe(false);
    }
  });
});
