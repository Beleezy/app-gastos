// Textos de las operaciones en lote del registro. Estaban inline en
// `pages/registro.vue` (999 líneas, la mayoría script) y no los cubría
// nada, pese a decidir lo que lee el usuario justo antes de borrar gastos
// de forma permanente.

import { describe, it, expect } from 'vitest'
import { mensajeBulkEliminar, mensajeBulkResultado } from '../composables/useBulkGastos.js'

describe('mensajeBulkEliminar', () => {
  it('singulariza con un solo gasto', () => {
    expect(mensajeBulkEliminar(1)).toContain('1 gasto ')
    expect(mensajeBulkEliminar(1)).not.toContain('1 gastos')
  })

  it('pluraliza a partir de dos', () => {
    expect(mensajeBulkEliminar(2)).toContain('2 gastos')
    expect(mensajeBulkEliminar(17)).toContain('17 gastos')
  })

  it('avisa de que no hay vuelta atrás', () => {
    // El borrado en lote NO pasa por la papelera; el aviso es lo único que
    // se lo dice al usuario.
    expect(mensajeBulkEliminar(3)).toMatch(/permanente/i)
  })

  it('sin cantidad devuelve cadena vacía en vez de "undefined gastos"', () => {
    expect(mensajeBulkEliminar(null)).toBe('')
    expect(mensajeBulkEliminar(undefined)).toBe('')
    expect(mensajeBulkEliminar(0)).toBe('')
  })
})

describe('mensajeBulkResultado', () => {
  it('usa el número que devuelve el servidor, no el que se pidió', () => {
    // Importa: si el servidor filtró alguno (ya borrado, de otro usuario),
    // el toast debe decir lo que REALMENTE pasó.
    expect(mensajeBulkResultado(2, 5, 'eliminados')).toBe('2 gastos eliminados')
  })

  it('cae al número pedido si el servidor no lo informa', () => {
    expect(mensajeBulkResultado(undefined, 5, 'eliminados')).toBe('5 gastos eliminados')
    expect(mensajeBulkResultado(null, 3, 'actualizados')).toBe('3 gastos actualizados')
  })

  it('singulariza', () => {
    expect(mensajeBulkResultado(1, 1, 'eliminados')).toBe('1 gasto eliminado')
    expect(mensajeBulkResultado(1, 1, 'actualizados')).toBe('1 gasto actualizado')
  })

  it('un 0 del servidor se respeta: no cae al pedido', () => {
    // `res.eliminados || ids.length` trataba el 0 como "no informado" y
    // decía "5 gastos eliminados" cuando no se eliminó ninguno.
    expect(mensajeBulkResultado(0, 5, 'eliminados')).toBe('0 gastos eliminados')
  })
})
