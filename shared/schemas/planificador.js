import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema } from './common.js'

export const estadoPlanificadoSchema = z.enum(['pendiente', 'pagado', 'archivado', 'cancelado'])

export const planMensualSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2000).max(3000),
  montoPresupuesto: monto.optional(),
})

export const gastoPlanificadoSchema = z.object({
  planId: z.union([z.string(), z.number()]).optional(),
  concepto: conceptoSchema,
  monto,
  fechaProbable: fechaIso.optional().nullable(),
  categoriaId: z.union([z.string(), z.number()]).optional().nullable(),
  estado: estadoPlanificadoSchema.optional().default('pendiente'),
  recurrente: z.boolean().optional().default(false),
  recurrenteGrupoId: z.union([z.string(), z.number()]).optional().nullable(),
  notas: notasSchema,
})

export const gastoFuturoCreateSchema = z.object({
  tipo: z.string().trim().min(1).max(100),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional().default('media'),
  notas: notasSchema,
})

export const gastoFuturoDetalleSchema = z.object({
  gastoFuturoId: z.union([z.string(), z.number()]),
  concepto: conceptoSchema,
  estadoDecision: z.enum(['pendiente', 'descartado', 'decidido']).optional().default('pendiente'),
  fecha: fechaIso.optional().nullable(),
  notas: notasSchema,
})

export const gastoFuturoOpcionSchema = z.object({
  detalleId: z.union([z.string(), z.number()]),
  nombre: z.string().trim().min(1).max(200),
  precioMin: monto.optional().nullable(),
  precioMax: monto.optional().nullable(),
  precioPromedio: monto.optional().nullable(),
  url: z.string().url('URL inválida').max(2000).optional().nullable(),
  imagenUrl: z.string().url('URL inválida').max(2000).optional().nullable(),
  notas: notasSchema,
})
