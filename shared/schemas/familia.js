import { z } from 'zod'

export const espacioCreateSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  descripcion: z.string().max(500).optional().nullable(),
  icono: z.string().max(16).optional().nullable(),
  color: z.string().max(16).optional().nullable(),
})
