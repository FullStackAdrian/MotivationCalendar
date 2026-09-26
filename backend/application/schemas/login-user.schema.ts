/**
 * Esquema de entrada para el caso de uso de login.
 * Contrato declarativo del puerto de entrada (capa application).
 */
import { z } from 'zod';

export const loginUserSchema = z.object({
  identifier: z.string({ message: 'El identificador es obligatorio' })
    .trim()
    .min(1, 'El identificador es obligatorio'),
  password: z.string({ message: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
});

export type LoginUserInput = z.output<typeof loginUserSchema>;
