import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema } from './common.js'

export const tipoDeudaSchema = z.enum(['me_deben', 'yo_debo'])
export const tipoPersonaSchema = z.enum(['persona', 'entidad', 'banco', 'otro'])

export const personaEntidadCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre obligatorio').max(150),
  tipo: tipoPersonaSchema.optional().default('persona'),
  telefono: z.string().trim().max(30).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  notas: notasSchema,
})

const deudaBaseSchema = z.object({
  personaEntidadId: z.union([z.string(), z.number()]).optional().nullable(),
  personaNombre: z.string().trim().max(150).optional(),
  personaTipo: tipoPersonaSchema.optional(),
  tipoDeuda: tipoDeudaSchema,
  concepto: conceptoSchema,
  monto,
  fecha: fechaIso.optional(),
  fechaPago: fechaIso.optional().nullable(),
  fechaVencimiento: fechaIso.optional().nullable(),
  notas: notasSchema,
})

export const deudaCreateSchema = deudaBaseSchema.refine(
  (v) => v.personaEntidadId || (v.personaNombre && v.personaNombre.length > 0),
  {
    message: 'Se requiere personaEntidadId o personaNombre',
    path: ['personaEntidadId'],
  },
)

export const deudaUpdateSchema = deudaBaseSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

export const pagoCreateSchema = z.object({
  deudaId: z.union([z.string(), z.number()]),
  monto,
  fechaPago: fechaIso,
  notas: notasSchema,
})

export const pagoGlobalSchema = z.object({
  personaEntidadId: z.union([z.string(), z.number()]),
  tipoDeuda: tipoDeudaSchema,
  monto,
  fechaPago: fechaIso,
  notas: notasSchema,
  estrategia: z.enum(['fifo', 'lifo', 'manual']).optional().default('fifo'),
  asignaciones: z
    .array(
      z.object({
        deudaId: z.union([z.string(), z.number()]),
        monto,
      }),
    )
    .optional(),
})

export const solicitudVinculoSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  personaEntidadId: z.union([z.string(), z.number()]),
  mensaje: z.string().trim().max(500).optional().nullable(),
})
