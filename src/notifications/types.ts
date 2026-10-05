import type { PlannedReminder } from '@/domain/reminders';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface PermissionInfo {
  state: PermissionState;
  /** İşletim sistemi izin penceresini yeniden gösterebilir mi? (Android'de iki ret sonrası hayır.) */
  canAskAgain: boolean;
}

/**
 * İşletim sisteminde bildirim oluşturan/iptal eden işlemler. Planlama mantığı (`domain/reminders.ts`) buradan AYRIDIR;
 * testlerde sahte bir sürücü kullanılır, üretimde `expoDriver`.
 */
export interface NotificationDriver {
  /** Android bildirim kanalını oluşturur (Android 13+ izin penceresi için önce kanal gerekir). iOS'ta bir şey yapmaz. */
  ensureChannel(): Promise<void>;
  getPermission(): Promise<PermissionInfo>;
  requestPermission(): Promise<PermissionInfo>;
  /** Bu uygulamanın planlı bildirimlerinin hepsini iptal eder. */
  cancelAll(): Promise<void>;
  /** Verilenleri planlar; planlanan sayıyı döndürür. */
  schedule(items: readonly PlannedReminder[]): Promise<number>;
  openSystemSettings(): Promise<void>;
  /** Tanılama: işletim sisteminde gerçekten planlı olan hatırlatmaların sayısı ve en yakın zamanı. */
  listScheduled(): Promise<{ count: number; next: Date | null }>;
  /** Tanılama: birkaç saniye sonra tek bir deneme bildirimi gösterir (izin/kanal sorunlarını zamanlamadan ayırır). */
  sendTest(seconds?: number): Promise<void>;
}
