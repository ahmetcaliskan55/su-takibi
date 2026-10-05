import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ErrorView, LoadingView } from '@/components/StatusViews';
import type { Profile, Settings } from '@/db/settingsRepository';
import { useSettingsRepository } from './DatabaseProvider';

interface Value {
  settings: Settings;
  profile: Profile;
  /** Kaydettikten sonra güncel değerleri yeniden okur. */
  reload: () => Promise<void>;
}

const SettingsContext = createContext<Value | null>(null);

export function useSettings(): Value {
  const v = useContext(SettingsContext);
  if (!v) throw new Error('useSettings, SettingsProvider dışında kullanıldı.');
  return v;
}

type State = { status: 'loading' } | { status: 'ready'; settings: Settings; profile: Profile } | { status: 'error'; message: string };

/** Ayarlar ve profil okunana kadar çocukları göstermez; okuma hatasında yeniden deneme sunar. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const repo = useSettingsRepository();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(
    () =>
      repo.load().then(
        (v): State => ({ status: 'ready', ...v }),
        (e: unknown): State => ({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      ),
    [repo],
  );

  useEffect(() => {
    let cancelled = false;
    void load().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const reload = useCallback(async () => setState(await load()), [load]);
  const value = useMemo<Value | null>(
    () => (state.status === 'ready' ? { settings: state.settings, profile: state.profile, reload } : null),
    [state, reload],
  );

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') {
    return (
      <ErrorView
        title="Ayarlar okunamadı"
        message={state.message}
        onRetry={() => {
          setState({ status: 'loading' });
          void reload();
        }}
      />
    );
  }
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
