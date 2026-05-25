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
  // Control total: registrar este gasto en nombre de un miembro de la familia.
  enNombreDeUsuarioId: z.string().uuid().optional().nullable(),
})

export const gastoCreateSchema = gastoBaseSchema

export const gastoUpdateSchema = gastoBaseSchema
  .omit({ metodoRegistro: true })
  .extend({ metodoRegistro: metodoRegistroSchema.optional() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

export const gastosBulkCreateSchema = z.object({
  gastos: z.array(gastoCreateSchema).min(1, 'Lista vacía').max(500, 'Máximo 500 gastos por lote'),
  metodoRegistro: metodoRegistroSchema.optional(),
})

export const gastosBulkIdsSchema = z.object({
  ids: z.array(z.union([z.string(), z.number()])).min(1).max(500),
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
  image: z.string().min(1, 'Imagen obligatoria').max(8 * 1024 * 1024, 'Imagen demasiado grande'),
})
