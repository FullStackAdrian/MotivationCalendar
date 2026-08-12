import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, Screen, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { Board, KanbanRepository, Task } from '@/infrastructure/kanban/kanban.repository';
import { theme } from '@/theme';

const repository = new KanbanRepository();

export default function ArchiveScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    repository.listBoards().then((items) => {
      setBoards(items);
      if (items[0]) setSelected(items[0].id);
    }).catch(() => setBoards([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    repository.archive(selected).then((items) => setTasks(items ?? [])).catch(() => setTasks([])).finally(() => setLoading(false));
  }, [selected]);

  return <Screen style={styles.screen}>
    <View style={styles.shell}>
      <AppHeader title="Archivo" subtitle="Tareas completadas que ya no están activas." right={<View style={styles.actions}><SecondaryButton title="← Kanban" onPress={() => router.push('/kanban')} /><SecondaryButton title="Salir" onPress={() => logout().then(() => router.replace('/login'))}/></View>}/>
      <View style={styles.controls}>
        <Text style={styles.label}>Pizarra</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardPicker}>{boards.map((board) => <SecondaryButton key={board.id} title={board.name} onPress={() => setSelected(board.id)}/>)}</ScrollView>
      </View>
      <View style={styles.list}>
        {loading ? <ActivityIndicator color={theme.colors.ink} style={styles.loader}/> : tasks.length === 0 ? <Text style={styles.empty}>No hay tareas archivadas.</Text> : tasks.map((task) => <View key={task.id} style={styles.row}><Text style={styles.title}>{task.title}</Text><Text style={styles.date}>📦 {task.archivedAt ?? ''}</Text></View>)}
      </View>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  shell: { width: '100%', maxWidth: 1400, alignSelf: 'center', flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  controls: { marginBottom: 20 },
  label: { color: theme.colors.inkMid, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  boardPicker: { gap: 8 },
  list: { width: '100%', maxWidth: 900, alignSelf: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: theme.radius.md, paddingHorizontal: 16 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.inkFaint, paddingVertical: 12 },
  title: { color: theme.colors.ink, fontWeight: '500', flex: 1 },
  date: { color: theme.colors.inkMid, fontSize: 12 },
  empty: { color: theme.colors.inkMid, textAlign: 'center', paddingVertical: 32 },
  loader: { paddingVertical: 32 },
});
