// OJO: este archivo describe tablas que NO existen en `schema.js`. Es de
// una funcionalidad que nunca llegó a construirse. No lo cablees a un
// handler dando por hecho que la tabla está: primero la migración.
//
// No lo importa nadie.

import { z } from 'zod'

export const espacioCreateSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  descripcion: z.string().max(500).optional().nullable(),
  icono: z.string().max(16).optional().nullable(),
  color: z.string().max(16).optional().nullable(),
})
