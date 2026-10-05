import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAppDatabase } from '@/db/appDatabase';
import { createWaterRepository, type WaterRepository } from '@/db/waterRepository';
import { ErrorView, LoadingView } from '@/components/StatusViews';

const RepositoryContext = createContext<WaterRepository | null>(null);

export function useWaterRepository(): WaterRepository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error('useWaterRepository, DatabaseProvider dışında kullanıldı.');
  return repo;
}

type GateState =
  | { status: 'loading' }
  | { status: 'ready'; repo: WaterRepository }
  | { status: 'error'; message: string };

/** Veritabanı açılıp migration'lar uygulanana kadar çocukları göstermez; hata olursa yeniden deneme sunar. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<GateState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getAppDatabase().then(
      (db) => {
        if (!cancelled) setState({ status: 'ready', repo: createWaterRepository(db) });
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  const repo = state.status === 'ready' ? state.repo : null;
  const value = useMemo(() => repo, [repo]);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') {
    return (
      <ErrorView
        title="Veritabanı açılamadı"
        message={`Kayıtların cihazda duruyor; hiçbir şey silinmedi. ${state.message}`}
        onRetry={retry}
      />
    );
  }
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}
