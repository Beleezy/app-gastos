import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema } from './common.js'

export const tipoDeudaSchema = z.enum(['me_deben', 'yo_debo'])
// El enum real de DB es `persona | organizacion`. El front envía esos dos
// valores; los históricos 'entidad'/'banco'/'otro' se siguen aceptando pero
// se normalizan al enum de DB (antes 'organizacion' se rechazaba con 400 y
// 'entidad'/'banco'/'otro' pasaban la validación para luego reventar en el
// INSERT contra el pgEnum). Para el PUT de personas se usa
// `tipoPersonaEntidadDbSchema` (sin valores legacy).
export const tipoPersonaSchema = z
  .enum(['persona', 'organizacion', 'entidad', 'banco', 'otro'])
  .transform((v) => (v === 'persona' || v === 'otro' ? 'persona' : 'organizacion'))
export const tipoPersonaEntidadDbSchema = z.enum(['persona', 'organizacion'])

// estado_deuda enum real en DB (server/database/schema.js:8).
export const estadoDeudaSchema = z.enum(['pendiente', 'parcial', 'pagado', 'archivado'])

// El campo de contacto de `personas_entidades` es UNO solo (`contacto`,
// varchar 255): este schema declaraba `telefono` y `email`, que no existen
// en la tabla ni los manda nadie. Con Zod eliminando las claves que no
// declara, cablearlo tal cual habría borrado el contacto en vez de
// validarlo. Se alinea con `personaEntidadUpdateSchema`, que sí lo tenía
// bien.
export const personaEntidadCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre obligatorio').max(255),
  tipo: tipoPersonaSchema.optional().default('persona'),
  contacto: z.string().trim().max(255).optional().nullable(),
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

// Cuerpo de POST /api/deudas/personas/[id]/pago-global.
//
// La versión anterior de este schema describía un endpoint que no existe:
// pedía `personaEntidadId` y `tipoDeuda` en el cuerpo (la persona viene de
// la RUTA) y exigía `fechaPago` cuando el cliente manda `fecha` y el
// servidor la rellena si falta. Cablearlo tal cual habría rechazado todas
// las peticiones legítimas.
//
// El reparto entre deudas lo decide el servidor con
// `priorizarDeudasParaPago`; no hay `estrategia` ni `asignaciones` en la
// API real.
export const pagoGlobalSchema = z.object({
  monto,
  fecha: fechaIso.optional().nullable(),
  metodoPago: z.string().trim().max(50).optional().nullable(),
  notas: notasSchema,
})

export const solicitudVinculoSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  personaEntidadId: z.union([z.string(), z.number()]),
  mensaje: z.string().trim().max(500).optional().nullable(),
})
