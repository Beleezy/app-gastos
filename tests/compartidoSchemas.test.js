import { describe, it, expect } from 'vitest'
import {
  emailCompartidoSchema,
  umbralAvisoSchema,
  invitacionCompartidoSchema,
  alcanceCompartidoSchema,
  avisoCreateSchema,
  vistaCompartidaQuerySchema,
  tipoAvisoSchema,
  visibilidadGastoSchema,
} from '../shared/schemas/compartido.js'

const UUID = '550e8400-e29b-41d4-a716-446655440000'
const UUID_B = '550e8400-e29b-41d4-a716-446655440001'

describe('emailCompartidoSchema', () => {
  it('normaliza a minúsculas y recorta (CHECK receptor_email = lower(...))', () => {
    expect(emailCompartidoSchema.parse('  Ana@X.COM ')).toBe('ana@x.com')
  })

  it('rechaza emails inválidos', () => {
    expect(emailCompartidoSchema.safeParse('no-es-email').success).toBe(false)
    expect(emailCompartidoSchema.safeParse('').success).toBe(false)
  })
})

describe('umbralAvisoSchema', () => {
  it('acepta el rango del CHECK 1..200', () => {
    expect(umbralAvisoSchema.parse('75')).toBe(75)
    expect(umbralAvisoSchema.parse(1)).toBe(1)
    expect(umbralAvisoSchema.parse(200)).toBe(200)
  })

  it('rechaza fuera de rango o no entero', () => {
    expect(umbralAvisoSchema.safeParse(0).success).toBe(false)
    expect(umbralAvisoSchema.safeParse(201).success).toBe(false)
    expect(umbralAvisoSchema.safeParse(75.5).success).toBe(false)
  })
})

describe('invitacionCompartidoSchema', () => {
  it('default nivelDetalle resumen y categorías vacías', () => {
    const r = invitacionCompartidoSchema.parse({ email: 'b@x.com' })
    expect(r.nivelDetalle).toBe('resumen')
    expect(r.categorias).toEqual([])
  })

  it('aplica umbral por defecto 75 a cada categoría', () => {
    const r = invitacionCompartidoSchema.parse({
      email: 'b@x.com',
      categorias: [{ categoriaId: UUID }],
    })
    expect(r.categorias[0].umbralAviso).toBe(75)
  })

  it('rechaza más de 50 categorías', () => {
    const categorias = Array.from({ length: 51 }, () => ({ categoriaId: UUID }))
    expect(invitacionCompartidoSchema.safeParse({ email: 'b@x.com', categorias }).success).toBe(
      false,
    )
  })
})

describe('alcanceCompartidoSchema', () => {
  it('acepta cambios parciales', () => {
    expect(alcanceCompartidoSchema.safeParse({ pausada: true }).success).toBe(true)
    expect(alcanceCompartidoSchema.safeParse({ nivelDetalle: 'detalle' }).success).toBe(true)
  })

  it('rechaza body vacío', () => {
    expect(alcanceCompartidoSchema.safeParse({}).success).toBe(false)
  })

  it('rechaza nivelDetalle desconocido', () => {
    expect(alcanceCompartidoSchema.safeParse({ nivelDetalle: 'todo' }).success).toBe(false)
  })
})

describe('avisoCreateSchema', () => {
  it('acepta aviso por categoría y por gasto', () => {
    expect(
      avisoCreateSchema.safeParse({ conexionId: UUID, categoriaId: UUID_B, mensaje: 'Ojo' })
        .success,
    ).toBe(true)
    expect(
      avisoCreateSchema.safeParse({ conexionId: UUID, gastoId: UUID_B, mensaje: 'Ojo' }).success,
    ).toBe(true)
  })

  it('rechaza apuntar a categoría Y gasto (espeja el CHECK de DB)', () => {
    const r = avisoCreateSchema.safeParse({
      conexionId: UUID,
      categoriaId: UUID,
      gastoId: UUID_B,
      mensaje: 'Ojo',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza mensaje vacío o de más de 500', () => {
    expect(avisoCreateSchema.safeParse({ conexionId: UUID, mensaje: '   ' }).success).toBe(false)
    expect(
      avisoCreateSchema.safeParse({ conexionId: UUID, mensaje: 'x'.repeat(501) }).success,
    ).toBe(false)
  })

  it('NO deja al cliente fabricar eventos de sistema', () => {
    expect(tipoAvisoSchema.safeParse('sistema').success).toBe(false)
    expect(
      avisoCreateSchema.safeParse({
        conexionId: UUID,
        tipo: 'sistema',
        mensaje: 'Dejó de compartir',
      }).success,
    ).toBe(false)
  })
})

describe('vistaCompartidaQuerySchema', () => {
  it('coerce mes/anio de query string', () => {
    const r = vistaCompartidaQuerySchema.parse({ mes: '9', anio: '2026' })
    expect(r).toMatchObject({ mes: 9, anio: 2026 })
  })

  it('fresh solo es true con 1/true (no con el Boolean() de coerce)', () => {
    expect(vistaCompartidaQuerySchema.parse({ fresh: '1' }).fresh).toBe(true)
    expect(vistaCompartidaQuerySchema.parse({ fresh: '0' }).fresh).toBe(false)
    expect(vistaCompartidaQuerySchema.parse({}).fresh).toBe(false)
    expect(vistaCompartidaQuerySchema.safeParse({ fresh: 'si' }).success).toBe(false)
  })

  it('rechaza mes fuera de rango', () => {
    expect(vistaCompartidaQuerySchema.safeParse({ mes: 13 }).success).toBe(false)
    expect(vistaCompartidaQuerySchema.safeParse({ mes: 0 }).success).toBe(false)
  })
})

describe('visibilidadGastoSchema', () => {
  it('acepta los tres estados del enum de DB', () => {
    for (const v of ['auto', 'compartido', 'privado']) {
      expect(visibilidadGastoSchema.safeParse(v).success).toBe(true)
    }
    expect(visibilidadGastoSchema.safeParse('publico').success).toBe(false)
  })
})
