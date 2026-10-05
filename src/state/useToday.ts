import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { formatMl, msUntilNextLocalMidnight } from '@/domain/date';
import { FORM_MESSAGES } from '@/domain/logForm';
import { plantStage } from '@/domain/plant';
import { createTapGuard, QUICK_ADD_COOLDOWN_MS } from '@/domain/tapGuard';
import type { BubbleEvent } from '@/domain/messages';
import { LogNotFoundError, type DaySummary, type WaterRepository } from '@/db/waterRepository';
import {
  addWater,
  addWaterNow,
  AddWaterError,
  deleteWater,
  editWater,
  loadToday,
  undoWater,
  type LogInput,
  type UndoAction,
} from './waterService';

export type TodayState =
  | { status: 'loading' }
  | { status: 'ready'; day: DaySummary }
  | { status: 'error'; message: string };

/** "Geri al" bildiriminin görünme süresi. */
export const UNDO_TOAST_MS = 7000;

export interface UndoToast {
  token: number;
  localDate: string;
  message: string;
  action: UndoAction;
}

/** `message: null` → dokunuş koruması yok saydı (kullanıcıya hata gösterilmez). */
export type ActionResult = { ok: true } | { ok: false; message: string | null };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
export const SAVE_FAILED = 'Kaydedilemedi. Biraz sonra tekrar dene.';

/** Kullanıcıya gösterilecek, anlaşılır hata metni. Başarısızlıkta asla başarı mesajı üretilmez. */
export function describeActionError(e: unknown): string {
  if (e instanceof AddWaterError) {
    if (e.reason === 'time_in_future') return FORM_MESSAGES.timeFuture;
    if (e.reason === 'not_today') return 'Yeni bir gün başladı. Kayıtlar yenilendi.';
    return SAVE_FAILED;
  }
  if (e instanceof LogNotFoundError) return 'Bu kayıt artık yok. Liste yenilendi.';
  return SAVE_FAILED;
}

/**
 * Bugünün verisi ve işlemleri. Yerel takvim günü şu durumlarda yeniden hesaplanır:
 *  - açılışta,
 *  - uygulama arka plandan öne gelince,
 *  - uygulama açıkken bir sonraki yerel gece yarısında.
 *
 * Her işlem (ekle/düzenle/sil/geri al) önce veritabanına yazılır; ancak yazma ve yeniden okuma başarılı olursa
 * "Geri al" bildirimi gösterilir. Aynı anda tek işlem çalışır ve aynı işlem hemen tekrarlanamaz.
 */
export function useToday(repo: WaterRepository) {
  const [state, setState] = useState<TodayState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bubble, setBubble] = useState<{ localDate: string; event: BubbleEvent }>({ localDate: '', event: 'idle' });
  const [toast, setToast] = useState<UndoToast | null>(null);

  const guard = useMemo(() => createTapGuard(QUICK_ADD_COOLDOWN_MS), []);
  const requestId = useRef(0);
  const dayRef = useRef<DaySummary | null>(null);
  const toastRef = useRef<UndoToast | null>(null);
  const tokenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((next: TodayState) => {
    if (next.status === 'ready') dayRef.current = next.day;
    setState(next);
  }, []);

  const fetchState = useCallback(
    (): Promise<TodayState> =>
      loadToday(repo, new Date()).then(
        (day): TodayState => ({ status: 'ready', day }),
        (e: unknown): TodayState => ({ status: 'error', message: errorMessage(e) }),
      ),
    [repo],
  );

  const refresh = useCallback(async (): Promise<DaySummary | null> => {
    const id = ++requestId.current;
    const next = await fetchState();
    if (id !== requestId.current) return null; // daha yeni bir istek başladı
    apply(next);
    return next.status === 'ready' ? next.day : null;
  }, [fetchState, apply]);

  useEffect(() => {
    let cancelled = false;
    const id = ++requestId.current;
    void fetchState().then((next) => {
      if (!cancelled && id === requestId.current) apply(next);
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [fetchState, apply, refresh]);

  // Uygulama açıkken gece yarısı geçişi.
  const dateKey = state.status === 'ready' ? state.day.localDate : null;
  useEffect(() => {
    if (!dateKey) return;
    const timer = setTimeout(() => void refresh(), msUntilNextLocalMidnight(new Date()) + 250);
    return () => clearTimeout(timer);
  }, [dateKey, refresh]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const clearToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    tokenRef.current += 1; // bekleyen "Geri al" geçersiz olur
    toastRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((localDate: string, message: string, action: UndoAction) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const token = ++tokenRef.current;
    const next: UndoToast = { token, localDate, message, action };
    toastRef.current = next;
    setToast(next);
    timerRef.current = setTimeout(() => {
      if (tokenRef.current === token) {
        toastRef.current = null;
        setToast(null);
      }
    }, UNDO_TOAST_MS);
  }, []);

  const perform = useCallback(
    async (
      key: string,
      work: () => Promise<{ message: string; action: UndoAction; bubble: 'add' | 'edited' }>,
    ): Promise<ActionResult> => {
      if (!guard.tryEnter(key)) return { ok: false, message: null };
      setSaving(true);
      setActionError(null);
      try {
        const before = dayRef.current;
        const done = await work();
        const after = await refresh();
        if (after) {
          const up =
            done.bubble === 'add' &&
            before?.localDate === after.localDate &&
            plantStage(after.totalMl, after.goalMl) > plantStage(before.totalMl, before.goalMl);
          setBubble({
            localDate: after.localDate,
            event: done.bubble === 'edited' ? 'edited' : up ? 'stage-up' : 'stage-same',
          });
          // Başarı bildirimi yalnızca yazma VE yeniden okuma başarılıysa gösterilir.
          showToast(after.localDate, done.message, done.action);
        }
        return { ok: true };
      } catch (e) {
        // Yazma başarısızsa durum değişmemiştir; yine de ekranı gerçek veriyle eşle.
        void refresh();
        return { ok: false, message: describeActionError(e) };
      } finally {
        setSaving(false);
        guard.release();
      }
    },
    [guard, refresh, showToast],
  );

  const addQuick = useCallback(
    async (amountMl: number) => {
      const res = await perform(`add:${amountMl}`, async () => {
        const log = await addWaterNow(repo, amountMl, new Date());
        return { message: `${formatMl(amountMl)} ml eklendi`, action: { kind: 'add', log }, bubble: 'add' };
      });
      if (!res.ok && res.message) setActionError(res.message);
      return res;
    },
    [perform, repo],
  );

  /** Özel miktar/saatle ekler; `editId` verilirse o kaydı düzenler. */
  const submitLog = useCallback(
    (input: LogInput, editId: number | null): Promise<ActionResult> =>
      perform(`log:${editId ?? 'new'}:${input.amountMl}:${input.minuteOfDay}`, async () => {
        const now = new Date();
        if (editId === null) {
          const log = await addWater(repo, input, now);
          return { message: `${formatMl(input.amountMl)} ml eklendi`, action: { kind: 'add', log }, bubble: 'add' };
        }
        const { before, after } = await editWater(repo, editId, input, now);
        return { message: 'Kayıt güncellendi', action: { kind: 'edit', before, after }, bubble: 'edited' };
      }),
    [perform, repo],
  );

  const removeLog = useCallback(
    async (id: number): Promise<ActionResult> => {
      const res = await perform(`del:${id}`, async () => {
        const log = await deleteWater(repo, id);
        return { message: 'Kayıt silindi', action: { kind: 'delete', log }, bubble: 'edited' };
      });
      if (!res.ok && res.message) setActionError(res.message);
      return res;
    },
    [perform, repo],
  );

  /** Yalnızca görünen bildirimin işlemini geri alır; eski/süresi dolmuş bildirim hiçbir şey yapmaz. */
  const undo = useCallback(
    async (token: number): Promise<ActionResult> => {
      const current = toastRef.current;
      if (!current || current.token !== token) return { ok: false, message: null };
      if (!guard.tryEnter(`undo:${token}`)) return { ok: false, message: null };
      setSaving(true);
      clearToast();
      try {
        await undoWater(repo, current.action);
        await refresh();
        setBubble((b) => ({ ...b, localDate: current.localDate, event: 'edited' }));
        return { ok: true };
      } catch (e) {
        void refresh();
        const message = e instanceof LogNotFoundError ? 'Bu işlem artık geri alınamıyor.' : 'Geri alınamadı. Biraz sonra tekrar dene.';
        setActionError(message);
        return { ok: false, message };
      } finally {
        setSaving(false);
        guard.release();
      }
    },
    [clearToast, guard, refresh, repo],
  );

  const visibleToast = state.status === 'ready' && toast?.localDate === state.day.localDate ? toast : null;
  const bubbleEvent: BubbleEvent =
    state.status === 'ready' && bubble.localDate === state.day.localDate ? bubble.event : 'idle';

  return {
    state,
    saving,
    actionError,
    clearActionError: () => setActionError(null),
    bubbleEvent,
    toast: visibleToast,
    addQuick,
    submitLog,
    removeLog,
    undo,
    retry: refresh,
  };
}
