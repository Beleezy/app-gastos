import { z } from 'zod'
import { fechaIso, monto, conceptoSchema, notasSchema, metodoRegistroSchema } from './common.js'

// N4: la API aceptaba `origen: null` (o cualquier string) y la UI lo
// agrupaba en silencio como "Otro". Se restringe al set que muestra la UI y
// null/ausente se normaliza a 'otro' explícito. En el schema de update,
// .partial() envuelve el campo en Optional: si no viene, no se toca (el
// preprocess solo corre para `null` explícito, que sigue dando 'otro').
export const ORIGENES_INGRESO = ['salario', 'freelance', 'inversion', 'regalo', 'reembolso', 'otro']

const origenSchema = z.preprocess((v) => v ?? 'otro', z.enum(ORIGENES_INGRESO))

const ingresoBaseSchema = z.object({
  concepto: conceptoSchema,
  monto,
  fecha: fechaIso,
  origen: origenSchema,
  esRecurrente: z.boolean().optional().default(false),
  metodoRegistro: metodoRegistroSchema.optional().default('manual'),
  notas: notasSchema,
})

export const ingresoCreateSchema = ingresoBaseSchema

// `.partial()` NO neutraliza un `.default()`: ZodDefault se aplica igual
// cuando la clave falta, así que los campos con default reaparecían en el
// body ya parseado. Consecuencias: un PUT parcial arrastraba
// `esRecurrente: false` y pisaba el flag del ingreso, y el `.refine` de
// abajo era inalcanzable porque `{}` nunca quedaba vacío. Se quitan los
// defaults de la variante update — mismo idiom que gastoUpdateSchema.
export const ingresoUpdateSchema = ingresoBaseSchema
  .omit({ esRecurrente: true, metodoRegistro: true })
  .extend({
    esRecurrente: z.boolean().optional(),
    metodoRegistro: metodoRegistroSchema.optional(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')
