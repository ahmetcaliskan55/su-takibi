/**
 * İstemsiz yinelenen kaydı önleyen koruma (çift dokunma, titrek dokunma, yavaş yazma anında tekrar basma).
 *
 * İki kural birlikte uygulanır:
 *  1. Bir işlem sürerken başka hiçbir ekleme başlamaz (tek uçuşta işlem).
 *  2. Aynı anahtar (örn. aynı miktar), son kabul edilen dokunuştan `cooldownMs` içinde yeniden gelirse yok sayılır.
 *     Farklı miktarlar birbirini engellemez; bilinçli ikinci kayıt cooldown sonrası yapılabilir.
 */
export interface TapGuard {
  /** Dokunuş kabul edildiyse `true`. Kabul edilen her çağrı `release` ile bitirilmelidir. */
  tryEnter(key: string): boolean;
  release(): void;
}

export function createTapGuard(cooldownMs: number, now: () => number = Date.now): TapGuard {
  let busy = false;
  let lastKey: string | null = null;
  let lastAt = Number.NEGATIVE_INFINITY;

  return {
    tryEnter(key) {
      if (busy) return false;
      const t = now();
      if (key === lastKey && t - lastAt < cooldownMs) return false;
      busy = true;
      lastKey = key;
      lastAt = t;
      return true;
    },
    release() {
      busy = false;
    },
  };
}

/** Hızlı ekleme düğmeleri için varsayılan pencere. */
export const QUICK_ADD_COOLDOWN_MS = 800;
