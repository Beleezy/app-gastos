import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema } from './common.js'

export const tipoDeudaSchema = z.enum(['me_deben', 'yo_debo'])
// NOTA: este schema histórico no coincide 1:1 con el enum real de DB
// (`persona | organizacion`). Se mantiene para no romper callers que
// envían 'entidad'/'banco'/'otro'. Para validar el campo en el handler
// PUT de personas usamos `tipoPersonaEntidadDbSchema` (coincide con DB).
export const tipoPersonaSchema = z.enum(['persona', 'entidad', 'banco', 'otro'])
export const tipoPersonaEntidadDbSchema = z.enum(['persona', 'organizacion'])

// estado_deuda enum real en DB (server/database/schema.js:8).
export const estadoDeudaSchema = z.enum(['pendiente', 'parcial', 'pagado', 'archivado'])

export const personaEntidadCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre obligatorio').max(150),
  tipo: tipoPersonaSchema.optional().default('persona'),
  telefono: z.string().trim().max(30).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  notas: notasSchema,
})

// Schema de update para el endpoint /api/deudas/personas/[id].put.
// Acepta cambios parciales y restringe `tipo` al enum real de DB.
export const personaEntidadUpdateSchema = z
  .object({
    nombre: z.string().trim().min(1).max(255),
    tipo: tipoPersonaEntidadDbSchema,
    contacto: z.string().trim().max(255).optional().nullable(),
    notas: notasSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

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

// Schema dedicado para PUT /api/deudas/[id]. Acepta los campos que el
// handler realmente persiste: estado (enum DB), fechaCreacion/fechaPago,
// concepto, notas, montoOriginal. NO acepta tipoDeuda/personaEntidadId
// (no se permiten cambios de propietario via PUT).
export const deudaUpdateRealSchema = z
  .object({
    concepto: conceptoSchema,
    montoOriginal: monto,
    fechaCreacion: fechaIso,
    fechaPago: fechaIso.nullable(),
    estado: estadoDeudaSchema,
    notas: notasSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

// Schema legacy genérico — se mantiene exportado para no romper imports
// pero el handler PUT debe usar `deudaUpdateRealSchema`.
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
