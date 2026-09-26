import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Screen, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { CalendarRepository } from '@/infrastructure/calendar/calendar.repository';
import { calculateDayOfYear, dayKeyForYearDay, getDayVisualState } from '@/domain/calendar/calendar';
import { theme } from '@/theme';

const repository = new CalendarRepository();
const STATUS_TO_API = { done: 'completed', partial: 'partial', miss: 'failed' } as const;
const API_TO_STATUS = { completed: 'done', partial: 'partial', failed: 'miss' } as const;
type VisualState = 'past' | 'future' | 'done' | 'partial' | 'miss' | 'today';

export default function CalendarScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [progress, setProgress] = useState<Record<string, keyof typeof API_TO_STATUS>>({});
  const [error, setError] = useState('');
  const year = 2026;
  const today = new Date();
  const todayDoy = today.getFullYear() === year ? calculateDayOfYear(today.toISOString().slice(0, 10)) : today.getFullYear() < year ? 0 : 366;
  const columns = isMobile ? 10 : isTablet ? 18 : 26;
  const days = useMemo(() => Array.from({ length: 365 }, (_, index) => index + 1), []);
  const rows = useMemo(() => {
    const result: number[][] = [];
    for (let index = 0; index < days.length; index += columns) result.push(days.slice(index, index + columns));
    return result;
  }, [days, columns]);

  useEffect(() => {
    repository.getProgress().then((response) => setProgress(response.progress ?? {})).catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el calendario'));
  }, []);

  const stats = useMemo(() => {
    let done = 0; let partial = 0; let miss = 0;
    Object.values(progress).forEach((status) => {
      if (status === 'completed') done += 1;
      else if (status === 'partial') partial += 1;
      else if (status === 'failed') miss += 1;
    });
    return { done, partial, miss, left: Math.max(0, 365 - todayDoy) };
  }, [progress, todayDoy]);

  const cycleDay = async (day: number) => {
    if (day < todayDoy) return;
    const key = dayKeyForYearDay(year, day);
    const current = progress[key];
    const next = current === 'completed' ? 'partial' : current === 'partial' ? 'failed' : current === 'failed' ? undefined : 'completed';
    setProgress((previous) => {
      const copy = { ...previous };
      if (next) copy[key] = next;
      else delete copy[key];
      return copy;
    });
    try {
      if (next) await repository.updateDay(key, STATUS_TO_API[API_TO_STATUS[next]]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el día');
    }
  };

  const visualColor = (state: VisualState) => ({ done: theme.colors.done, partial: theme.colors.partial, miss: theme.colors.miss, past: theme.colors.past, future: theme.colors.future, today: theme.colors.future }[state]);

  const renderDay = (day: number) => {
    const key = dayKeyForYearDay(year, day);
    const status = progress[key];
    const visual = getDayVisualState({ dayOfYear: day, todayDayOfYear: todayDoy, status: status ? API_TO_STATUS[status] : null }) as VisualState;
    return (
      <Pressable key={day} accessibilityLabel={`Día ${day}`} accessibilityRole="button" onPress={() => cycleDay(day)} disabled={day < todayDoy} style={({ pressed }) => [styles.day, isMobile && styles.mobileDay, { backgroundColor: visualColor(visual) }, visual === 'today' && styles.today, pressed && day >= todayDoy && styles.dayPressed]} />
    );
  };

  return (
    <Screen dense={isMobile} style={isMobile ? styles.mobileScreen : isTablet ? styles.tabletScreen : styles.screen}>
      <View style={StyleSheet.flatten([styles.userHeader, isMobile && styles.mobileUserHeader])}>
        <Text style={styles.userInfo}>Hola, {user?.username ?? ''}</Text>
        <View style={StyleSheet.flatten([styles.mainNav, isMobile && styles.mobileMainNav])}>
          <SecondaryButton title="Kanban" iconName="albums-outline" compact={isMobile} fullWidth={isMobile} onPress={() => router.push('/kanban')} />
          <SecondaryButton title="Salir" iconName="log-out-outline" compact={isMobile} fullWidth={isMobile} onPress={() => logout().then(() => router.replace('/login'))} />
        </View>
      </View>
      <View style={StyleSheet.flatten([styles.hero, isTablet && styles.tabletHero, isMobile && styles.mobileHero])}>
        <Text style={StyleSheet.flatten([styles.year, isTablet && styles.tabletYear, isMobile && styles.mobileYear])}>{year}</Text>
        <Text style={StyleSheet.flatten([styles.tagline, isMobile && styles.mobileTagline])}>Cada día que pasa, ya no vuelve</Text>
      </View>
      <View style={StyleSheet.flatten([styles.stats, isTablet && styles.tabletStats, isMobile && styles.mobileStats])}>
        <View style={StyleSheet.flatten([styles.stat, isMobile && styles.mobileStat])}>
          <Text style={StyleSheet.flatten([styles.statNumber, isMobile && styles.mobileStatNumber])}>{stats.done}</Text>
          <View style={styles.statLabelRow}><View style={[styles.dot, { backgroundColor: theme.colors.done }]} /><Text style={styles.statLabel}>Todo bien</Text></View>
        </View>
        <View style={StyleSheet.flatten([styles.stat, isMobile && styles.mobileStat])}>
          <Text style={StyleSheet.flatten([styles.statNumber, isMobile && styles.mobileStatNumber])}>{stats.partial}</Text>
          <View style={styles.statLabelRow}><View style={[styles.dot, { backgroundColor: theme.colors.partial }]} /><Text style={styles.statLabel}>A medias</Text></View>
        </View>
        <View style={StyleSheet.flatten([styles.stat, isMobile && styles.mobileStat])}>
          <Text style={StyleSheet.flatten([styles.statNumber, isMobile && styles.mobileStatNumber])}>{stats.miss}</Text>
          <View style={styles.statLabelRow}><View style={[styles.dot, { backgroundColor: theme.colors.miss }]} /><Text style={styles.statLabel}>Sin cumplir</Text></View>
        </View>
        <View style={StyleSheet.flatten([styles.statLast, isMobile && styles.mobileStat])}>
          <Text style={StyleSheet.flatten([styles.statNumber, isMobile && styles.mobileStatNumber])}>{stats.left}</Text>
          <Text style={styles.statLabel}>Días restantes</Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList data={rows} keyExtractor={(row) => String(row[0])} style={styles.gridList} contentContainerStyle={StyleSheet.flatten([styles.grid, isMobile && styles.mobileGrid])} showsVerticalScrollIndicator={false} renderItem={({ item: row }) => <View style={StyleSheet.flatten([styles.gridRow, isMobile && styles.mobileGridRow])}>{row.map(renderDay)}{row.length < columns && Array.from({ length: columns - row.length }, (_, index) => <View key={`empty-${index}`} style={styles.dayPlaceholder} />)}</View>} />
      <View style={StyleSheet.flatten([styles.legend, isMobile && styles.mobileLegend])}>
        {[['past', 'Pasado sin marcar'], ['future', 'Por venir'], ['done', 'Todo bien'], ['partial', 'A medias'], ['miss', 'Sin cumplir']].map(([key, label]) => <View style={styles.legendItem} key={key}><Badge label=" " backgroundColor={visualColor(key as VisualState)} /><Text style={styles.legendText}>{label}</Text></View>)}
      </View>
      <Text style={StyleSheet.flatten([styles.footer, isMobile && styles.mobileFooter])}>365 oportunidades {'\u00a0·\u00a0'} Aprovéchalas</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 80 },
  tabletScreen: { paddingBottom: 60 },
  mobileScreen: { paddingBottom: 48 },
  userHeader: { width: '100%', maxWidth: 780, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 20, gap: 12 },
  mobileUserHeader: { paddingHorizontal: 0, flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  userInfo: { fontSize: 13, color: theme.colors.inkMid },
  mainNav: { flexDirection: 'row', gap: 8 },
  mobileMainNav: { flexDirection: 'column', gap: 8, width: '100%' },
  hero: { alignItems: 'center', marginBottom: 52 },
  tabletHero: { marginBottom: 36 },
  mobileHero: { marginBottom: 24 },
  year: { fontFamily: 'serif', fontSize: 108, fontWeight: '400', letterSpacing: -3, lineHeight: 98, color: theme.colors.ink },
  tabletYear: { fontSize: 88, lineHeight: 82, letterSpacing: -2.5 },
  mobileYear: { fontSize: 52, lineHeight: 50, letterSpacing: -1.5 },
  tagline: { marginTop: 14, fontSize: 10, letterSpacing: 2.8, textTransform: 'uppercase', color: theme.colors.inkMid, fontStyle: 'italic', textAlign: 'center' },
  mobileTagline: { fontSize: 8, letterSpacing: 2, marginTop: 8 },
  stats: { width: '100%', maxWidth: 780, alignSelf: 'center', flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: 12, overflow: 'hidden', marginBottom: 48 },
  tabletStats: { marginBottom: 32 },
  mobileStats: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, borderRadius: 10 },
  stat: { flex: 1, minWidth: 0, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: theme.colors.inkFaint },
  statLast: { flex: 1, minWidth: 0, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center' },
  mobileStat: { flexBasis: '50%', flexGrow: 0, borderRightWidth: 0, borderTopWidth: 1, borderTopColor: theme.colors.inkFaint, paddingVertical: 14 },
  statNumber: { fontFamily: 'serif', fontSize: 28, lineHeight: 30, color: theme.colors.ink },
  mobileStatNumber: { fontSize: 24, lineHeight: 26 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 5 },
  statLabel: { fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.colors.inkMid, textAlign: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  error: { width: '100%', maxWidth: 780, alignSelf: 'center', color: theme.colors.error, marginBottom: 16 },
  gridList: { width: '100%', maxWidth: 780, alignSelf: 'center', flexGrow: 0 },
  grid: { width: '100%' },
  mobileGrid: { width: '100%' },
  gridRow: { flexDirection: 'row', width: '100%', gap: 4, marginBottom: 4 },
  mobileGridRow: { gap: 3, marginBottom: 3 },
  day: { flex: 1, aspectRatio: 1, borderRadius: 4 },
  mobileDay: { borderRadius: 3 },
  dayPlaceholder: { flex: 1, aspectRatio: 1 },
  today: { borderWidth: 2, borderColor: theme.colors.ink, borderRadius: 4 },
  dayPressed: { transform: [{ scale: 1.08 }] },
  legend: { width: '100%', maxWidth: 780, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginTop: 36 },
  mobileLegend: { gap: 8, marginTop: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendText: { fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.colors.inkMid },
  footer: { marginTop: 60, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: theme.colors.inkMid, textAlign: 'center' },
  mobileFooter: { marginTop: 32 },
});
