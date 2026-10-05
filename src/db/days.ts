import { nextDateKey } from '@/domain/date';
import type { Db } from './types';

/** Çok eski bir son kayıt varsa tüm boşluğu doldurmaz (en çok ~10 yıl). */
const MAX_BACKFILL_DAYS = 3660;

/**
 * `localDate` dahil, o güne kadar eksik gün satırlarını oluşturur.
 * Aradaki (aranan günden önceki) boş günler, kendilerinden önceki en son günün hedefini taşır; böylece
 * uygulama günlerce açılmasa da o günler "0 ml" olarak, o günün hedefiyle görünür ve hedef değişimi geçmişi etkilemez.
 * Aranan günün kendisi ayarlardaki güncel hedefle oluşturulur (hedef her değişimde bugünün satırına da yazıldığı için
 * normalde ikisi aynıdır). Var olan satırlara dokunmaz.
 * Bir işlem (transaction) içinden çağrılmalıdır.
 */
export async function ensureDaysThrough(db: Db, localDate: string): Promise<void> {
  const prev = await db.getFirstAsync<{ local_date: string; goal_ml: number }>(
    'SELECT local_date, goal_ml FROM days WHERE local_date <= ? ORDER BY local_date DESC LIMIT 1',
    [localDate],
  );
  if (prev?.local_date === localDate) return;

  const s = await db.getFirstAsync<{ daily_goal_ml: number }>('SELECT daily_goal_ml FROM settings WHERE id = 1');
  if (!s) throw new Error('Ayarlar satırı bulunamadı.');
  const currentGoal = s.daily_goal_ml;
  const gapGoal = prev?.goal_ml ?? currentGoal;

  let day = prev ? nextDateKey(prev.local_date) : localDate;
  let steps = 0;
  while (day < localDate) {
    if (++steps > MAX_BACKFILL_DAYS) {
      day = localDate;
      break;
    }
    await db.runAsync('INSERT OR IGNORE INTO days (local_date, goal_ml) VALUES (?, ?)', [day, gapGoal]);
    day = nextDateKey(day);
  }
  await db.runAsync('INSERT OR IGNORE INTO days (local_date, goal_ml) VALUES (?, ?)', [localDate, currentGoal]);
}
