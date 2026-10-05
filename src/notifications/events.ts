/** Veri/ayar değişince hatırlatma planının yenilenmesini isteyen küçük olay yolu. */
type Listener = () => void;
const listeners = new Set<Listener>();

export function requestReminderSync(): void {
  for (const l of [...listeners]) l();
}

export function onReminderSyncRequested(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
