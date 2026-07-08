import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema, metodoRegistroSchema } from './common.js'

// N4: la API aceptaba `origen: null` (o cualquier string) y la UI lo
// agrupaba en silencio como "Otro". Se restringe al set que muestra la UI y
// null/ausente se normaliza a 'otro' explícito. En el schema de update,
// .partial() envuelve el campo en Optional: si no viene, no se toca.
export const ORIGENES_INGRESO = ['salario', 'freelance', 'inversion', 'regalo', 'reembolso', 'otro']

const origenSchema = z.preprocess((v) => v ?? 'otro', z.enum(ORIGENES_INGRESO))

const ingresoBaseSchema = z.object({
  concepto: conceptoSchema,
  monto,
  fecha: fechaIso,
  origen: origenSchema,
  esRecurrente: z.boolean().optional().default(false),
  metodoRegistro: metodoRegistroSchema.optional().default('manual'),
  notas: notasSchema,
})

export const ingresoCreateSchema = ingresoBaseSchema

export const ingresoUpdateSchema = ingresoBaseSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')
