import { openAppDatabase } from './expoDb';
import type { Db } from './types';

let opening: Promise<Db> | null = null;

/** Uygulama ömrü boyunca tek bağlantı. Açılış başarısız olursa bir sonraki çağrıda yeniden denenir. */
export function getAppDatabase(): Promise<Db> {
  if (!opening) {
    opening = openAppDatabase().catch((e: unknown) => {
      opening = null;
      throw e;
    });
  }
  return opening;
}
