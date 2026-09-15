// Catálogo de modelos de IA (tabla modelos_llm, migración 0036).
//
// Lo mantiene el superadmin desde Configuraciones; los nombres vienen de la
// API de Google ("gemini-2.5-flash") o los escribe a mano.

import { z } from 'zod'

// Un nombre de modelo de Google: minúsculas, dígitos, puntos y guiones.
// Sin "models/" delante (se normaliza en el servidor) y sin espacios.
export const nombreModeloSchema = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .transform((v) => v.replace(/^models\//, ''))
  .pipe(
    z
      .string()
      .min(3, 'Nombre demasiado corto')
      .max(120, 'Nombre demasiado largo')
      .regex(/^[a-z0-9][a-z0-9.-]*$/, 'Solo minúsculas, dígitos, puntos y guiones'),
  )

export const modeloCreateSchema = z.object({
  nombre: nombreModeloSchema,
})

export const modeloUpdateSchema = z
  .object({
    activo: z.boolean(),
    prioridad: z.coerce.number().int().min(0).max(1000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')
