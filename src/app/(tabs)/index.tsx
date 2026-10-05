import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AddWaterSheet } from '@/components/AddWaterSheet';
import { HomeContent } from '@/components/HomeContent';
import { RecordsSheet } from '@/components/RecordsSheet';
import { ErrorView, LoadingView } from '@/components/StatusViews';
import { UndoToast } from '@/components/UndoToast';
import { useWaterRepository } from '@/state/DatabaseProvider';
import { useToday } from '@/state/useToday';

type Sheet = { kind: 'add'; editId: number | null; from: 'records' | null } | { kind: 'records' } | null;

export default function TodayScreen() {
  const repo = useWaterRepository();
  const t = useToday(repo);
  const [sheet, setSheet] = useState<Sheet>(null);

  if (t.state.status === 'loading') return <LoadingView label="Bugün yükleniyor…" />;
  if (t.state.status === 'error') {
    return <ErrorView title="Bugünün kayıtları okunamadı" message={t.state.message} onRetry={() => void t.retry()} />;
  }

  const day = t.state.day;
  const now = new Date();
  const toast = t.toast;
  const toastNode = (style?: { bottom: number }) =>
    toast ? <UndoToast message={toast.message} onUndo={() => void t.undo(toast.token)} style={style} /> : null;

  /** Panelden kaydet/sil sonrası: düzenleme "Kayıtlar"dan açıldıysa oraya dön, değilse kapat. */
  const afterAction = (from: 'records' | null) => setSheet(from === 'records' ? { kind: 'records' } : null);

  const editing = sheet?.kind === 'add' && sheet.editId !== null ? (day.logs.find((l) => l.id === sheet.editId) ?? null) : null;

  return (
    <View style={styles.root}>
      <HomeContent
        day={day}
        now={now}
        saving={t.saving}
        actionError={t.actionError}
        bubbleEvent={t.bubbleEvent}
        onQuickAdd={(ml) => void t.addQuick(ml)}
        onOpenAdd={() => {
          t.clearActionError();
          setSheet({ kind: 'add', editId: null, from: null });
        }}
        onOpenRecords={() => {
          t.clearActionError();
          setSheet({ kind: 'records' });
        }}
      />

      {!sheet ? toastNode({ bottom: 12 }) : null}

      {sheet?.kind === 'records' ? (
        <RecordsSheet
          day={day}
          saving={t.saving}
          overlay={toastNode()}
          onClose={() => setSheet(null)}
          onAdd={() => setSheet({ kind: 'add', editId: null, from: 'records' })}
          onEdit={(log) => setSheet({ kind: 'add', editId: log.id, from: 'records' })}
          onDelete={(log) => void t.removeLog(log.id)}
        />
      ) : null}

      {sheet?.kind === 'add' ? (
        // Düzenlenen kayıt arada silindiyse (ör. geri al) panel kapanır; `key` ile her açılışta temiz form.
        sheet.editId !== null && !editing ? null : (
          <AddWaterSheet
            key={`${sheet.editId ?? 'new'}`}
            editing={editing}
            now={now}
            saving={t.saving}
            overlay={toastNode()}
            onClose={() => afterAction(sheet.from)}
            onDelete={editing ? () => void t.removeLog(editing.id).then((r) => r.ok && afterAction(sheet.from)) : undefined}
            onSubmit={async (input) => {
              const res = await t.submitLog(input, sheet.editId);
              if (res.ok) afterAction(sheet.from);
              return res;
            }}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
