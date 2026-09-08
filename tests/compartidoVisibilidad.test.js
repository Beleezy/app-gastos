import { describe, it, expect } from 'vitest'
import { esGastoVisible, conexionPermiteLectura } from '../shared/compartido/visibilidad.js'

const COMIDA = 'cat-comida'
const TRANSPORTE = 'cat-transporte'
const gasto = (over = {}) => ({ categoriaId: COMIDA, visibilidad: 'auto', ...over })

describe('esGastoVisible — tabla de verdad', () => {
  const compartida = { categoriaIds: [COMIDA], incluirMarcados: true }

  it('categoría compartida + auto → visible', () => {
    expect(esGastoVisible(gasto(), compartida)).toBe(true)
  })

  it('categoría NO compartida + auto → oculto', () => {
    expect(esGastoVisible(gasto({ categoriaId: TRANSPORTE }), compartida)).toBe(false)
  })

  it("'privado' gana sobre su categoría compartida", () => {
    expect(esGastoVisible(gasto({ visibilidad: 'privado' }), compartida)).toBe(false)
  })

  it("'compartido' hace visible un gasto de categoría NO compartida", () => {
    expect(
      esGastoVisible(gasto({ categoriaId: TRANSPORTE, visibilidad: 'compartido' }), compartida),
    ).toBe(true)
  })

  it('...salvo que la conexión no reciba marcados', () => {
    expect(
      esGastoVisible(gasto({ categoriaId: TRANSPORTE, visibilidad: 'compartido' }), {
        categoriaIds: [COMIDA],
        incluirMarcados: false,
      }),
    ).toBe(false)
  })

  it("'privado' gana también sobre incluirMarcados", () => {
    expect(
      esGastoVisible(gasto({ visibilidad: 'privado' }), {
        categoriaIds: [COMIDA],
        incluirMarcados: true,
      }),
    ).toBe(false)
  })

  it('un gasto en la papelera no se comparte', () => {
    expect(esGastoVisible(gasto({ deletedAt: new Date() }), compartida)).toBe(false)
    expect(
      esGastoVisible(gasto({ visibilidad: 'compartido', deletedAt: new Date() }), compartida),
    ).toBe(false)
  })

  it('sin categorías compartidas solo se ven los marcados (modo selección)', () => {
    const soloMarcados = { categoriaIds: [], incluirMarcados: true }
    expect(esGastoVisible(gasto(), soloMarcados)).toBe(false)
    expect(esGastoVisible(gasto({ visibilidad: 'compartido' }), soloMarcados)).toBe(true)
  })

  it('sin categorías y sin marcados no se ve nada', () => {
    const nada = { categoriaIds: [], incluirMarcados: false }
    expect(esGastoVisible(gasto(), nada)).toBe(false)
    expect(esGastoVisible(gasto({ visibilidad: 'compartido' }), nada)).toBe(false)
  })

  it('sin alcance explícito no asume acceso amplio', () => {
    expect(esGastoVisible(gasto(), {})).toBe(false)
    expect(esGastoVisible(gasto())).toBe(false)
    expect(esGastoVisible(null, { categoriaIds: [COMIDA] })).toBe(false)
  })
})

describe('conexionPermiteLectura', () => {
  it('solo una conexión aceptada y sin pausar', () => {
    expect(conexionPermiteLectura({ estado: 'aceptada', pausada: false })).toBe(true)
    expect(conexionPermiteLectura({ estado: 'aceptada', pausada: true })).toBe(false)
    for (const estado of ['pendiente', 'rechazada', 'revocada', 'expirada']) {
      expect(conexionPermiteLectura({ estado, pausada: false })).toBe(false)
    }
    expect(conexionPermiteLectura(null)).toBe(false)
  })
})
