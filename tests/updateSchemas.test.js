// Invariante de los schemas de update: un body parcial no debe inyectar claves.
//
// `.partial()` NO neutraliza un `.default()`: ZodDefault se aplica igual cuando
// la clave falta, así que el campo reaparece en el body ya parseado. El service
// lo ve como "vino en el body" y pisa el valor guardado — así un PUT que solo
// cambiaba el concepto de un ingreso le borraba el flag `esRecurrente`. De
// paso, el `.refine((v) => Object.keys(v).length > 0)` queda inalcanzable
// porque `{}` nunca sale vacío del parse.
//
// El barrido cubre todo export que siga la convención de nombre *Update*; un
// schema de update con otro nombre (hoy `alcanceCompartidoSchema`) no entra
// aquí y hay que verificarlo a mano.

import { describe, it, expect } from 'vitest'
import * as gastos from '../shared/schemas/gastos.js'
import * as ingresos from '../shared/schemas/ingresos.js'
import * as planificador from '../shared/schemas/planificador.js'
import * as deudas from '../shared/schemas/deudas.js'
import * as categorias from '../shared/schemas/categorias.js'
import * as cuentas from '../shared/schemas/cuentas.js'

const modulos = { gastos, ingresos, planificador, deudas, categorias, cuentas }

const schemasUpdate = Object.entries(modulos).flatMap(([modulo, mod]) =>
  Object.entries(mod)
    .filter(([nombre, valor]) => /Update/.test(nombre) && typeof valor?.safeParse === 'function')
    .map(([nombre, schema]) => ({ id: `${modulo}.${nombre}`, schema })),
)

describe('schemas de update', () => {
  it('el barrido encuentra los schemas esperados', () => {
    // Si un import se cae o se renombra un export, el barrido se vaciaría en
    // silencio y estos tests pasarían sin comprobar nada.
    expect(schemasUpdate.length).toBeGreaterThanOrEqual(10)
  })

  for (const { id, schema } of schemasUpdate) {
    it(`${id}: un body vacío no pasa el refine "Sin cambios"`, () => {
      const r = schema.safeParse({})
      expect(r.success).toBe(false)
    })

    it(`${id}: un body parcial no arrastra claves que no vinieron`, () => {
      // Se prueba con las claves reales de cada schema, de a una: lo que sale
      // del parse debe ser exactamente esa clave, sin defaults de acompañantes.
      const candidatos = {
        concepto: 'X',
        nombre: 'X',
        notas: 'X',
        pausada: true,
        archivada: true,
      }
      for (const [clave, valor] of Object.entries(candidatos)) {
        const r = schema.safeParse({ [clave]: valor })
        if (!r.success) continue
        expect(Object.keys(r.data)).toEqual([clave])
      }
    })
  }
})

describe('ingresoUpdateSchema', () => {
  const { ingresoUpdateSchema, ingresoCreateSchema } = ingresos

  it('no resetea esRecurrente cuando el PUT no lo manda', () => {
    const r = ingresoUpdateSchema.safeParse({ concepto: 'Sueldo editado' })
    expect(r.success).toBe(true)
    expect(r.data).not.toHaveProperty('esRecurrente')
    expect(r.data).not.toHaveProperty('metodoRegistro')
  })

  it('sí aplica esRecurrente cuando el PUT lo manda explícitamente', () => {
    expect(ingresoUpdateSchema.safeParse({ esRecurrente: true }).data.esRecurrente).toBe(true)
    expect(ingresoUpdateSchema.safeParse({ esRecurrente: false }).data.esRecurrente).toBe(false)
  })

  it('`origen: null` explícito sigue normalizando a "otro"', () => {
    expect(ingresoUpdateSchema.safeParse({ origen: null }).data.origen).toBe('otro')
  })

  it('el create conserva sus defaults', () => {
    const r = ingresoCreateSchema.parse({ concepto: 'Sueldo', monto: 10, fecha: '2026-04-28' })
    expect(r.origen).toBe('otro')
    expect(r.esRecurrente).toBe(false)
    expect(r.metodoRegistro).toBe('manual')
  })
})

describe('cuentaUpdateSchema', () => {
  it('no arrastra saldoInicial en un update parcial', () => {
    const r = cuentas.cuentaUpdateSchema.safeParse({ nombre: 'Ahorros' })
    expect(r.success).toBe(true)
    expect(r.data).not.toHaveProperty('saldoInicial')
  })

  it('el create conserva saldoInicial por defecto', () => {
    expect(cuentas.cuentaCreateSchema.parse({ nombre: 'C', tipo: 'efectivo' }).saldoInicial).toBe(0)
  })
})
