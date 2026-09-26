/**
 * Esquema de entrada para el caso de uso de registro.
 * Contrato declarativo del puerto de entrada (capa application).
 * Los transforms normalizan la entrada antes de llegar al usecase.
 */
import { z } from 'zod';

export const registerUserSchema = z.object({
  username: z.string({ message: 'El nombre de usuario es obligatorio' })
    .trim()
    .min(3, 'El nombre de usuario debe tener entre 3 y 50 caracteres')
    .max(50, 'El nombre de usuario debe tener entre 3 y 50 caracteres'),
  email: z.string({ message: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .max(255, 'El email no puede superar 255 caracteres')
    .refine(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'El email no es válido'
    }),
  password: z.string({ message: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener entre 6 y 72 caracteres')
    .max(72, 'La contraseña debe tener entre 6 y 72 caracteres')
});

export type RegisterUserInput = z.output<typeof registerUserSchema>;
