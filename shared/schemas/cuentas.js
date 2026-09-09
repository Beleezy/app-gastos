// OJO: este archivo describe tablas que NO existen en `schema.js`. Es de
// una funcionalidad que nunca llegó a construirse. No lo cablees a un
// handler dando por hecho que la tabla está: primero la migración.
//
// Se conserva porque `tests/updateSchemas.test.js` barre sus schemas *Update*
// para fijar el invariante de `.default()` frente a `.partial()`.

import { z } from 'zod'

const tipoCuenta = z.enum(['efectivo', 'debito', 'credito', 'ahorros', 'inversion', 'otro'])

const cuentaBaseSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre obligatorio').max(80),
  tipo: tipoCuenta,
  moneda: z.string().trim().min(2).max(10).optional(),
  saldoInicial: z.coerce.number().finite().optional().default(0),
  icono: z.string().max(16).optional().nullable(),
  color: z.string().max(16).optional().nullable(),
  orden: z.number().int().optional(),
  archivada: z.boolean().optional(),
  esPredeterminada: z.boolean().optional(),
  notas: z.string().max(500).optional().nullable(),
})

export const cuentaCreateSchema = cuentaBaseSchema

// El `.default(0)` de saldoInicial sobrevive a `.partial()` (ZodDefault se
// aplica igual con la clave ausente), así que un PUT parcial arrastraba
// `saldoInicial: 0` y dejaba el `.refine` inalcanzable. Mismo idiom que
// gastoUpdateSchema / ingresoUpdateSchema.
export const cuentaUpdateSchema = cuentaBaseSchema
  .omit({ saldoInicial: true })
  .extend({ saldoInicial: z.coerce.number().finite().optional() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

export const transferenciaCreateSchema = z.object({
  cuentaOrigenId: z.string().uuid(),
  cuentaDestinoId: z.string().uuid(),
  monto: z.coerce.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  concepto: z.string().trim().max(200).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
})
