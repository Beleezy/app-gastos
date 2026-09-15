// Cuerpo de PUT /api/configuraciones.
//
// El handler copiaba cada campo a mano con `String(...)`/`!!...` y sin
// comprobar nada más: `presupuestoMensualDefault: "abc"` llegaba a una
// columna NUMERIC, `monedaPreferida: "x".repeat(30)` a un varchar(10) y
// `diaInicioCiclo: "x"` a un integer. Los tres salían como 500 con la
// consulta y sus parámetros en el mensaje. Es la pantalla de ajustes: basta
// escribir mal un campo.
//
// Los límites espejan las columnas de `configuraciones` y las opciones que
// ofrece pages/configuraciones.vue.

import { z } from 'zod'

// Las que entiende useCurrency / utils/currencyFormat.js.
export const MONEDAS = ['PEN', 'USD', 'EUR']

// Una zona que este runtime no conoce se guardaba igual; `fechaLocal.js`
// cae a la por defecto al leerla, pero mejor no guardar basura. El
// constructor de Intl lanza RangeError ante una zona inválida — es la
// única comprobación portable entre navegador y servidor.
function zonaHorariaValida(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const configuracionUpdateSchema = z
  .object({
    nombre: z.string().trim().max(100),
    presupuestoMensualDefault: z.coerce
      .number({ error: 'El presupuesto debe ser numérico' })
      .finite()
      .min(0, 'El presupuesto no puede ser negativo')
      .max(100_000_000, 'Presupuesto fuera de rango'),
    monedaPreferida: z.enum(MONEDAS),
    diaInicioCiclo: z.coerce.number().int().min(1).max(31),
    zonaHoraria: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .refine(zonaHorariaValida, 'Zona horaria inválida'),
    locale: z
      .string()
      .trim()
      .max(10)
      .regex(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/, 'Locale inválido'),
    diasPdfSaldadas: z.coerce.number().int().min(1).max(90),
    vistaRegistroDia: z.boolean(),
    vistaRegistroSemana: z.boolean(),
    tamanoLetra: z.enum(['normal', 'grande']),
    modoDaltonico: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')
