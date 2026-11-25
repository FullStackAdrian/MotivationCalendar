import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppHeader, Badge, Field, ModalFocusScrollContext, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { Icon } from '@/components/icon';
import { useResponsive } from '@/hooks/use-responsive';
import { useScrollFocusedIntoView, useScrollToFocusedInput } from '@/hooks/use-scroll-to-focused-input';
import { Board, BoardColumn, BoardMember, KanbanRepository, Task } from '@/infrastructure/kanban/kanban.repository';
import { friendlyAuthError } from '@/screens/auth-error';
import { theme } from '@/theme';

const repository = new KanbanRepository();
const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const columnColors = ['#64748b', '#2E5E18', '#8A5A0A', '#862222', '#7c3aed', '#2563eb'];
type ModalType = 'board' | 'column' | 'task' | 'archive' | null;

export default function KanbanScreen() {
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();
  const { width } = useWindowDimensions();
  const columnWidth = isMobile ? Math.min(Math.max(width - 48, 240), 320) : 280;
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<Board | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [archive, setArchive] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [error, setError] = useState('');
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [columnName, setColumnName] = useState('');
  const [columnColor, setColumnColor] = useState(columnColors[0]);
  const [columnDone, setColumnDone] = useState(false);
  const [columnPaused, setColumnPaused] = useState(false);
  const [columnWip, setColumnWip] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskColumn, setTaskColumn] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskPoints, setTaskPoints] = useState('');
  const [taskMinutes, setTaskMinutes] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskRecurrence, setTaskRecurrence] = useState<'none' | 'weekly'>('none');
  const [recurrence, setRecurrence] = useState<number[]>([]);
  const [taskTags, setTaskTags] = useState('');
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [menuColumn, setMenuColumn] = useState<BoardColumn | null>(null);
  const [editingColumn, setEditingColumn] = useState<BoardColumn | null>(null);
  const [editingBoard, setEditingBoard] = useState(false);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [acting, setActing] = useState(false);
  const columns = useMemo(() => [...(selected?.columns ?? [])].sort((a, b) => a.position - b.position), [selected]);
  const activeTasks = useMemo(() => (selected?.tasks ?? []).filter((task) => !task.archivedAt), [selected]);


  const loadBoards = async (preferredId?: string) => {
    setLoading(true);
    try {
      const next = await repository.listBoards();
      const safeBoards: Board[] = Array.isArray(next) ? next : [];
      setBoards(safeBoards);
      const boardId = preferredId ?? selected?.id ?? safeBoards[0]?.id;
      if (boardId) {
        try {
          const board = await repository.getBoard(boardId);
          setSelected(board ?? null);
          const [mRes, aRes] = await Promise.all([
            repository.getMembers(board.id).catch(() => [] as BoardMember[]),
            repository.archive(board.id).catch(() => [] as Task[]),
          ]);
          setMembers(Array.isArray(mRes) ? mRes : []);
          setArchive(Array.isArray(aRes) ? aRes : []);
        } catch {
          setSelected(null);
          setMembers([]);
          setArchive([]);
        }
      } else {
        setSelected(null);
        setMembers([]);
        setArchive([]);
      }
    } catch (e) {
      setError(friendlyAuthError(e, 'No se pudo cargar el Kanban'));
      setBoards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectBoard = async (id: string) => {
    try {
      setLoading(true);
      const board = await repository.getBoard(id);
      setSelected(board);
      const [nextMembers, nextArchive] = await Promise.all([
        repository.getMembers(id).catch(() => [] as BoardMember[]),
        repository.archive(id).catch(() => [] as Task[]),
      ]);
      setMembers(nextMembers);
      setArchive(nextArchive);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la pizarra');
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    if (!boardName.trim()) return;
    try {
      const board = await repository.createBoard({ name: boardName.trim(), description: boardDescription.trim() || undefined });
      resetBoardForm();
      await loadBoards(board.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la pizarra');
    }
  };

  const createColumn = async () => {
    if (!selected || !columnName.trim()) return;
    try {
      await repository.createColumn(selected.id, {
        name: columnName.trim(),
        color: columnColor,
        isDone: columnDone,
        isPaused: columnPaused,
        wipLimit: columnWip ? Number(columnWip) : undefined,
      });
      resetColumnForm();
      await loadBoards(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el estado');
    }
  };

  const createTask = async () => {
    if (!selected || !taskTitle.trim() || !taskColumn) return;
    try {
      await repository.createTask(selected.id, {
        title: taskTitle.trim(),
        columnId: taskColumn,
        priority: taskPriority,
        assigneeId: taskAssignee || undefined,
        effortPoints: taskPoints ? Number(taskPoints) : undefined,
        estimatedMinutes: taskMinutes ? Number(taskMinutes) : undefined,
        dueDate: taskDate || undefined,
        dueTime: taskTime || undefined,
        recurrence: taskRecurrence === 'weekly' && recurrence.length ? { type: 'weekly', days: recurrence } : undefined,
        tags: taskTags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      resetTaskForm();
      await loadBoards(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la tarea');
    }
  };

  const moveTask = async (task: Task) => {
    if (!selected) return;
    const currentIndex = columns.findIndex((column) => column.id === task.columnId);
    const nextColumn = currentIndex >= 0 ? columns[currentIndex + 1] : undefined;
    if (!nextColumn) return;
    try {
      await repository.moveTask(task.id, nextColumn.id);
      await loadBoards(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mover la tarea');
    }
  };

  const openTaskModal = () => {
    if (!selected || !columns.length) return;
    setTaskColumn(columns[0].id);
    setModal('task');
  };

  /** Ejecuta una acción sobre la tarjeta con bloqueo anti-doble-pulsación. */
  const runTaskAction = async (action: () => Promise<unknown>, closeAfter = true) => {
    if (acting) return;
    setActing(true);
    try {
      await action();
      if (closeAfter) setDetailTask(null);
      if (selected) await loadBoards(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción');
    } finally {
      setActing(false);
    }
  };

  const advanceTask = (task: Task) => {
    if (!selected) return;
    const currentIndex = columns.findIndex((column) => column.id === task.columnId);
    const nextColumn = currentIndex >= 0 ? columns[currentIndex + 1] : undefined;
    if (!nextColumn) return;
    return runTaskAction(() => repository.moveTask(task.id, nextColumn.id));
  };

  const regressTask = (task: Task) => {
    if (!selected) return;
    const currentIndex = columns.findIndex((column) => column.id === task.columnId);
    const prevColumn = currentIndex > 0 ? columns[currentIndex - 1] : undefined;
    if (!prevColumn) return;
    return runTaskAction(() => repository.moveTask(task.id, prevColumn.id));
  };

  const completeTask = (task: Task) => runTaskAction(() => repository.completeTask(task.id));

  const startEditTask = (task: Task) => {
    setConfirmKey(null);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditingTask(true);
  };

  const saveTaskEdit = (task: Task) => {
    if (!editTitle.trim()) return;
    return runTaskAction(() => repository.updateTask(task.id, { title: editTitle.trim(), priority: editPriority }), true)
      .then(() => setEditingTask(false));
  };

  const deleteTask = (task: Task) => {
    if (acting) return;
    if (confirmKey !== `task:${task.id}`) {
      setConfirmKey(`task:${task.id}`);
      return;
    }
    return runTaskAction(() => repository.deleteTask(task.id), true)
      .then(() => setConfirmKey(null));
  };

  const deleteColumn = (column: BoardColumn) => {
    if (!selected || acting) return;
    if (confirmKey !== `column:${column.id}`) {
      setConfirmKey(`column:${column.id}`);
      return;
    }
    setActing(true);
    setMenuColumn(null);
    (async () => {
      try {
        await repository.deleteColumn(column.id);
        setConfirmKey(null);
        await loadBoards(selected.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo borrar el estado');
      } finally {
        setActing(false);
      }
    })();
  };

  const startRenameColumn = (column: BoardColumn) => {
    setMenuColumn(null);
    setEditingColumn(column);
    setColumnName(column.name);
    setColumnColor(column.color || columnColors[0]);
    setColumnDone(column.isDone);
    setColumnPaused(column.isPaused);
    setColumnWip(column.wipLimit != null ? String(column.wipLimit) : '');
    setModal('column');
  };

  const moveColumn = async (column: BoardColumn, direction: -1 | 1) => {
    if (!selected || acting) return;
    const target = columns.findIndex((item) => item.id === column.id) + direction;
    if (target < 0 || target >= columns.length) return;
    setActing(true);
    try {
      await repository.reorderColumn(selected.id, column.id, target);
      setMenuColumn(null);
      setConfirmKey(null);
      await loadBoards(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mover el estado');
    } finally {
      setActing(false);
    }
  };

  const saveColumn = async () => {
    if (!selected || !columnName.trim()) return;
    if (editingColumn) {
      try {
        await repository.updateColumn(editingColumn.id, { name: columnName.trim() });
        resetColumnForm();
        await loadBoards(selected.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo renombrar el estado');
      }
      return;
    }
    await createColumn();
  };

  const resetBoardForm = () => { setBoardName(''); setBoardDescription(''); setEditingBoard(false); setModal(null); };

  const startRenameBoard = () => {
    if (!selected) return;
    setConfirmKey(null);
    setBoardName(selected.name);
    setBoardDescription(selected.description ?? '');
    setEditingBoard(true);
    setModal('board');
  };

  const saveBoard = async () => {
    if (!boardName.trim()) return;
    if (editingBoard && selected) {
      try {
        await repository.updateBoard(selected.id, { name: boardName.trim() });
        resetBoardForm();
        await loadBoards(selected.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo renombrar la pizarra');
      }
      return;
    }
    await createBoard();
  };

  const deleteBoard = async () => {
    if (!selected || acting) return;
    if (confirmKey !== 'board') {
      setConfirmKey('board');
      return;
    }
    setActing(true);
    try {
      await repository.deleteBoard(selected.id);
      setConfirmKey(null);
      setSelected(null);
      await loadBoards();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar la pizarra');
    } finally {
      setActing(false);
    }
  };
  const resetColumnForm = () => {
    setColumnName('');
    setColumnColor(columnColors[0]);
    setColumnDone(false);
    setColumnPaused(false);
    setColumnWip('');
    setEditingColumn(null);
    setModal(null);
  };
  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskColumn('');
    setTaskAssignee('');
    setTaskPriority('medium');
    setTaskPoints('');
    setTaskMinutes('');
    setTaskDate('');
    setTaskTime('');
    setTaskRecurrence('none');
    setRecurrence([]);
    setTaskTags('');
    setModal(null);
  };

  const compactBtn = isMobile;

  return (
    <Screen dense={isMobile} style={styles.screen}>
      <View style={styles.shell}>
        <AppHeader
          title="Kanban"
          subtitle="Organiza el trabajo sin perder de vista el día."
          stack={false}
          right={
            <View style={[styles.headerActions, isMobile && styles.mobileHeaderActions]}>
              <SecondaryButton title="Calendario" iconName="chevron-back" iconSide="left" compact={compactBtn} onPress={() => router.push('/calendar')} />
              <SecondaryButton title="Ajustes" iconName="settings-outline" compact={compactBtn} onPress={() => router.push('/settings')} />
            </View>
          }
        />
        <View style={styles.toolbar}>
          <View style={[styles.boardPicker, isMobile && styles.mobileBoardPicker]}>
            <Text style={styles.boardPickerLabel}>Pizarra</Text>
            <View testID="board-actions-row" style={styles.boardActionsRow}>
              <View style={styles.boardActionCell}>
                <SecondaryButton testID="board-create" title="Nueva pizarra" iconName="add" compact={isMobile} onPress={() => setModal('board')} />
              </View>
              <View style={styles.boardActionCell}>
                <SecondaryButton testID="board-rename" title="Renombrar" iconName="pencil-outline" compact={isMobile} onPress={startRenameBoard} disabled={!selected} />
              </View>
              <View style={styles.boardActionCell}>
                <SecondaryButton testID={confirmKey === 'board' ? 'board-delete-confirm' : 'board-delete'} title={confirmKey === 'board' ? 'Confirmar borrado' : 'Borrar'} iconName="trash-outline" compact={isMobile} onPress={deleteBoard} disabled={!selected || acting} />
              </View>
            </View>
            <BoardSelector
              boards={boards}
              selectedId={selected?.id ?? null}
              onSelect={selectBoard}
            />
          </View>
          <View style={[styles.toolbarActions, isMobile && styles.mobileToolbarActions]}>
            <SecondaryButton testID="kanban-new-state" title="Nuevo estado" iconName="add" compact={compactBtn} onPress={() => selected && setModal('column')} disabled={!selected} />
            <PrimaryButton testID="kanban-new-task" title="Nueva tarea" iconName="add" compact={compactBtn} onPress={openTaskModal} disabled={!selected || !columns.length} />
            <SecondaryButton testID="kanban-archive" title="Archivo" iconName="archive-outline" compact={compactBtn} onPress={() => selected && setModal('archive')} disabled={!selected} />
          </View>
        </View>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <SecondaryButton title="Reintentar" compact onPress={() => { setError(''); loadBoards(selected?.id); }} />
          </View>
        ) : null}
        {loading && !selected ? <ActivityIndicator color={theme.colors.ink} style={styles.loader} /> : null}
        {!loading && !selected && !error && !modal ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Crea tu primera pizarra</Text>
            <Text style={styles.emptySubtitle}>Organiza tus tareas en columnas y avanza paso a paso.</Text>
            <PrimaryButton title="Crear pizarra" iconName="add" onPress={() => setModal('board')} />
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={[styles.board, isMobile && styles.mobileBoard]}>
          {columns.map((column) => {
            const columnTasks = activeTasks.filter((task) => task.columnId === column.id);
            return (
              <View key={column.id} style={[styles.column, isMobile ? { width: columnWidth } : null]}>
                <View style={styles.columnHead}>
                  {column.isDone ? (
                    <Icon name="checkmark" size={12} color={theme.colors.done} />
                  ) : (
                    <View style={[styles.statusDot, { backgroundColor: column.color || theme.colors.ink }]} />
                  )}
                  <Text style={styles.columnTitle} numberOfLines={1} ellipsizeMode="tail">{column.name}</Text>
                  {column.isPaused ? <Icon name="time-outline" size={12} color={theme.colors.inkMid} /> : null}
                  <Text style={styles.count}>{column.wipLimit != null ? `${columnTasks.length}/${column.wipLimit}` : columnTasks.length}</Text>
                  <Pressable testID={`column-menu-${column.id}`} onPress={() => { setConfirmKey(null); setMenuColumn(column); }} accessibilityLabel={`Opciones de ${column.name}`} hitSlop={8} style={styles.columnMenuBtn}>
                    <Icon name="ellipsis-horizontal" size={16} color={theme.colors.inkMid} />
                  </Pressable>
                </View>
                <View style={styles.cards}>
                  {columnTasks.length ? (
                    columnTasks.map((task) => (
                      <Pressable key={task.id} onPress={() => moveTask(task)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                        <Text style={styles.taskTitle} numberOfLines={3} ellipsizeMode="tail">{task.title}</Text>
                        <Pressable testID={`task-detail-${task.id}`} onPress={() => setDetailTask(task)} accessibilityLabel={`Detalle de ${task.title}`} hitSlop={8} style={styles.detailBtn}>
                          <Icon name="ellipsis-horizontal" size={15} color={theme.colors.inkMid} />
                        </Pressable>
                        <View style={styles.taskMeta}>
                          {task.priority === 'high' ? (
                            <View style={styles.metaInline}>
                              <Icon name="flag-outline" size={11} color={theme.colors.miss} />
                              <Text style={[styles.priority, styles.priorityHigh]}> {task.priority}</Text>
                            </View>
                          ) : (
                            <Text style={[styles.priority, task.priority === 'low' && styles.priorityLow]}>{task.priority}</Text>
                          )}
<View style={styles.metaInline}>
                            <Icon name="person-outline" size={11} color={theme.colors.inkMid} />
                            <Text style={styles.metaText}> {task.assignee ? ` ${task.assignee.username}` : ' Sin asignar'}</Text>
                          </View>
                        </View>
                        <View style={styles.tags}>
                          {(task.tags ?? []).map((tag) => (
                            <Badge key={tag} label={tag} />
                          ))}
                        </View>
                        <View style={styles.taskFooter}>
                          {task.effortPoints ? (
                            <View style={styles.metaInline}>
                              <Icon name="star-outline" size={11} color={theme.colors.inkMid} />
                              <Text style={styles.metaText}> {task.effortPoints}</Text>
                            </View>
                          ) : null}
                          {task.estimatedMinutes ? (
                            <View style={styles.metaInline}>
                              <Icon name="time-outline" size={11} color={theme.colors.inkMid} />
                              <Text style={styles.metaText}> {task.estimatedMinutes}m</Text>
                            </View>
                          ) : null}
                          {task.recurrence?.type === 'weekly' ? (
                            <View style={styles.metaInline}>
                              <Icon name="repeat-outline" size={11} color={theme.colors.inkMid} />
                              <Text style={styles.metaText}> {task.recurrence.days.map((day) => dayLabels[day - 1]).join(' · ')}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={[styles.taskStatus, { backgroundColor: column.color || theme.colors.ink }]}>
                          <Text style={styles.taskStatusText} numberOfLines={1}>{column.name}</Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.empty}>
                      <Icon name="archive-outline" size={20} color={theme.colors.inkFaint} />
                      <Text style={styles.emptyText}>Sin tareas</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
        {isMobile && columns.length > 1 ? <Text style={styles.swipeHint}>Desliza para ver más columnas →</Text> : null}
        {selected && columns.length ? <Text style={styles.hint}>Pulsa una tarjeta para avanzar al siguiente estado.</Text> : null}
      </View>

      <Modal visible={modal === 'board'} transparent animationType="fade" onRequestClose={resetBoardForm}>
        <ModalShell title={editingBoard ? 'Renombrar pizarra' : 'Nueva pizarra'} onClose={resetBoardForm} footer={<PrimaryButton testID="cta-create-board" title={editingBoard ? 'Guardar pizarra' : 'Crear pizarra'} iconName={editingBoard ? 'checkmark' : 'add'} onPress={saveBoard} />}>
          <Field label="Nombre" value={boardName} onChangeText={setBoardName} maxLength={120} />
          {editingBoard ? null : (
          <Field label="Descripción" value={boardDescription} onChangeText={setBoardDescription} multiline numberOfLines={3} />
          )}
        </ModalShell>
      </Modal>

      <Modal visible={modal === 'column'} transparent animationType="fade" onRequestClose={resetColumnForm}>
        <ModalShell title={editingColumn ? 'Renombrar estado' : 'Nuevo estado'} onClose={resetColumnForm} footer={<PrimaryButton testID="cta-create-column" title={editingColumn ? 'Guardar estado' : 'Crear estado'} iconName={editingColumn ? 'checkmark' : 'add'} onPress={saveColumn} />}>
          <Field label="Nombre" value={columnName} onChangeText={setColumnName} maxLength={80} />
          {editingColumn ? null : (
            <>
          <Text style={styles.formLabel}>Color</Text>
          <View style={styles.colorPicker}>
            {columnColors.map((color) => (
              <Pressable key={color} onPress={() => setColumnColor(color)} style={[styles.color, { backgroundColor: color }, columnColor === color && styles.colorSelected]} />
            ))}
          </View>
          <Toggle label="Estado de finalización" active={columnDone} onPress={() => setColumnDone((value) => !value)} />
          <Toggle label="Estado en pausa" active={columnPaused} onPress={() => setColumnPaused((value) => !value)} />
          <Field label="Límite WIP opcional" value={columnWip} onChangeText={setColumnWip} keyboardType="numeric" />
            </>
          )}
        </ModalShell>
      </Modal>

      <Modal visible={modal === 'task'} transparent animationType="slide" onRequestClose={resetTaskForm}>
        <ModalShell title="Nueva tarea" onClose={resetTaskForm} footer={<PrimaryButton testID="cta-create-task" title="Crear tarea" iconName="add" onPress={createTask} />}>
          <Field label="Título" value={taskTitle} onChangeText={setTaskTitle} maxLength={180} />
          <OptionPicker label="Estado" options={columns.map((column) => ({ value: column.id, label: column.name }))} value={taskColumn} onChange={setTaskColumn} />
          <OptionPicker label="Asignar a" options={[{ value: '', label: 'Sin asignar' }, ...members.map((member) => ({ value: member.id, label: member.username }))]} value={taskAssignee} onChange={setTaskAssignee} />
          <OptionPicker label="Prioridad" options={[{ value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }]} value={taskPriority} onChange={(value) => setTaskPriority(value as 'low' | 'medium' | 'high')} />
          <View style={styles.formGrid}>
            <View style={styles.formGridItem}>
              <Field label="Puntos" value={taskPoints} onChangeText={setTaskPoints} keyboardType="numeric" />
            </View>
            <View style={styles.formGridItem}>
              <Field label="Minutos estimados" value={taskMinutes} onChangeText={setTaskMinutes} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.formGrid}>
            <View style={styles.formGridItem}>
              <Field label="Fecha" value={taskDate} onChangeText={setTaskDate} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.formGridItem}>
              <Field label="Hora" value={taskTime} onChangeText={setTaskTime} placeholder="HH:mm" />
            </View>
          </View>
          <OptionPicker label="Frecuencia" options={[{ value: 'none', label: 'Sin frecuencia' }, { value: 'weekly', label: 'Semanal' }]} value={taskRecurrence} onChange={(value) => setTaskRecurrence(value as 'none' | 'weekly')} />
          {taskRecurrence === 'weekly' ? (
            <View>
              <Text style={styles.formLabel}>Días</Text>
              <View style={styles.weekdays}>
                {dayLabels.map((label, index) => (
                  <Pressable
                    key={label}
                    onPress={() => setRecurrence((days) => days.includes(index + 1) ? days.filter((day) => day !== index + 1) : [...days, index + 1])}
                    style={[styles.weekday, recurrence.includes(index + 1) && styles.weekdayActive]}
                  >
                    <Text style={recurrence.includes(index + 1) ? styles.weekdayActiveText : styles.weekdayText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <Field label="Tags" value={taskTags} onChangeText={setTaskTags} placeholder="tag1, tag2" />
        </ModalShell>
      </Modal>

      <Modal visible={modal === 'archive'} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <ModalShell title="Archivo" onClose={() => setModal(null)}>
          {archive.length ? archive.map((task) => (
            <View key={task.id} style={styles.archiveRow}>
              <Text style={styles.archiveTitle} numberOfLines={2}>{task.title}</Text>
              <View style={styles.metaInline}>
                <Icon name="archive-outline" size={12} color={theme.colors.inkMid} />
                <Text style={styles.archiveDate}> {task.archivedAt ?? ''}</Text>
              </View>
            </View>
          )) : (
            <Text style={styles.emptyArchive}>No hay tareas archivadas.</Text>
          )}
        </ModalShell>
      </Modal>

      <Modal visible={detailTask != null} transparent animationType="slide" onRequestClose={() => { setDetailTask(null); setEditingTask(false); setConfirmKey(null); }}>
        <ModalShell title="Detalle de tarea" onClose={() => { setDetailTask(null); setEditingTask(false); setConfirmKey(null); }} footer={
          detailTask ? (
            <View style={styles.detailActions}>
              <SecondaryButton testID="task-detail-back" title="Anterior" iconName="arrow-back" compact onPress={() => regressTask(detailTask)} disabled={acting || columns.findIndex((column) => column.id === detailTask.columnId) <= 0} />
              <SecondaryButton testID="task-detail-complete" title="Completar" iconName="checkmark" compact onPress={() => completeTask(detailTask)} disabled={acting} />
              <PrimaryButton testID="task-detail-next" title="Siguiente" iconName="chevron-forward" iconSide="right" compact onPress={() => advanceTask(detailTask)} disabled={acting || columns.findIndex((column) => column.id === detailTask.columnId) < 0 || columns.findIndex((column) => column.id === detailTask.columnId) >= columns.length - 1} />
            </View>
          ) : undefined
        }>
          {detailTask ? (
            <View style={styles.detailBody}>
              <Text style={styles.detailTitle}>{detailTask.title}</Text>
              <View style={styles.metaInline}>
                {detailTask.priority === 'high' ? <Icon name="flag-outline" size={12} color={theme.colors.miss} /> : null}
                <Text style={styles.metaText}>Prioridad: {detailTask.priority}</Text>
              </View>
              <View style={styles.metaInline}>
                <Icon name="person-outline" size={12} color={theme.colors.inkMid} />
                <Text style={styles.metaText}>{detailTask.assignee ? ` ${detailTask.assignee.username}` : ' Sin asignar'}</Text>
              </View>
              {detailTask.effortPoints ? (
                <View style={styles.metaInline}>
                  <Icon name="star-outline" size={12} color={theme.colors.inkMid} />
                  <Text style={styles.metaText}> {detailTask.effortPoints} puntos</Text>
                </View>
              ) : null}
              {detailTask.estimatedMinutes ? (
                <View style={styles.metaInline}>
                  <Icon name="time-outline" size={12} color={theme.colors.inkMid} />
                  <Text style={styles.metaText}> {detailTask.estimatedMinutes} min estimados</Text>
                </View>
              ) : null}
              {detailTask.recurrence?.type === 'weekly' ? (
                <View style={styles.metaInline}>
                  <Icon name="repeat-outline" size={12} color={theme.colors.inkMid} />
                  <Text style={styles.metaText}> Semanal: {detailTask.recurrence.days.map((day) => dayLabels[day - 1]).join(' · ')}</Text>
                </View>
              ) : null}
              {detailTask.tags?.length ? (
                <View style={styles.tags}>
                  {detailTask.tags.map((tag) => (
                    <Badge key={tag} label={tag} />
                  ))}
                </View>
              ) : null}
              {editingTask ? (
                <View style={styles.detailEdit}>
                  <Field label="Título" value={editTitle} onChangeText={setEditTitle} maxLength={180} />
                  <OptionPicker label="Prioridad" options={[{ value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }]} value={editPriority} onChange={(value) => setEditPriority(value as 'low' | 'medium' | 'high')} />
                  <View style={styles.detailActions}>
                    <PrimaryButton testID="task-save" title="Guardar" iconName="checkmark" compact onPress={() => detailTask && saveTaskEdit(detailTask)} disabled={acting || !editTitle.trim()} />
                    <SecondaryButton title="Cancelar" compact onPress={() => setEditingTask(false)} disabled={acting} />
                  </View>
                </View>
              ) : (
                <View style={styles.detailActions}>
                  <SecondaryButton testID="task-edit" title="Editar" iconName="pencil-outline" compact onPress={() => detailTask && startEditTask(detailTask)} disabled={acting} />
                  <SecondaryButton testID={confirmKey === `task:${detailTask.id}` ? 'task-delete-confirm' : 'task-delete'} title={confirmKey === `task:${detailTask.id}` ? 'Confirmar borrado' : 'Eliminar'} iconName="trash-outline" compact onPress={() => detailTask && deleteTask(detailTask)} disabled={acting} />
                </View>
              )}
              {acting ? <ActivityIndicator color={theme.colors.ink} style={styles.loader} /> : null}
            </View>
          ) : null}
        </ModalShell>
      </Modal>

      {menuColumn != null ? (
        <Pressable testID="column-menu-backdrop" onPress={() => { setMenuColumn(null); setConfirmKey(null); }} accessibilityLabel="Cerrar opciones" style={styles.menuBackdrop} />
      ) : null}
      {menuColumn != null ? (
        <View testID={`column-menu-popover-${menuColumn.id}`} style={styles.columnPopoverFloating}>
          <Text style={styles.columnPopoverTitle} numberOfLines={1} ellipsizeMode="tail">{menuColumn.name}</Text>
          <SecondaryButton testID="column-rename" title="Renombrar" iconName="pencil-outline" fullWidth onPress={() => startRenameColumn(menuColumn)} disabled={acting} />
          <SecondaryButton testID="column-left" title="Mover a la izquierda" iconName="arrow-back" fullWidth onPress={() => moveColumn(menuColumn, -1)} disabled={acting || columns.findIndex((item) => item.id === menuColumn.id) <= 0} />
          <SecondaryButton testID="column-right" title="Mover a la derecha" iconName="arrow-forward" iconSide="right" fullWidth onPress={() => moveColumn(menuColumn, 1)} disabled={acting || columns.findIndex((item) => item.id === menuColumn.id) >= columns.length - 1} />
          <SecondaryButton testID={confirmKey === `column:${menuColumn.id}` ? 'column-delete-confirm' : 'column-delete'} title={confirmKey === `column:${menuColumn.id}` ? 'Confirmar borrado' : 'Eliminar'} iconName="trash-outline" fullWidth onPress={() => deleteColumn(menuColumn)} disabled={acting} />
          <SecondaryButton title="Cerrar" fullWidth onPress={() => { setMenuColumn(null); setConfirmKey(null); }} />
        </View>
      ) : null}
    </Screen>
  );
}

function BoardSelector({ boards, selectedId, onSelect }: { boards: Board[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const list = boards ?? [];
  const selectedIndex = Math.max(0, list.findIndex((item) => item.id === selectedId));
  const go = (direction: -1 | 1) => {
    const next = selectedIndex + direction;
    if (next < 0 || next >= list.length) return;
    onSelect(list[next].id);
  };
  const selected = list[selectedIndex] ?? null;
  return (
    <View testID="board-selector" style={selectorStyles.wrap}>
      <Pressable
        testID="board-selector-prev"
        onPress={() => go(-1)}
        disabled={!selected || selectedIndex <= 0}
        accessibilityLabel="Pizarra anterior"
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [selectorStyles.nav, (!selected || selectedIndex <= 0) && selectorStyles.navDisabled, pressed && selectorStyles.navPressed]}
      >
        <Text style={selectorStyles.navText}>‹</Text>
      </Pressable>
      <ScrollView
        testID="board-selector-pages"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.pages}
        onMomentumScrollEnd={(event) => {
          const viewport = event.nativeEvent.layoutMeasurement?.width ?? 0;
          if (!viewport || !list.length) return;
          const index = Math.round(event.nativeEvent.contentOffset.x / viewport);
          const clamped = Math.min(Math.max(index, 0), list.length - 1);
          if (list[clamped] && list[clamped].id !== selectedId) onSelect(list[clamped].id);
        }}
      >
        {list.map((item) => (
          <Pressable key={item.id} onPress={() => onSelect(item.id)} accessibilityRole="button" accessibilityLabel={`Pizarra ${item.name}`} style={selectorStyles.page}>
            {item.id === selectedId ? (
              <View testID="board-selector-current" style={selectorStyles.current}>
                <Text style={selectorStyles.currentText} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                <Text style={selectorStyles.counter}>{`${selectedIndex + 1} de ${list.length}`}</Text>
              </View>
            ) : (
              <View style={selectorStyles.pageInner}>
                <Text style={selectorStyles.pageText} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        testID="board-selector-next"
        onPress={() => go(1)}
        disabled={!selected || selectedIndex >= list.length - 1}
        accessibilityLabel="Pizarra siguiente"
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [selectorStyles.nav, (!selected || selectedIndex >= list.length - 1) && selectorStyles.navDisabled, pressed && selectorStyles.navPressed]}
      >
        <Text style={selectorStyles.navText}>›</Text>
      </Pressable>
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  nav: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.inkFaint, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' },
  navDisabled: { opacity: 0.4 },
  navPressed: { opacity: 0.75 },
  navText: { color: theme.colors.ink, fontSize: 22, lineHeight: 24 },
  pages: { flexGrow: 1, alignItems: 'center' },
  page: { flex: 1, minWidth: 0, justifyContent: 'center' },
  current: { backgroundColor: theme.colors.ink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', gap: 2, minWidth: 140 },
  currentText: { color: theme.colors.white, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  counter: { color: theme.colors.white, fontSize: 11, opacity: 0.8 },
  pageInner: { borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: 8, backgroundColor: theme.colors.white, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 140 },
  pageText: { color: theme.colors.inkMid, fontSize: 14, textAlign: 'center' },
});

function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useContext(SafeAreaInsetsContext);
  const bottom = insets?.bottom ?? 0;
  const scrollRef = useRef<ScrollView>(null);
  useScrollToFocusedInput(scrollRef);
  const scrollFocusedIntoView = useScrollFocusedIntoView(scrollRef);
  return (
    <View style={[styles.overlay, { paddingBottom: Math.max(16, bottom + 8) }]}>
      <ModalKeyboardPadding>
        <View style={styles.modal}>
          <Pressable testID="modal-close" onPress={onClose} accessibilityLabel="Cerrar" style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.modalTitle}>{title}</Text>
          <ModalFocusScrollContext.Provider value={scrollFocusedIntoView}>
          <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {children}
          </ScrollView>
          </ModalFocusScrollContext.Provider>
          {footer ? <View testID="modal-footer" style={styles.modalFooter}>{footer}</View> : null}
        </View>
      </ModalKeyboardPadding>
    </View>
  );
}

/**
 * La ventana del Modal no se redimensiona con el teclado en Android, así que
 * `adjustResize` no basta: se añade padding inferior con la altura del teclado
 * para que el modal quede por encima de él y el contenido sea desplazable.
 * En iOS se delega en KeyboardAvoidingView (`padding`).
 */
function ModalKeyboardPadding({ children }: { children: React.ReactNode }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (Platform.OS !== 'android') {
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.avoid}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={[styles.avoid, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>{children}</View>;
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.toggle}>
      <View style={[styles.checkbox, active && styles.checkboxActive]}>{active ? <Text style={styles.check}>✓</Text> : null}</View>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

function OptionPicker({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        {options.map((option) => (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.option, value === option.value && styles.optionActive]}>
            <Text style={[styles.optionText, value === option.value && styles.optionTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  shell: { width: '100%', maxWidth: 1400, alignSelf: 'center', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mobileHeaderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
toolbar: { marginBottom: theme.spacing.lg, gap: 14 },
  boardPicker: { minWidth: 0, width: '100%', gap: 8, alignItems: 'flex-start' },
  mobileBoardPicker: { alignItems: 'stretch' },
  boardPickerLabel: { color: theme.colors.inkMid, fontSize: 11, marginBottom: 2, letterSpacing: 1, textTransform: 'uppercase' },
  boardActionsRow: { flexDirection: 'row', gap: 8, width: '100%' },
  boardActionCell: { flex: 1, minWidth: 0 },
  boardOptions: { gap: 6, paddingRight: 4 },
  boardOption: { borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: 7, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.white, maxWidth: 220 },
  boardOptionActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  boardOptionText: { color: theme.colors.inkMid, fontSize: 14 },
  boardOptionTextActive: { color: theme.colors.white, fontWeight: '600' },
  toolbarActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' },
  mobileToolbarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  board: { gap: 16, alignItems: 'flex-start', paddingBottom: 24, paddingRight: 16 },
  mobileBoard: { gap: 10, paddingLeft: 0, paddingRight: 8 },
  column: {
    backgroundColor: 'rgba(237,233,224,0.8)',
    borderWidth: 1,
    borderColor: theme.colors.inkFaint,
    borderRadius: 12,
    minWidth: 280,
    width: 280,
    padding: 12,
  },
  columnHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2, paddingTop: 4, paddingBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  columnTitle: { color: theme.colors.ink, fontWeight: '600', flex: 1 },
  count: { color: theme.colors.inkMid, fontSize: 12 },
  columnMenuBtn: { padding: 6, borderRadius: 6 },
  columnPopoverFloating: {
    position: 'absolute',
    top: 150,
    right: 12,
    width: 240,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.inkFaint,
    borderRadius: 12,
    padding: 8,
    gap: 8,
    zIndex: 30,
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  columnPopoverTitle: { color: theme.colors.inkMid, fontSize: 12, paddingHorizontal: 4, marginBottom: 2 },
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
  detailBtn: { position: 'absolute', right: 6, bottom: 6, padding: 6, borderRadius: 6 },
  detailActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  detailBody: { gap: 10 },
  detailTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '600' },
  detailEdit: { gap: 10 },
  menuList: { gap: 8 },
  cards: { minHeight: 80, gap: 10 },
  empty: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyText: { color: theme.colors.inkMid, fontSize: 13 },
  card: {
    position: 'relative',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.inkFaint,
    borderRadius: 10,
    padding: 13,
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  taskTitle: { color: theme.colors.ink, fontWeight: '500', fontSize: 14, lineHeight: 20, marginBottom: 10, paddingRight: 55 },
  taskMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  priority: { color: theme.colors.partial, fontSize: 11 },
  priorityHigh: { color: theme.colors.miss },
  priorityLow: { color: theme.colors.done },
  metaInline: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: theme.colors.inkMid, fontSize: 11 },
  tags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginVertical: 7 },
  taskFooter: { minHeight: 20, flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  taskStatus: { position: 'absolute', right: 10, top: 10, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, maxWidth: 110 },
  taskStatusText: { color: theme.colors.white, fontSize: 9 },
  hint: { color: theme.colors.inkMid, textAlign: 'center', fontSize: 11, marginVertical: 10 },
  swipeHint: { color: theme.colors.inkMid, textAlign: 'center', fontSize: 11, marginVertical: 6 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { color: theme.colors.ink, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { color: theme.colors.inkMid, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  loader: { marginVertical: 20 },
  errorBox: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: theme.colors.error, borderRadius: 6, padding: 10, marginBottom: 12, gap: 8 },
  errorText: { color: theme.colors.error },
  overlay: { flex: 1, backgroundColor: 'rgba(26,24,20,0.4)', justifyContent: 'center', padding: 16, zIndex: 20 },
  avoid: { flex: 1, width: '100%', justifyContent: 'center' },
  modalBody: { flexGrow: 1, flexShrink: 1 },
  modalBodyContent: { gap: 14, paddingBottom: 4 },
  modalFooter: { marginTop: 2 },
  modal: {
    position: 'relative',
    backgroundColor: theme.colors.background,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    alignSelf: 'center',
    borderRadius: 14,
    padding: 28,
    gap: 14,
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  close: { position: 'absolute', right: 8, top: 8, padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeText: { color: theme.colors.ink, fontSize: 28, lineHeight: 30 },
  modalTitle: { color: theme.colors.ink, fontFamily: 'serif', fontSize: 30, fontWeight: '400', marginBottom: 2 },
  formLabel: { color: theme.colors.inkMid, fontSize: 13 },
  formGrid: { flexDirection: 'row', gap: 10 },
  formGridItem: { flex: 1, minWidth: 0 },
  optionGroup: { gap: 6 },
  optionRow: { gap: 6 },
  option: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 9 },
  optionActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  optionText: { color: theme.colors.inkMid, fontSize: 12 },
  optionTextActive: { color: theme.colors.white },
  weekdays: { flexDirection: 'row', gap: 6 },
  weekday: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.colors.inkFaint, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  weekdayActive: { backgroundColor: theme.colors.ink },
  weekdayText: { color: theme.colors.ink },
  weekdayActiveText: { color: theme.colors.white },
  colorPicker: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  color: { width: 30, height: 30, borderRadius: 15 },
  colorSelected: { borderWidth: 3, borderColor: theme.colors.ink, transform: [{ scale: 1.08 }] },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: 4, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  check: { color: theme.colors.white, fontSize: 13, fontWeight: '700' },
  toggleText: { color: theme.colors.ink, fontSize: 13 },
  archiveRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.inkFaint, paddingVertical: 12 },
  archiveTitle: { color: theme.colors.ink, fontWeight: '500', flex: 1 },
  archiveDate: { color: theme.colors.inkMid, fontSize: 11 },
  emptyArchive: { color: theme.colors.inkMid, paddingVertical: 20, textAlign: 'center' },
});
