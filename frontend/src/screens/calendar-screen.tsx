import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, Badge, Screen, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { CalendarRepository } from '@/infrastructure/calendar/calendar.repository';
import { calculateDayOfYear, dayKeyForYearDay, getDayVisualState } from '@/domain/calendar/calendar';
import { theme } from '@/theme';

const repository = new CalendarRepository();
const STATUS_TO_API = { done: 'completed', partial: 'partial', miss: 'failed' } as const;
const API_TO_STATUS = { completed: 'done', partial: 'partial', failed: 'miss' } as const;

export default function CalendarScreen() {
  const router = useRouter(); const { user, logout } = useAuth(); const { width } = useWindowDimensions();
  const [progress, setProgress] = useState<Record<string, keyof typeof API_TO_STATUS>>({});
  const [error, setError] = useState('');
  const year = 2026; const today = new Date(); const todayDoy = today.getFullYear() === year ? calculateDayOfYear(today.toISOString().slice(0, 10)) : today.getFullYear() < year ? 0 : 366;
  const columns = width < 480 ? 13 : width < 768 ? 18 : 26;
  const days = useMemo(() => Array.from({ length: 365 }, (_, index) => index + 1), []);

  useEffect(() => { repository.getProgress().then((response) => setProgress(response.progress ?? {})).catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el calendario')); }, []);

  const stats = useMemo(() => { let done = 0, partial = 0, miss = 0; Object.values(progress).forEach((status) => { if (status === 'completed') done++; else if (status === 'partial') partial++; else if (status === 'failed') miss++; }); return { done, partial, miss, left: Math.max(0, 365 - todayDoy) }; }, [progress, todayDoy]);

  const cycleDay = async (day: number) => {
    if (day < todayDoy) return;
    const key = dayKeyForYearDay(year, day); const current = progress[key]; const next = current === 'completed' ? 'partial' : current === 'partial' ? 'failed' : current === 'failed' ? undefined : 'completed';
    setProgress((previous) => { const copy = { ...previous }; if (next) copy[key] = next; else delete copy[key]; return copy; });
    try { if (next) await repository.updateDay(key, STATUS_TO_API[API_TO_STATUS[next]]); else { /* API has no reset endpoint; visual reset remains local until next sync. */ } } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el día'); }
  };

  const visualColor = (state: string) => ({ done: theme.colors.done, partial: theme.colors.partial, miss: theme.colors.miss, past: theme.colors.past, future: theme.colors.future, today: theme.colors.future } as Record<string, string>)[state];

  return <Screen><AppHeader title="2026" subtitle={`Hola, ${user?.username ?? ''}`} right={<View style={styles.actions}><SecondaryButton title="📋 Kanban" onPress={() => router.push('/kanban')} /><SecondaryButton title="Salir" onPress={() => logout().then(() => router.replace('/login'))}/></View>}/>
    <Text style={styles.tagline}>Cada día que pasa, ya no vuelve</Text>
    <View style={styles.stats}>{[['done',stats.done,'Todo bien'],['partial',stats.partial,'A medias'],['miss',stats.miss,'Sin cumplir'],['left',stats.left,'Días restantes']].map(([key,value,label]) => <View style={styles.stat} key={key as string}><Text style={styles.statNumber}>{value as number}</Text><Text style={styles.statLabel}>{label as string}</Text></View>)}</View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <FlatList data={days} key={columns} numColumns={columns} keyExtractor={(item) => String(item)} contentContainerStyle={styles.grid} renderItem={({ item }) => { const key = dayKeyForYearDay(year, item); const status = progress[key]; const visual = getDayVisualState({ dayOfYear: item, todayDayOfYear: todayDoy, status: status ? API_TO_STATUS[status] : null }); return <Pressable accessibilityLabel={`Día ${item}`} onPress={() => cycleDay(item)} style={[styles.day, { backgroundColor: visualColor(visual) }, visual === 'today' && styles.today]} />; }} />
    <View style={styles.legend}>{[['past','Pasado sin marcar'],['future','Por venir'],['done','Todo bien'],['partial','A medias'],['miss','Sin cumplir']].map(([key,label]) => <View style={styles.legendItem} key={key}><Badge label=" " backgroundColor={visualColor(key)} /><Text style={styles.legendText}>{label}</Text></View>)}</View>
    <Text style={styles.footer}>365 oportunidades · Aprovéchalas</Text>
  </Screen>;
}

const styles = StyleSheet.create({ actions:{flexDirection:'row',gap:8},tagline:{fontSize:11,letterSpacing:2.5,textTransform:'uppercase',fontStyle:'italic',color:theme.colors.inkMid,textAlign:'center',marginBottom:theme.spacing.xl},stats:{flexDirection:'row',borderWidth:1,borderColor:theme.colors.inkFaint,borderRadius:theme.radius.lg,overflow:'hidden',marginBottom:theme.spacing.xl},stat:{flex:1,paddingVertical:14,alignItems:'center',borderRightWidth:1,borderRightColor:theme.colors.inkFaint},statNumber:{fontFamily:'serif',fontSize:24,color:theme.colors.ink},statLabel:{fontSize:9,letterSpacing:1.5,textTransform:'uppercase',color:theme.colors.inkMid,marginTop:4},grid:{alignSelf:'center',width:'100%',maxWidth:780,gap:4,paddingBottom:theme.spacing.lg},day:{flex:1,aspectRatio:1,borderRadius:4,margin:2},today:{borderWidth:2,borderColor:theme.colors.ink},legend:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:14,marginTop:theme.spacing.md},legendItem:{flexDirection:'row',alignItems:'center',gap:6},legendText:{fontSize:10,color:theme.colors.inkMid},footer:{fontSize:9,letterSpacing:2,textTransform:'uppercase',color:theme.colors.inkMid,textAlign:'center',marginVertical:theme.spacing.xl},error:{color:theme.colors.error,marginBottom:theme.spacing.md}});
