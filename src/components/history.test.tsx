import { act, create, type ReactTestInstance } from 'react-test-renderer';
import type { DaySummary } from '@/db/waterRepository';
import { buildCalendarPage, computeStats, lastNDays, type DayTotal } from '@/domain/history';
import { DaySheet } from './DaySheet';
import { HistoryCalendar } from './HistoryCalendar';
import { HistoryStats } from './HistoryStats';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const texts = (root: ReactTestInstance) =>
  root.findAll((n) => (n.type as unknown) === 'Text').map((n) => n.children.filter((c): c is string => typeof c === 'string').join(''));
const btn = (root: ReactTestInstance, text: string) => root.findAll((n) => typeof n.props.onPress === 'function' && texts(n).includes(text))[0]!;
function mount(el: React.ReactElement) {
  let r!: ReturnType<typeof create>;
  act(() => {
    r = create(el);
  });
  return r.root;
}

const TODAY = '2026-10-02';
const ROWS: DayTotal[] = [
  { localDate: '2026-09-30', goalMl: 2000, totalMl: 2000 }, // tamam
  { localDate: '2026-10-01', goalMl: 3000, totalMl: 1000 }, // kısmi, farklı hedef: %33
  { localDate: '2026-09-29', goalMl: 2000, totalMl: 0 }, // 0 ml
  { localDate: TODAY, goalMl: 2000, totalMl: 4000 }, // hedef üstü
];

describe('HistoryCalendar', () => {
  const props = (over = {}) => ({
    page: buildCalendarPage(TODAY, 0),
    rows: new Map(ROWS.map((r) => [r.localDate, r])),
    canPrev: true,
    canNext: false,
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onSelect: jest.fn(),
    ...over,
  });

  it('günleri durumları, bitkileri ve kendi hedefleriyle özetler', () => {
    const root = mount(<HistoryCalendar {...props()} />);
    const label = (re: RegExp) => root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel))[0]!.props.accessibilityLabel;
    expect(label(/^30,/)).toBe('30, çiçek, yüzde 100, hedef tamam');
    expect(label(/^1 Eki/)).toBe('1 Eki, filiz, yüzde 33, kısmi'); // 1000 / 3000 → o günün hedefiyle
    expect(label(/^29,/)).toBe('29, tohum, yüzde 0, kayıt yok');
    expect(label(/\(bugün\)/)).toBe('2 (bugün), çiçek, yüzde 100, hedef tamam');
    expect(texts(root)).toEqual(expect.arrayContaining(['31 Ağu – 4 Eki', 'Hedef tamam', 'Kısmi', 'Kayıt yok (0 ml)', 'Veri yok']));
  });

  it('yalnızca verisi olan gün seçilebilir; veri olmayan ve gelecek günler tıklanmaz', () => {
    const onSelect = jest.fn();
    const root = mount(<HistoryCalendar {...props({ onSelect })} />);
    act(() => root.findByProps({ accessibilityLabel: '1 Eki, filiz, yüzde 33, kısmi' }).props.onPress());
    expect(onSelect).toHaveBeenCalledWith('2026-10-01');
    const noData = root.findByProps({ accessibilityLabel: '28, veri yok' });
    expect(noData.props.onPress).toBeUndefined();
    // takvimde Pressable olan hücre sayısı = verisi olan gün sayısı
    const pressableCells = root.findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityRole === 'button' && /yüzde/.test(n.props.accessibilityLabel));
    expect(pressableCells).toHaveLength(4);
  });

  it('önceki/sonraki düğmeleri duruma göre devre dışı', () => {
    const onPrev = jest.fn();
    const root = mount(<HistoryCalendar {...props({ onPrev, canPrev: false, canNext: false })} />);
    expect(root.findByProps({ accessibilityLabel: 'Önceki haftalar' }).props.disabled).toBe(true);
    expect(root.findByProps({ accessibilityLabel: 'Sonraki haftalar' }).props.disabled).toBe(true);
    const root2 = mount(<HistoryCalendar {...props({ onPrev, canPrev: true, canNext: true })} />);
    expect(root2.findByProps({ accessibilityLabel: 'Önceki haftalar' }).props.disabled).toBe(false);
  });
});

describe('HistoryStats', () => {
  const stats = () => computeStats(lastNDays(TODAY, 7), ROWS, TODAY);

  it('ortalama, hedef tamam sayısı ve gün sayımlarını gösterir', () => {
    const root = mount(<HistoryStats range={7} onRange={jest.fn()} stats={stats()} caption="26 Eylül – 2 Ekim" />);
    const t = texts(root);
    expect(t).toEqual(expect.arrayContaining(['Günlük ortalama', `${(2000 + 1000 + 0 + 4000) / 4 >= 1000 ? '1.750' : ''} ml`, '2 / 7 gün', '26 Eylül – 2 Ekim']));
    expect(t).toEqual(expect.arrayContaining(['Hedef tamam · 2 gün', 'Kısmi · 1 gün', '0 ml · 1 gün', 'Veri yok · 3 gün']));
  });

  it('hiç veri yokken "Veri yok" ve 0 / N gün', () => {
    const root = mount(<HistoryStats range={7} onRange={jest.fn()} stats={computeStats(lastNDays(TODAY, 7), [], TODAY)} caption="x" />);
    expect(texts(root)).toEqual(expect.arrayContaining(['Veri yok', '0 / 7 gün', 'Veri yok · 7 gün']));
  });

  it('30 gün seçilebilir ve özet erişilebilirlik metnini içerir', () => {
    const onRange = jest.fn();
    const root = mount(<HistoryStats range={7} onRange={onRange} stats={stats()} caption="x" />);
    act(() => btn(root, 'Son 30 gün').props.onPress());
    expect(onRange).toHaveBeenCalledWith(30);
    expect(root.findByProps({ accessibilityLabel: 'Son 7 günün günlük su tüketimi. Hedef tamamlanan 2, kısmi 1, sıfır 1, veri olmayan 3 gün.' })).toBeTruthy();
  });
});

describe('DaySheet', () => {
  const day = (over: Partial<DaySummary> = {}): DaySummary => ({
    localDate: '2026-10-01',
    goalMl: 3000,
    totalMl: 1000,
    logs: [
      { id: 2, localDate: '2026-10-01', minuteOfDay: 900, amountMl: 500, createdAt: 0 },
      { id: 1, localDate: '2026-10-01', minuteOfDay: 510, amountMl: 500, createdAt: 0 },
    ],
    ...over,
  });

  it('geçmiş günü kendi hedefiyle, kayıtları saat sırasıyla ve düzenleme olmadan gösterir', () => {
    const root = mount(<DaySheet day={day()} isToday={false} onClose={jest.fn()} onEditToday={jest.fn()} />);
    const t = texts(root);
    expect(t).toEqual(expect.arrayContaining(['1 Ekim Perşembe', 'Filiz aşaması', '/ 3.000 ml hedef', 'Kısmi · %33', '2 kayıt']));
    const times = t.filter((x) => /^\d\d\.\d\d$/.test(x));
    expect(times).toEqual(['08.30', '15.00']);
    expect(t).not.toContain('Bugünün kayıtlarını düzenle');
  });

  it('hedef üstü, kayıtsız ve bugün durumları', () => {
    const over = mount(<DaySheet day={day({ goalMl: 2000, totalMl: 4000 })} isToday onClose={jest.fn()} onEditToday={jest.fn()} />);
    expect(texts(over)).toEqual(expect.arrayContaining(['Hedef tamam', 'Hedefin üzerindeki kayıtlar bitkiyi daha fazla büyütmez.', 'Bugünün kayıtlarını düzenle']));
    const empty = mount(<DaySheet day={day({ totalMl: 0, logs: [] })} isToday={false} onClose={jest.fn()} onEditToday={jest.fn()} />);
    expect(texts(empty)).toEqual(expect.arrayContaining(['Kayıt yok · %0', 'Bu gün için su kaydı yok. Bitki tohum olarak kaldı.']));
  });

  it('bugünse düzenleme düğmesi çağrılır', () => {
    const onEditToday = jest.fn();
    const root = mount(<DaySheet day={day()} isToday onClose={jest.fn()} onEditToday={onEditToday} />);
    act(() => btn(root, 'Bugünün kayıtlarını düzenle').props.onPress());
    expect(onEditToday).toHaveBeenCalledTimes(1);
  });
});
