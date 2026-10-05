import { nextStage, plantStage, progressPercent, remainingMl } from './plant';

describe('plantStage', () => {
  const goal = 2000;

  it.each([
    [0, 0],
    [1, 0],
    [499, 0],
    [500, 1],
    [999, 1],
    [1000, 2],
    [1499, 2],
    [1500, 3],
    [1999, 3],
    [2000, 4],
  ])('hedef 2000 ml iken %i ml → aşama %i', (total, stage) => {
    expect(plantStage(total, goal)).toBe(stage);
  });

  it('hedefin üzerindeki miktar ek aşama vermez ve bitki ölmez', () => {
    expect(plantStage(2001, goal)).toBe(4);
    expect(plantStage(goal * 10, goal)).toBe(4);
  });

  it('%25 sınırı tam sayı hesabıyla belirlenir: yuvarlanmış yüzde aşamayı etkilemez', () => {
    // 499/2000 = %24,95 → yüzde 25'e yuvarlanır ama aşama hâlâ tohum
    expect(progressPercent(499, goal)).toBe(25);
    expect(plantStage(499, goal)).toBe(0);
  });

  it("hedef 4'e tam bölünmüyorsa eşik kesirli ml olarak ele alınır", () => {
    // hedef 2001: %25 = 500,25 ml → 500 ml tohum, 501 ml filiz
    expect(plantStage(500, 2001)).toBe(0);
    expect(plantStage(501, 2001)).toBe(1);
    // %100 = 2001 ml
    expect(plantStage(2000, 2001)).toBe(3);
    expect(plantStage(2001, 2001)).toBe(4);
  });

  it('geçersiz girdilerde güvenli şekilde tohum döner', () => {
    expect(plantStage(500, 0)).toBe(0);
    expect(plantStage(500, -100)).toBe(0);
    expect(plantStage(-50, goal)).toBe(0);
    expect(plantStage(Number.NaN, goal)).toBe(0);
    expect(plantStage(500, Number.NaN)).toBe(0);
  });

  it('hedef değişince aynı toplam farklı aşamaya düşer', () => {
    expect(plantStage(1000, 2000)).toBe(2);
    expect(plantStage(1000, 4000)).toBe(1);
    expect(plantStage(1000, 1000)).toBe(4);
  });
});

describe('progressPercent / remainingMl', () => {
  it('yüzde 0..100 arasında kalır', () => {
    expect(progressPercent(0, 2000)).toBe(0);
    expect(progressPercent(1000, 2000)).toBe(50);
    expect(progressPercent(3000, 2000)).toBe(100);
    expect(progressPercent(100, 0)).toBe(0);
  });

  it('kalan miktar negatif olmaz', () => {
    expect(remainingMl(750, 2000)).toBe(1250);
    expect(remainingMl(2000, 2000)).toBe(0);
    expect(remainingMl(2600, 2000)).toBe(0);
  });
});

describe('nextStage', () => {
  it('bir sonraki aşamaya kalan ml ve adı', () => {
    expect(nextStage(0, 2000)).toEqual({ name: 'Filiz', mlLeft: 500 });
    expect(nextStage(750, 2000)).toEqual({ name: 'Yapraklı', mlLeft: 250 });
    expect(nextStage(1999, 2000)).toEqual({ name: 'Çiçek', mlLeft: 1 });
  });

  it('çiçek açtıysa null döner', () => {
    expect(nextStage(2000, 2000)).toBeNull();
    expect(nextStage(5000, 2000)).toBeNull();
  });

  it('kesirli eşiği yukarı yuvarlar ve hiç 0 ml döndürmez', () => {
    // hedef 2001, filiz eşiği 500,25 → 501 ml
    expect(nextStage(0, 2001)).toEqual({ name: 'Filiz', mlLeft: 501 });
    expect(nextStage(500, 2001)?.mlLeft).toBe(1);
  });
});
