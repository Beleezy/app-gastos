// `persistGastoFuturoChildren` insertaba cada detalle y, dentro de él,
// cada opción, de una en una: un proyecto de 5 detalles con 4 opciones
// cada uno eran 25 INSERT secuenciales dentro de la transacción. Crear un
// gasto futuro es una operación interactiva, así que ese coste se le nota
// al usuario.
//
// Estas dos funciones puras arman las filas para insertarlas en dos lotes.

import { describe, it, expect } from 'vitest'
import { filasDetalles, filasOpciones } from '../server/utils/gastosFuturos.js'

const opcion = (nombre, over = {}) => ({
  nombre,
  referenciaUrl: null,
  imagenUrl: null,
  precioMinimo: null,
  precioMaximo: null,
  precioPromedio: null,
  notas: null,
  ...over,
})

describe('filasDetalles', () => {
  it('numera el orden por posición, no por lo que traiga el payload', () => {
    const r = filasDetalles('gf-1', [
      { nombre: 'A', notas: null, opciones: [] },
      { nombre: 'B', notas: null, opciones: [] },
      { nombre: 'C', notas: null, opciones: [] },
    ])
    expect(r.map((d) => d.orden)).toEqual([0, 1, 2])
    expect(r.map((d) => d.nombre)).toEqual(['A', 'B', 'C'])
    expect(r.every((d) => d.gastoFuturoId === 'gf-1')).toBe(true)
  })

  it('prioridad ausente es 0, no undefined', () => {
    // La columna es NOT NULL con default, pero mandar undefined explícito
    // en un INSERT múltiple hace que Drizzle emita NULL para esa fila.
    const r = filasDetalles('gf-1', [{ nombre: 'A', notas: null, opciones: [] }])
    expect(r[0].prioridad).toBe(0)
  })

  it('respeta la prioridad cuando viene', () => {
    const r = filasDetalles('gf-1', [{ nombre: 'A', notas: null, prioridad: 3, opciones: [] }])
    expect(r[0].prioridad).toBe(3)
  })

  it('lista vacía no produce filas', () => {
    expect(filasDetalles('gf-1', [])).toEqual([])
    expect(filasDetalles('gf-1', undefined)).toEqual([])
  })
})

describe('filasOpciones', () => {
  const detalles = [
    { nombre: 'A', opciones: [opcion('a1'), opcion('a2')] },
    { nombre: 'B', opciones: [opcion('b1')] },
  ]
  // Lo que devuelve el INSERT de detalles: id por posición.
  const ids = ['id-A', 'id-B']

  it('asocia cada opción al id del detalle de su posición', () => {
    const r = filasOpciones(detalles, ids)
    expect(r.map((o) => [o.detalleId, o.nombre])).toEqual([
      ['id-A', 'a1'],
      ['id-A', 'a2'],
      ['id-B', 'b1'],
    ])
  })

  it('el orden de cada opción es su índice DENTRO de su detalle', () => {
    const r = filasOpciones(detalles, ids)
    expect(r.map((o) => o.orden)).toEqual([0, 1, 0])
  })

  it('convierte los precios a string y deja null cuando no hay', () => {
    const r = filasOpciones(
      [{ opciones: [opcion('x', { precioMinimo: 10, precioMaximo: 20, precioPromedio: 15 })] }],
      ['id-X'],
    )
    expect(r[0].precioMinimo).toBe('10')
    expect(r[0].precioMaximo).toBe('20')
    expect(r[0].precioPromedio).toBe('15')

    const sinPrecio = filasOpciones([{ opciones: [opcion('y')] }], ['id-Y'])
    expect(sinPrecio[0].precioMinimo).toBeNull()
  })

  it('un precio 0 se guarda como "0", no se pierde por ser falsy', () => {
    const r = filasOpciones([{ opciones: [opcion('z', { precioMinimo: 0 })] }], ['id-Z'])
    expect(r[0].precioMinimo).toBe('0')
  })

  it('un detalle sin opciones no aporta filas', () => {
    const r = filasOpciones([{ opciones: [] }, { opciones: [opcion('b1')] }], ['id-A', 'id-B'])
    expect(r).toHaveLength(1)
    expect(r[0].detalleId).toBe('id-B')
  })

  it('sin ids no inventa filas huérfanas', () => {
    expect(filasOpciones(detalles, [])).toEqual([])
  })

  it('tolera entradas vacías', () => {
    expect(filasOpciones([], [])).toEqual([])
    expect(filasOpciones(undefined, undefined)).toEqual([])
  })
})
