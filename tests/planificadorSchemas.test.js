// Schemas del planificador que existían exportados y sin usar.
//
// `gastoPlanificadoSchema` es el caso interesante: no solo no se ejecutaba,
// es que describía OTRO endpoint. Sus campos eran `planId`, `monto`,
// `fechaProbable`, `recurrente`; el servicio lee `planMensualId`,
// `montoEstimado`, `fechaProbablePago` y `esRecurrente`. Cablearlo tal cual
// habría roto la creación entera — un schema que nadie ejecuta se
// desincroniza en silencio del handler que dice describir.

import { describe, it, expect } from 'vitest'
import {
  gastoPlanificadoSchema,
  presupuestoPlanUpdateSchema,
} from '../shared/schemas/planificador.js'

const UUID = 'ae3c2807-856b-4781-9a62-f6a8977a5b3e'
const OTRO = '048830c1-0d84-4157-a7f5-de3e7043ce62'
const valido = {
  planMensualId: UUID,
  concepto: 'Alquiler',
  montoEstimado: 1200,
  categoriaId: OTRO,
  fechaProbablePago: '2026-09-10',
}

describe('gastoPlanificadoSchema', () => {
  it('acepta el cuerpo que manda usePlanificador', () => {
    expect(gastoPlanificadoSchema.parse(valido)).toMatchObject({
      planMensualId: UUID,
      montoEstimado: 1200,
    })
  })

  it('usa los nombres de campo que lee el servicio, no los del schema viejo', () => {
    // Si alguien restaura los nombres antiguos, esto lo caza.
    const antiguo = {
      planId: UUID,
      concepto: 'x',
      monto: 10,
      fechaProbable: '2026-09-10',
      categoriaId: OTRO,
    }
    expect(gastoPlanificadoSchema.safeParse(antiguo).success).toBe(false)
  })

  it('rechaza un cuerpo vacío', () => {
    // Los nueve cuerpos del fuzz, `{}` incluido, llegaban al INSERT.
    expect(gastoPlanificadoSchema.safeParse({}).success).toBe(false)
  })

  it('exige uuid en planMensualId y categoriaId', () => {
    expect(gastoPlanificadoSchema.safeParse({ ...valido, planMensualId: 'abc' }).success).toBe(
      false,
    )
    expect(gastoPlanificadoSchema.safeParse({ ...valido, categoriaId: 'abc' }).success).toBe(false)
  })

  it('exige categoría: la columna es NOT NULL', () => {
    const { categoriaId: _omitida, ...sinCategoria } = valido
    expect(gastoPlanificadoSchema.safeParse(sinCategoria).success).toBe(false)
    expect(gastoPlanificadoSchema.safeParse({ ...valido, categoriaId: null }).success).toBe(false)
  })

  it('rechaza montos no positivos y no numéricos', () => {
    for (const montoEstimado of [0, -5, 'mucho', null]) {
      expect(gastoPlanificadoSchema.safeParse({ ...valido, montoEstimado }).success).toBe(false)
    }
  })

  it('rechaza fechas que no son YYYY-MM-DD', () => {
    expect(gastoPlanificadoSchema.safeParse({ ...valido, fechaProbablePago: 'no' }).success).toBe(
      false,
    )
  })

  it('esRecurrente por defecto es false', () => {
    expect(gastoPlanificadoSchema.parse(valido).esRecurrente).toBe(false)
  })

  it('descarta campos de mass assignment', () => {
    const parsed = gastoPlanificadoSchema.parse({
      ...valido,
      usuarioId: 'otro',
      recurrenteGrupoId: 'x',
      googleEventId: 'y',
    })
    expect(parsed).not.toHaveProperty('usuarioId')
    expect(parsed).not.toHaveProperty('recurrenteGrupoId')
    expect(parsed).not.toHaveProperty('googleEventId')
  })
})

describe('presupuestoPlanUpdateSchema', () => {
  it('acepta id + monto', () => {
    expect(presupuestoPlanUpdateSchema.parse({ id: UUID, montoPresupuesto: 3000 })).toEqual({
      id: UUID,
      montoPresupuesto: 3000,
    })
  })

  it('rechaza un cuerpo vacío', () => {
    // `String(undefined)` daba la cadena "undefined" para una columna
    // NUMERIC: un `{}` bastaba para un 500 con el SQL en el mensaje.
    expect(presupuestoPlanUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('exige que el id sea uuid: iba derecho a un eq() contra la columna', () => {
    expect(
      presupuestoPlanUpdateSchema.safeParse({ id: 'abc-123', montoPresupuesto: 100 }).success,
    ).toBe(false)
  })

  it('rechaza presupuestos no positivos', () => {
    expect(presupuestoPlanUpdateSchema.safeParse({ id: UUID, montoPresupuesto: 0 }).success).toBe(
      false,
    )
    expect(presupuestoPlanUpdateSchema.safeParse({ id: UUID, montoPresupuesto: -1 }).success).toBe(
      false,
    )
  })
})
