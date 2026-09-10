import { z } from 'zod'
import { notasSchema, uuidSchema } from './common.js'

// Coincide con la columna `color` (varchar 7) en la tabla `categorias`.
// Permite #RGB o #RRGGBB en hex; bloquea texto arbitrario.
const colorHex = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Color hex inválido (#RGB o #RRGGBB)')

const categoriaBase = z.object({
  nombre: z.string().trim().min(1, 'Nombre obligatorio').max(100),
  icono: z.string().trim().min(1).max(50),
  color: colorHex,
})

export const categoriaCreateSchema = categoriaBase

export const categoriaUpdateSchema = categoriaBase
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

const medioAhorroBase = z.object({
  nombre: z.string().trim().min(1).max(80),
  // mediosAhorro.tipo es varchar(40); no es enum en DB pero el frontend
  // usa un conjunto fijo. Limitamos longitud y caracteres para impedir
  // payloads exóticos sin atarse al conjunto que evoluciona.
  tipo: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[\w\- ]+$/, 'Tipo inválido')
    .optional()
    .nullable(),
  icono: z.string().trim().max(16).optional().nullable(),
  color: colorHex.or(z.string().trim().max(16)).optional().nullable(),
  orden: z.number().int().min(0).max(10_000).optional(),
  activo: z.boolean().optional(),
})

export const medioAhorroCreateSchema = medioAhorroBase
export const medioAhorroUpdateSchema = medioAhorroBase
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

const ahorroBase = z.object({
  concepto: z.string().trim().max(200).optional().nullable(),
  monto: z
    .number({ error: 'Monto debe ser numérico' })
    .finite()
    .positive('El monto debe ser mayor a 0')
    .max(10_000_000, 'Monto fuera de rango'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (esperado YYYY-MM-DD)'),
  // uuid, no `string | number`: la columna es uuid y el valor iba derecho
  // al INSERT. Un "abc-123" devolvía un 500 con el SQL crudo en el
  // mensaje. La PROPIEDAD del medio no la puede comprobar el schema —
  // eso es `assertMedioAhorroPropio`.
  medioAhorroId: uuidSchema.optional().nullable(),
  notas: notasSchema,
})

export const ahorroCreateSchema = ahorroBase

export const ahorroUpdateSchema = ahorroBase
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

// Meta de ahorro (PUT /api/ahorros/metas). El handler comprobaba a mano
// `tipo` y `montoObjetivo` pero NO `mes`/`anio`, que iban derechos a un
// `eq()` contra columnas integer: un `mes: "abc"` reventaba la query.
export const metaAhorroSchema = z
  .object({
    tipo: z.enum(['global', 'mensual']),
    montoObjetivo: z
      .number({ error: 'Monto objetivo debe ser numérico' })
      .finite()
      .positive('Monto objetivo debe ser mayor a 0')
      .max(100_000_000, 'Monto fuera de rango'),
    mes: z.number().int().min(1).max(12).optional().nullable(),
    anio: z.number().int().min(2000).max(2100).optional().nullable(),
  })
  .refine((v) => v.tipo !== 'mensual' || (v.mes != null && v.anio != null), {
    message: 'Una meta mensual necesita mes y año',
    path: ['mes'],
  })
