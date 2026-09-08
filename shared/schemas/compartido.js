// Schemas Zod del módulo Compartido — visibilidad de gastos entre usuarios.
//
// Se usan en servidor (validateBody) y en cliente (useFormField). Los
// nombres y rangos espejan los CHECK de la migración 0033: si acá se
// afloja un límite sin tocar la DB, el error deja de ser un 400 legible y
// pasa a ser un 500 de Postgres.

import { z } from 'zod'
import { uuidSchema } from './common.js'

export const nivelDetalleSchema = z.enum(['resumen', 'detalle'])

export const estadoConexionCompartidoSchema = z.enum([
  'pendiente',
  'aceptada',
  'rechazada',
  'revocada',
  'expirada',
])

// SIN 'sistema' a propósito: los eventos de sistema los escribe el servidor
// al cambiar el alcance o pausar. Si el cliente pudiera enviarlos, podría
// fabricar un "dejó de compartir Comida" que el otro leería como oficial.
export const tipoAvisoSchema = z.enum(['aviso', 'pregunta', 'ok'])

export const visibilidadGastoSchema = z.enum(['auto', 'compartido', 'privado'])

// Normalizado a minúsculas para casar con el CHECK receptor_email =
// lower(receptor_email) y con el índice único de conexión activa.
export const emailCompartidoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email inválido')
  .max(254)

// CHECK umbral_aviso BETWEEN 1 AND 200. Admite >100 para "avísame solo si
// se pasa del presupuesto".
export const umbralAvisoSchema = z.coerce.number().int().min(1).max(200)

// Una conexión con muchas categorías deja de ser "compartir un rubro" y
// pasa a ser "compartir todo"; el tope corta también el abuso del endpoint.
const categoriasCompartidasSchema = z
  .array(
    z.object({
      categoriaId: uuidSchema,
      umbralAviso: umbralAvisoSchema.optional().default(75),
    }),
  )
  .max(50, 'Máximo 50 categorías por conexión')

export const invitacionCompartidoSchema = z.object({
  email: emailCompartidoSchema,
  mensaje: z.string().trim().max(500).optional().nullable(),
  nivelDetalle: nivelDetalleSchema.optional().default('resumen'),
  categorias: categoriasCompartidasSchema.optional().default([]),
})

// PUT del alcance: `categorias` reemplaza el conjunto completo (idempotente
// y sin endpoints de add/remove por fila).
export const alcanceCompartidoSchema = z
  .object({
    nivelDetalle: nivelDetalleSchema,
    incluirMarcados: z.boolean(),
    pausada: z.boolean(),
    categorias: categoriasCompartidasSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

// Un aviso apunta a una categoría O a un gasto, nunca a ambos (espeja el
// CHECK compartido_avisos_objetivo_chk).
export const avisoCreateSchema = z
  .object({
    conexionId: uuidSchema,
    tipo: tipoAvisoSchema.optional().default('aviso'),
    categoriaId: uuidSchema.optional().nullable(),
    gastoId: uuidSchema.optional().nullable(),
    mensaje: z.string().trim().min(1, 'Mensaje obligatorio').max(500),
  })
  .refine((v) => !(v.categoriaId && v.gastoId), {
    message: 'Un aviso apunta a una categoría o a un gasto, no a ambos',
    path: ['gastoId'],
  })

export const vistaCompartidaQuerySchema = z.object({
  mes: z.coerce.number().int().min(1).max(12).optional(),
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  // El botón "Sincronizar" saltea el Cache-Control de la vista. Explícito y
  // no z.coerce.boolean(): Boolean('0') es true, así que ?fresh=0 acabaría
  // pidiendo datos frescos.
  fresh: z
    .union([z.boolean(), z.enum(['0', '1', 'true', 'false'])])
    .optional()
    .transform((v) => v === true || v === '1' || v === 'true'),
})
