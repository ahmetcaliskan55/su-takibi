import { createTapGuard } from './tapGuard';

describe('createTapGuard', () => {
  function setup(cooldown = 800) {
    let t = 1_000;
    const guard = createTapGuard(cooldown, () => t);
    return { guard, advance: (ms: number) => (t += ms) };
  }

  it('ilk dokunuşu kabul eder', () => {
    const { guard } = setup();
    expect(guard.tryEnter('250')).toBe(true);
  });

  it('işlem sürerken gelen ikinci dokunuşu (aynı ya da farklı miktar) reddeder', () => {
    const { guard, advance } = setup();
    expect(guard.tryEnter('250')).toBe(true);
    advance(10);
    expect(guard.tryEnter('250')).toBe(false);
    expect(guard.tryEnter('500')).toBe(false);
  });

  it('işlem bittikten sonra aynı miktarın hemen tekrarı (çift dokunma) reddedilir', () => {
    const { guard, advance } = setup();
    expect(guard.tryEnter('250')).toBe(true);
    guard.release();
    advance(120);
    expect(guard.tryEnter('250')).toBe(false);
  });

  it('işlem bittikten sonra farklı miktar engellenmez', () => {
    const { guard, advance } = setup();
    expect(guard.tryEnter('250')).toBe(true);
    guard.release();
    advance(120);
    expect(guard.tryEnter('500')).toBe(true);
  });

  it('bekleme süresi dolunca aynı miktar bilinçli olarak yeniden eklenebilir', () => {
    const { guard, advance } = setup(800);
    expect(guard.tryEnter('250')).toBe(true);
    guard.release();
    advance(799);
    expect(guard.tryEnter('250')).toBe(false);
    advance(1);
    expect(guard.tryEnter('250')).toBe(true);
  });

  it('reddedilen dokunuş bekleme süresini uzatmaz', () => {
    const { guard, advance } = setup(800);
    expect(guard.tryEnter('250')).toBe(true);
    guard.release();
    advance(500);
    expect(guard.tryEnter('250')).toBe(false);
    advance(300);
    expect(guard.tryEnter('250')).toBe(true);
  });
});
