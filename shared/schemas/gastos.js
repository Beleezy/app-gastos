import { z } from 'zod'
import {
  fechaIso,
  horaHhmm,
  monto,
  conceptoSchema,
  notasSchema,
  metodoRegistroSchema,
} from './common.js'
import { visibilidadGastoSchema } from './compartido.js'

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
  // Módulo Compartido: excepción por gasto sobre las reglas de categoría.
  visibilidad: visibilidadGastoSchema.optional(),
})

export const gastoCreateSchema = gastoBaseSchema

export const gastoUpdateSchema = gastoBaseSchema
  .omit({ metodoRegistro: true })
  .extend({ metodoRegistro: metodoRegistroSchema.optional() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

// Item de /api/gastos/bulk. Deliberadamente MÁS laxo que gastoCreateSchema
// en `concepto`, `fecha` y `hora`: el handler ya aplica un valor por
// defecto para los tres (concepto genérico, fecha/hora local del usuario)
// y el flujo de voz/foto depende de ello — lo que llega ahí lo produce un
// LLM, que a veces omite la fecha pese al prompt. Exigirlos aquí no haría
// el sistema más correcto, convertiría un gasto guardado en un 400.
//
// Lo que sí valida, y antes no validaba nadie porque este endpoint leía
// `readBody` crudo: que el monto sea un número positivo, que la fecha —si
// viene— sea una fecha, y que la lista no exceda 500 items.
const gastoBulkItemSchema = z.object({
  concepto: conceptoSchema.optional(),
  monto: monto,
  fecha: fechaIso.optional().nullable(),
  hora: horaHhmm.optional().nullable(),
  // Obligatoria, a diferencia de `gastoCreateSchema` donde es opcional:
  // `gastos.categoria_id` es NOT NULL en la BD y el handler no le pone
  // ningún valor por defecto. Sin exigirla aquí, un lote sin categoría
  // llegaba al INSERT y salía como 500 del driver — mientras que el POST
  // simple, que sí la comprueba a mano, devolvía un 400 claro.
  categoriaId: z.union([z.string(), z.number()], {
    error: 'La categoría es obligatoria',
  }),
  notas: notasSchema,
  visibilidad: visibilidadGastoSchema.optional(),
})

export const gastosBulkCreateSchema = z.object({
  gastos: z.array(gastoBulkItemSchema).min(1, 'Lista vacía').max(500, 'Máximo 500 gastos por lote'),
  metodoRegistro: metodoRegistroSchema.optional(),
  // El cliente lo manda a nivel raíz (useGastos.createGastosBulk) y el
  // handler lo persiste en cada fila. Sin declararlo aquí, Zod lo
  // eliminaría del body y la transcripción dejaría de guardarse.
  transcripcionVoz: z.string().max(2000).optional().nullable(),
})

// Campos que PUT /api/gastos/bulk admite cambiar en lote. Whitelist
// explícita: el handler ya solo copiaba estos, pero sin validar su tipo,
// así que un `fecha: "el martes"` o un categoriaId no-UUID llegaban a
// Postgres como 500 del driver en vez de 400.
export const gastosBulkUpdateSchema = z.object({
  ids: z
    .array(z.union([z.string(), z.number()]))
    .min(1, 'Lista vacía')
    .max(500, 'Máximo 500 gastos por operación'),
  campos: z
    .object({
      categoriaId: z.union([z.string(), z.number()]).nullable().optional(),
      fecha: fechaIso.optional(),
      hora: horaHhmm.optional().nullable(),
      notas: notasSchema,
      visibilidad: visibilidadGastoSchema.optional(),
    })
    .refine(
      (v) => Object.keys(v).length > 0,
      'No se proporcionaron campos válidos para actualizar',
    ),
})

export const gastosBulkIdsSchema = z.object({
  ids: z
    .array(z.union([z.string(), z.number()]))
    .min(1)
    .max(500),
})

// Body de /api/voz/parse y /api/voz/parse-stream.
// El texto se sanitiza posteriormente con sanitizeLlmInput (ver
// server/utils/llmSafety.js) — este schema solo valida shape y tamaño.
export const vozParseBodySchema = z.object({
  texto: z.string().trim().min(1, 'Texto obligatorio').max(2000, 'Máximo 2000 caracteres'),
  modo: z.enum(['gastos', 'deudas']).optional(),
})

// Body de /api/voz/parse-image. Aceptamos dataURI (data:image/...;base64,...)
// o base64 crudo. Límite de longitud equivale a ~6 MB de imagen binaria.
export const vozParseImageBodySchema = z.object({
  image: z
    .string()
    .min(1, 'Imagen obligatoria')
    .max(8 * 1024 * 1024, 'Imagen demasiado grande'),
})
