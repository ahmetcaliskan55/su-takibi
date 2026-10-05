import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { msUntilNextLocalMidnight } from '@/domain/date';
import { plantStage } from '@/domain/plant';
import { createTapGuard, QUICK_ADD_COOLDOWN_MS } from '@/domain/tapGuard';
import type { BubbleEvent } from '@/domain/messages';
import type { DaySummary, WaterRepository } from '@/db/waterRepository';
import { addWaterNow, loadToday } from './waterService';

export type TodayState =
  | { status: 'loading' }
  | { status: 'ready'; day: DaySummary }
  | { status: 'error'; message: string };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Bugünün verisi. Yerel takvim günü şu durumlarda yeniden hesaplanır:
 *  - açılışta,
 *  - uygulama arka plandan öne gelince (kapalı/uyku sırasında gün değişmiş olabilir),
 *  - uygulama açıkken bir sonraki yerel gece yarısında.
 */
export function useToday(repo: WaterRepository) {
  const [state, setState] = useState<TodayState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [bubble, setBubble] = useState<{ localDate: string; event: BubbleEvent }>({ localDate: '', event: 'idle' });

  const guard = useMemo(() => createTapGuard(QUICK_ADD_COOLDOWN_MS), []);
  const requestId = useRef(0);
  const dayRef = useRef<DaySummary | null>(null);

  const apply = useCallback((next: TodayState) => {
    if (next.status === 'ready') dayRef.current = next.day;
    setState(next);
  }, []);

  /** Her zaman çözülür; hatayı duruma çevirir. */
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

  const addQuick = useCallback(
    async (amountMl: number) => {
      if (!guard.tryEnter(String(amountMl))) return;
      setSaving(true);
      setAddError(null);
      try {
        const before = dayRef.current;
        await addWaterNow(repo, amountMl, new Date());
        const after = await refresh();
        if (after) {
          const sameDay = before?.localDate === after.localDate;
          const up = sameDay && before ? plantStage(after.totalMl, after.goalMl) > plantStage(before.totalMl, before.goalMl) : false;
          setBubble({ localDate: after.localDate, event: up ? 'stage-up' : 'stage-same' });
        }
      } catch {
        setAddError('Kayıt eklenemedi. Biraz sonra tekrar dene.');
      } finally {
        setSaving(false);
        guard.release();
      }
    },
    [guard, repo, refresh],
  );

  const bubbleEvent: BubbleEvent =
    state.status === 'ready' && bubble.localDate === state.day.localDate ? bubble.event : 'idle';

  return { state, saving, addError, bubbleEvent, addQuick, retry: refresh };
}
