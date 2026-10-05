import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DaySheet } from '@/components/DaySheet';
import { Chips } from '@/components/form';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { HistoryStats } from '@/components/HistoryStats';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorView } from '@/components/StatusViews';
import { MONTHS_TR, parseDateKey, toLocalDateKey } from '@/domain/date';
import { buildCalendarPage, computeStats, hasEarlierPage, lastNDays, type DayTotal } from '@/domain/history';
import type { DaySummary } from '@/db/waterRepository';
import { useWaterRepository } from '@/state/DatabaseProvider';

type Tab = 'takvim' | 'istatistik';
interface Loaded {
  todayKey: string;
  rows: DayTotal[];
  firstDay: string | null;
}

/** Geçmiş: takvim (gün ayrıntısı salt okunur) ve son 7/30 gün istatistiği. Her günün kendi hedef anlık görüntüsüyle. */
export default function HistoryScreen() {
  const repo = useWaterRepository();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('takvim');
  const [pageIdx, setPageIdx] = useState(0);
  const [range, setRange] = useState<7 | 30>(7);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DaySummary | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const todayKey = toLocalDateKey(new Date());
      let from: string;
      let to: string;
      if (tab === 'takvim') {
        const page = buildCalendarPage(todayKey, pageIdx);
        [from, to] = [page.startKey, page.endKey];
      } else {
        const days = lastNDays(todayKey, range);
        [from, to] = [days[0]!, days[days.length - 1]!];
      }
      const [rows, firstDay] = await Promise.all([repo.getTotals(from, to), repo.firstDay()]);
      if (id !== requestId.current) return;
      setData({ todayKey, rows, firstDay });
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : String(e));
    }
  }, [repo, tab, pageIdx, range]);

  // Sekmeye her dönüşte ve seçimler değişince yeniden oku (Bugün'de eklenen kayıtlar görünsün).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const rowMap = useMemo(() => new Map((data?.rows ?? []).map((r) => [r.localDate, r])), [data]);

  const openDay = async (dateKey: string) => {
    try {
      const day = await repo.peekDay(dateKey);
      if (day) setDetail(day);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (error && !data) return <ErrorView title="Geçmiş okunamadı" message={error} onRetry={() => void load()} />;

  const todayKey = data?.todayKey ?? toLocalDateKey(new Date());
  const page = buildCalendarPage(todayKey, pageIdx);
  const days = lastNDays(todayKey, range);
  const first = parseDateKey(days[0]!);
  const caption = `${first.getDate()} ${MONTHS_TR[first.getMonth()]} – ${parseDateKey(todayKey).getDate()} ${MONTHS_TR[parseDateKey(todayKey).getMonth()]}`;

  return (
    <View style={styles.root}>
      <ScreenHeader eyebrow="Önceki günlerin bitkileri" title="Geçmiş" />
      <View style={styles.tabs}>
        <Chips
          label="Görünüm"
          options={[
            { value: 'takvim', label: 'Takvim' },
            { value: 'istatistik', label: 'İstatistik' },
          ]}
          selected={tab}
          onSelect={setTab}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {tab === 'takvim' ? (
          <HistoryCalendar
            page={page}
            rows={rowMap}
            canPrev={hasEarlierPage(data?.firstDay ?? null, page.startKey)}
            canNext={pageIdx < 0}
            onPrev={() => setPageIdx((p) => p - 1)}
            onNext={() => setPageIdx((p) => Math.min(0, p + 1))}
            onSelect={(k) => void openDay(k)}
          />
        ) : (
          <HistoryStats range={range} onRange={setRange} stats={computeStats(days, data?.rows ?? [], todayKey)} caption={caption} />
        )}
      </ScrollView>

      {detail ? (
        <DaySheet
          day={detail}
          isToday={detail.localDate === todayKey}
          onClose={() => setDetail(null)}
          onEditToday={() => {
            setDetail(null);
            router.navigate('/');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { marginHorizontal: 20, marginTop: 14 },
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
});
