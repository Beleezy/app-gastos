import { z } from 'zod'
import { fechaIso, horaHhmm, monto, conceptoSchema, notasSchema, metodoRegistroSchema } from './common.js'

const gastoBaseSchema = z.object({
  concepto: conceptoSchema,
  monto,
  fecha: fechaIso,
  hora: horaHhmm.optional().nullable(),
  categoriaId: z.union([z.string(), z.number()]).nullable().optional(),
  notas: notasSchema,
  metodoRegistro: metodoRegistroSchema.optional().default('manual'),
  gastoPlanificadoId: z.union([z.string(), z.number()]).nullable().optional(),
  transcripcionVoz: z.string().max(2000).optional().nullable(),
})

export const gastoCreateSchema = gastoBaseSchema

export const gastoUpdateSchema = gastoBaseSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

export const gastosBulkCreateSchema = z.object({
  gastos: z.array(gastoCreateSchema).min(1, 'Lista vacía').max(500, 'Máximo 500 gastos por lote'),
  metodoRegistro: metodoRegistroSchema.optional(),
})

export const gastosBulkIdsSchema = z.object({
  ids: z.array(z.union([z.string(), z.number()])).min(1).max(500),
})
