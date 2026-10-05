import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAppDatabase } from '@/db/appDatabase';
import { createMutex } from '@/db/mutex';
import { createSettingsRepository, type SettingsRepository } from '@/db/settingsRepository';
import { createWaterRepository, type WaterRepository } from '@/db/waterRepository';
import { ErrorView, LoadingView } from '@/components/StatusViews';

interface Repositories {
  water: WaterRepository;
  settings: SettingsRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

function useRepositories(): Repositories {
  const repos = useContext(RepositoryContext);
  if (!repos) throw new Error('Depo kancaları DatabaseProvider dışında kullanıldı.');
  return repos;
}

export const useWaterRepository = (): WaterRepository => useRepositories().water;
export const useSettingsRepository = (): SettingsRepository => useRepositories().settings;

type GateState =
  | { status: 'loading' }
  | { status: 'ready'; repos: Repositories }
  | { status: 'error'; message: string };

/** Veritabanı açılıp migration'lar uygulanana kadar çocukları göstermez; hata olursa yeniden deneme sunar. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<GateState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getAppDatabase().then(
      (db) => {
        if (cancelled) return;
        // İki depo aynı kilidi paylaşır: işlemler iç içe girmez.
        const exclusive = createMutex();
        setState({ status: 'ready', repos: { water: createWaterRepository(db, exclusive), settings: createSettingsRepository(db, exclusive) } });
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
  const repos = state.status === 'ready' ? state.repos : null;
  const value = useMemo(() => repos, [repos]);

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
