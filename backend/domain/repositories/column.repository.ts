import type { Column, ColumnPatch } from '../types';

/**
 * Puerto de persistencia de columnas de pizarra.
 */
export interface ColumnRepository {
  findById(columnId: string): Promise<Column | null>;
  /** Columna solo si pertenece a la pizarra. */
  findByIdInBoard(columnId: string, boardId: string): Promise<Column | null>;
  /** Columnas ordenadas por posición. */
  listByBoardOrdered(boardId: string): Promise<Column[]>;
  countByBoard(boardId: string): Promise<number>;
  /** Primera columna marcada como Done. */
  findDoneByBoard(boardId: string): Promise<Column | null>;
  create(data: Omit<Column, 'id'>): Promise<Column>;
  /** Actualiza campos y devuelve la fila resultante. */
  update(columnId: string, patch: ColumnPatch): Promise<Column | null>;
  /** Aplica posiciones en transacción. */
  updatePositions(positions: Array<{ id: string; position: number }>): Promise<void>;
}
