// `mesesAnteriores` (utils/constants.js): la lista de meses previos que
// comparten el gráfico de categorías y las comparativas de /registro.
//
// Antes cada componente la construía por su cuenta con el mismo bucle y la
// misma etiqueta «Ago 2026». A 370 px esa etiqueta partía el botón en dos
// líneas, de ahí `labelCorto`: el año solo aparece cuando NO es el que se
// está viendo, que es justo cuando hace falta para no confundir.

import { describe, it, expect } from 'vitest'
import { mesesAnteriores } from '../utils/constants.js'

describe('mesesAnteriores', () => {
  it('empieza en el mes anterior y va hacia atrás', () => {
    const l = mesesAnteriores(9, 2026, 3)
    expect(l.map((m) => m.key)).toEqual(['2026-8', '2026-7', '2026-6'])
    expect(l.map((m) => m.labelCorto)).toEqual(['Ago', 'Jul', 'Jun'])
  })

  it('cruza el cambio de año hacia atrás', () => {
    const l = mesesAnteriores(2, 2026, 3)
    expect(l.map((m) => m.key)).toEqual(['2026-1', '2025-12', '2025-11'])
    expect(l.map((m) => m.mes)).toEqual([1, 12, 11])
    expect(l.map((m) => m.anio)).toEqual([2026, 2025, 2025])
  })

  it('el año solo aparece en la etiqueta corta cuando es otro año', () => {
    const l = mesesAnteriores(2, 2026, 3)
    expect(l[0].labelCorto).toBe('Ene') // mismo año que el que se ve
    expect(l[1].labelCorto).toBe('Dic 2025') // otro año: hay que decirlo
    expect(l[2].labelCorto).toBe('Nov 2025')
  })

  it('la etiqueta larga siempre lleva el año (va en el desplegable)', () => {
    const l = mesesAnteriores(9, 2026, 2)
    expect(l.map((m) => m.label)).toEqual(['Ago 2026', 'Jul 2026'])
  })

  it('devuelve tantos meses como se pidan, 24 por defecto', () => {
    expect(mesesAnteriores(9, 2026)).toHaveLength(24)
    expect(mesesAnteriores(9, 2026, 5)).toHaveLength(5)
    // Dos años completos hacia atrás sin repetir claves.
    const claves = mesesAnteriores(1, 2026).map((m) => m.key)
    expect(new Set(claves).size).toBe(24)
  })

  it('entradas ilegibles devuelven lista vacía en vez de romper', () => {
    expect(mesesAnteriores(undefined, 2026)).toEqual([])
    expect(mesesAnteriores(9, null)).toEqual([])
    expect(mesesAnteriores('x', 'y')).toEqual([])
  })
})
