import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema, metodoRegistroSchema } from './common.js'

const origenSchema = z.string().trim().max(60).optional().nullable()

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
