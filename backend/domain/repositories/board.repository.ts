import type { Board, BoardMemberRow, BoardWithDetails, MemberUser } from '../types';

/** Especificación de columnas iniciales (política de negocio del servicio). */
export interface DefaultColumnSpec {
  name: string;
  color: string;
  isPaused?: boolean;
  isDone?: boolean;
}

/**
 * Puerto de persistencia de pizarras y membresías.
 */
export interface BoardRepository {
  /** Pizarra con columnas, tareas, asignaciones y ocurrencias. */
  findByIdWithDetails(boardId: string): Promise<BoardWithDetails | null>;
  /** Pizarras propias o donde el usuario es miembro. */
  listVisibleByUser(userId: string): Promise<Board[]>;
  /**
   * Crea la pizarra, la membresía del dueño y las columnas iniciales (atómico).
   * @param boardData Datos validados por la entidad kanban, sin id.
   */
  createWithDefaults(boardData: Pick<Board, 'name' | 'description' | 'color' | 'ownerId'>, ownerId: string, defaultColumns: DefaultColumnSpec[]): Promise<Board>;
  /** ¿Existe la pizarra y pertenece a ownerId? */
  isOwner(boardId: string, ownerId: string): Promise<boolean>;
  /** ¿userId es dueño o miembro de la pizarra? */
  hasAccess(boardId: string, userId: string): Promise<boolean>;
  /** ¿Existe fila de membresía para userId (incluye al dueño)? */
  isMemberRow(boardId: string, userId: string): Promise<boolean>;
  /** Añade como miembro si no existe. */
  addMemberIfAbsent(boardId: string, userId: string, role: string): Promise<{ created: boolean; member: BoardMemberRow | null }>;
  /** Usuarios miembros de la pizarra. */
  listMemberUsers(boardId: string): Promise<MemberUser[]>;
}
