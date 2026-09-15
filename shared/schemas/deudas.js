import { z } from 'zod'
import {
  fechaIso,
  monto,
  conceptoSchema,
  notasSchema,
  vacioComoAusente,
  cacheBusters,
  uuidSchema,
} from './common.js'

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
  // uuid o nada: un "abc" pasaba el schema y reventaba el SELECT de la
  // persona con un 500 que arrastraba el SQL.
  personaEntidadId: uuidSchema.optional().nullable(),
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
  deudaId: uuidSchema,
  monto,
  fechaPago: fechaIso,
  notas: notasSchema,
})

// Cuerpo de PUT /api/deudas/pagos/[pagoId].
//
// El handler leía `readBody` crudo: sin cuerpo era un TypeError (500),
// `fechaPago: "el martes"` iba derecho a una columna date (500 con el SQL)
// y `monto: "mucho"` pasaba el `parseFloat` como NaN. Lo que manda
// HistorialPagosPersona es `{ fechaPago?, metodoPago: null|string,
// notas: null|string }`; el monto lo edita otro flujo.
export const pagoUpdateSchema = z
  .object({
    monto,
    fechaPago: fechaIso,
    metodoPago: z.string().trim().max(100).nullable(),
    notas: notasSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

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

// Cuerpo de POST /api/deudas/vinculos/solicitar. Existía sin cablear: el
// handler aceptaba "no-es-email" como destinatario (quedaba guardado y la
// invitación no podía llegar a nadie) y un personaEntidadId que no era uuid
// reventaba la consulta. El email se normaliza a minúsculas aquí, que es
// como se compara al aceptar.
export const solicitudVinculoSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
  personaEntidadId: uuidSchema,
  mensaje: z.string().trim().max(500).optional().nullable(),
})

export const desvincularSchema = z.object({
  personaEntidadId: uuidSchema,
})

export const checkpointCreateSchema = z.object({
  personaId: uuidSchema,
  descripcion: z.string().trim().max(500).optional().nullable(),
})

export const checkpointsQuerySchema = z.object({
  personaId: uuidSchema,
  ...cacheBusters,
})

// Query de GET /api/deudas/personas. `tipo` iba crudo a un `eq()` contra el
// enum de Postgres: `?tipo=basura` devolvía un 500 con la consulta dentro.
export const personasListQuerySchema = z.object({
  tipo: vacioComoAusente(tipoDeudaSchema),
  ...cacheBusters,
})

export const mergePersonasSchema = z
  .object({
    destinoId: uuidSchema,
    origenIds: z.array(uuidSchema).min(1, 'origenIds vacío').max(20),
  })
  .refine((v) => !v.origenIds.includes(v.destinoId), {
    message: 'La persona destino no puede estar entre las de origen',
    path: ['origenIds'],
  })

// Query de GET /api/deudas.
//
// `personaId` iba crudo a un `eq()` contra una columna uuid y `estado`/
// `tipo` a un `eq()` contra columnas enum de Postgres: `?personaId=abc` y
// `?estado=basura` devolvían un 500 con la consulta dentro. Los dos enums
// ya existían en este archivo desde que se escribió el módulo.
export const deudasListQuerySchema = z.object({
  personaId: vacioComoAusente(uuidSchema),
  tipo: vacioComoAusente(tipoDeudaSchema),
  estado: vacioComoAusente(estadoDeudaSchema),
  limit: vacioComoAusente(z.coerce.number().int().min(1).max(500)),
  offset: vacioComoAusente(z.coerce.number().int().min(0)),
  ...cacheBusters,
})
