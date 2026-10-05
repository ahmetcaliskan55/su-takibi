import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { HomeContent } from './HomeContent';
import type { DaySummary } from '@/db/waterRepository';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date(2026, 9, 2, 16, 30);

const day = (totalMl: number, logs: DaySummary['logs'] = [], goalMl = 2000): DaySummary => ({
  localDate: '2026-10-02',
  goalMl,
  totalMl,
  logs,
});

function render(d: DaySummary, props: Partial<Parameters<typeof HomeContent>[0]> = {}) {
  const onQuickAdd = jest.fn();
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <HomeContent day={d} now={NOW} saving={false} actionError={null} onOpenAdd={jest.fn()} onOpenRecords={jest.fn()} onOpenProfile={jest.fn()} bubbleEvent="idle" onQuickAdd={onQuickAdd} {...props} />,
    );
  });
  return { root: renderer.root, onQuickAdd };
}

const texts = (root: ReactTestInstance): string[] =>
  root
    .findAll((n) => (n.type as unknown) === 'Text')
    .map((n) => n.children.filter((c): c is string => typeof c === 'string').join(''))
    .filter(Boolean);

describe('HomeContent', () => {
  it('kayıt yokken tohum, karşılama, kalan ve boş son kayıt metnini gösterir', () => {
    const { root } = render(day(0));
    const t = texts(root);
    expect(t).toEqual(expect.arrayContaining(['2 Ekim Cuma', 'Bugünün saksısı', '%0', '0', '/ 2.000 ml', 'Kalan 2.000 ml', 'Bugün henüz kayıt yok']));
    expect(t.join(' ')).toContain('Filize 500 ml kaldı');
    expect(t.join(' ')).toContain('Merhaba! Ben bugünün tohumuyum');
  });

  it('kısmi ilerlemede toplamı, yüzdeyi, sonraki aşamayı ve son kaydı gösterir', () => {
    const { root } = render(day(750, [{ id: 2, localDate: '2026-10-02', minuteOfDay: 870, amountMl: 250, createdAt: 0 }]));
    const t = texts(root);
    expect(t).toEqual(expect.arrayContaining(['%38', '750', 'Kalan 1.250 ml', 'Son kayıt: 14.30 · 250 ml']));
    expect(t.join(' ')).toContain('Yaprağa 250 ml kaldı');
  });

  it('hedef tamamlanınca "Hedef tamam" ve çiçek mesajı; hedef üstü %100 kalır', () => {
    const { root } = render(day(2600));
    const t = texts(root);
    expect(t).toEqual(expect.arrayContaining(['%100', 'Hedef tamam', 'Bugünün çiçeği açtı']));
    expect(t).not.toContain('Kalan 0 ml');
  });

  it('üç hızlı düğme doğru miktarla çağrılır', () => {
    const { root, onQuickAdd } = render(day(0));
    for (const ml of [150, 250, 500]) {
      const btn = root.findByProps({ accessibilityLabel: `${ml} mililitre hemen ekle` });
      act(() => btn.props.onPress());
    }
    expect(onQuickAdd.mock.calls).toEqual([[150], [250], [500]]);
  });

  it('kayıt hatasını görünür bir uyarı olarak gösterir', () => {
    const { root } = render(day(0), { actionError: 'Kayıt eklenemedi. Biraz sonra tekrar dene.' });
    expect(root.findByProps({ accessibilityRole: 'alert' })).toBeTruthy();
  });

  it('"Su ekle" ve "Son kayıt" satırı ilgili panelleri açar', () => {
    const onOpenAdd = jest.fn();
    const onOpenRecords = jest.fn();
    const { root } = render(day(0), { onOpenAdd, onOpenRecords });
    act(() => root.findAll((n) => typeof n.props.onPress === 'function' && texts(n).includes('Su ekle'))[0]!.props.onPress());
    act(() => root.findByProps({ accessibilityLabel: 'Bugünkü kayıtları göster' }).props.onPress());
    expect(onOpenAdd).toHaveBeenCalledTimes(1);
    expect(onOpenRecords).toHaveBeenCalledTimes(1);
  });

  it('hedef alanı profil ekranını açar', () => {
    const onOpenProfile = jest.fn();
    const { root } = render(day(0), { onOpenProfile });
    act(() => root.findByProps({ accessibilityLabel: 'Günlük hedefi düzenle' }).props.onPress());
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0, 'Tohum'],
    [500, 'Filiz'],
    [1000, 'Yapraklı bitki'],
    [1500, 'Tomurcuk'],
    [2000, 'Çiçek açmış bitki'],
  ])('%i ml için bitki etiketi %s', (total, label) => {
    const { root } = render(day(total));
    expect(root.findByProps({ accessibilityLabel: label })).toBeTruthy();
  });
});
