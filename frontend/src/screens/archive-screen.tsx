import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, Screen, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { Board, KanbanRepository, Task } from '@/infrastructure/kanban/kanban.repository';
import { theme } from '@/theme';

const repository = new KanbanRepository();
export default function ArchiveScreen() {
  const router = useRouter(); const { logout } = useAuth(); const [boards,setBoards]=useState<Board[]>([]); const [tasks,setTasks]=useState<Task[]>([]); const [loading,setLoading]=useState(true); const [selected,setSelected]=useState('');
  useEffect(()=>{ repository.listBoards().then(({boards:items})=>{setBoards(items); if(items[0]) setSelected(items[0].id);}).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ if(selected) repository.archive(selected).then(({tasks:items})=>setTasks(items ?? [])); },[selected]);
  return <Screen><AppHeader title="Archivo" subtitle="Tareas completadas que ya no están activas." right={<View style={styles.actions}><SecondaryButton title="← Kanban" onPress={()=>router.push('/kanban')}/><SecondaryButton title="Salir" onPress={()=>logout().then(()=>router.replace('/login'))}/></View>}/><ScrollView horizontal style={styles.boardPicker}>{boards.map(board=><SecondaryButton key={board.id} title={board.name} onPress={()=>setSelected(board.id)}/>)}</ScrollView>{loading?<ActivityIndicator color={theme.colors.ink}/>:tasks.length===0?<Text style={styles.empty}>No hay tareas archivadas.</Text>:tasks.map(task=><View key={task.id} style={styles.row}><Text style={styles.title}>{task.title}</Text><Text style={styles.date}>📦 {task.archivedAt ?? ''}</Text></View>)}</Screen>;
}
const styles=StyleSheet.create({actions:{flexDirection:'row',gap:8},boardPicker:{marginBottom:16},empty:{color:theme.colors.inkMid,textAlign:'center',padding:32},row:{flexDirection:'row',justifyContent:'space-between',gap:12,borderBottomWidth:1,borderBottomColor:theme.colors.inkFaint,paddingVertical:14},title:{color:theme.colors.ink,fontWeight:'500',flex:1},date:{color:theme.colors.inkMid,fontSize:12}});
