import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema, uuidSchema } from './common.js'

// estado_gasto_planificado enum real de DB (server/database/schema.js:4):
// solo `pendiente | pagado`. El schema legacy en este archivo aceptaba
// más valores; mantenemos el legacy para no romper imports.
export const estadoGastoPlanificadoDbSchema = z.enum(['pendiente', 'pagado'])
export const estadoPlanificadoSchema = z.enum(['pendiente', 'pagado', 'archivado', 'cancelado'])

// Schema de UPDATE para PUT /api/planificador/gastos/[id]. Restringe
// `estado` al enum real, valida monto y bloquea campos no esperados que
// podrían pasar como mass-assignment (planMensualId, googleEventId).
export const gastoPlanificadoUpdateSchema = z
  .object({
    concepto: conceptoSchema,
    montoEstimado: monto,
    categoriaId: z.union([z.string(), z.number()]),
    fechaProbablePago: fechaIso,
    esRecurrente: z.boolean(),
    estado: estadoGastoPlanificadoDbSchema,
    notas: notasSchema,
    // No persistimos esto pero el handler lo lee; lo dejamos en el
    // schema para que el body pase la validación.
    alcanceEdicion: z.enum(['solo', 'futuros']).optional(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

export const planMensualSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2000).max(3000),
  montoPresupuesto: monto.optional(),
})

// Cuerpo de POST /api/planificador/gastos.
//
// Estaba exportado y sin usar mientras el handler leía `readBody` crudo, y
// además describía OTRO endpoint: sus campos eran `planId`, `monto`,
// `fechaProbable`, `recurrente`, cuando el servicio lee `planMensualId`,
// `montoEstimado`, `fechaProbablePago` y `esRecurrente`. Cablearlo tal cual
// habría roto la creación entera — un schema que nadie ejecuta se
// desincroniza en silencio. Reescrito contra lo que manda `usePlanificador`
// y consume `crearGastoPlanificado`.
//
// Los nueve cuerpos del fuzz (incluido `{}`) llegaban al INSERT y salían
// como 500 con la consulta y sus parámetros en el mensaje.
export const gastoPlanificadoSchema = z.object({
  planMensualId: uuidSchema,
  concepto: conceptoSchema,
  montoEstimado: monto,
  // La columna es NOT NULL: sin categoría el INSERT revienta.
  categoriaId: uuidSchema,
  fechaProbablePago: fechaIso,
  esRecurrente: z.boolean().optional().default(false),
  notas: notasSchema,
})

// Cuerpo de PUT /api/planificador (cambiar el presupuesto del mes).
//
// `planMensualSchema` describe la CREACIÓN de un plan (mes + año), no esta
// edición, que llega con el id del plan. El handler no validaba nada: el
// `body.id` iba derecho a un `eq()` contra una columna uuid y
// `String(body.montoPresupuesto)` producía "undefined" para una columna
// NUMERIC, así que un cuerpo vacío bastaba para un 500 con el SQL dentro.
export const presupuestoPlanUpdateSchema = z.object({
  id: uuidSchema,
  montoPresupuesto: monto,
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
