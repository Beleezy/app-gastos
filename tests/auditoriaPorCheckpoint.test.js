// GET /api/deudas/vinculos/checkpoints hacía, por cada checkpoint, una
// query de auditoría y, por cada entrada de auditoría, DOS queries más
// (configuraciones + usuarios) para el nombre del actor. Cinco checkpoints
// con veinte entradas cada uno eran más de doscientos round trips para
// pintar una lista.
//
// `agruparAuditoriaPorCheckpoint` es la parte pura: dadas las entradas de
// TODO el rango traídas de una vez, cuáles caen entre cada checkpoint y el
// siguiente. Es la misma partición que antes se hacía consulta a consulta.

import { describe, it, expect } from 'vitest'
import { agruparAuditoriaPorCheckpoint } from '../server/utils/vinculos.js'

const cp = (id, createdAt) => ({ id, createdAt: new Date(createdAt) })
const entrada = (id, createdAt) => ({ id, createdAt: new Date(createdAt) })

describe('agruparAuditoriaPorCheckpoint', () => {
  it('cada entrada cae en el checkpoint que la precede', () => {
    const checkpoints = [cp('a', '2026-01-01T00:00:00Z'), cp('b', '2026-02-01T00:00:00Z')]
    const entradas = [
      entrada('e1', '2026-01-10T00:00:00Z'),
      entrada('e2', '2026-01-20T00:00:00Z'),
      entrada('e3', '2026-02-05T00:00:00Z'),
    ]
    const grupos = agruparAuditoriaPorCheckpoint(checkpoints, entradas)
    expect(grupos.map((g) => g.map((e) => e.id))).toEqual([['e1', 'e2'], ['e3']])
  })

  it('una entrada en el mismo instante del checkpoint pertenece a ese checkpoint', () => {
    // El query original usaba `gte(createdAt, cp.createdAt)` y `lt(...,
    // siguiente.createdAt)`: inclusivo por abajo, exclusivo por arriba.
    const checkpoints = [cp('a', '2026-01-01T00:00:00Z'), cp('b', '2026-02-01T00:00:00Z')]
    const entradas = [entrada('e1', '2026-01-01T00:00:00Z'), entrada('e2', '2026-02-01T00:00:00Z')]
    const grupos = agruparAuditoriaPorCheckpoint(checkpoints, entradas)
    expect(grupos.map((g) => g.map((e) => e.id))).toEqual([['e1'], ['e2']])
  })

  it('el último checkpoint recibe todo lo posterior', () => {
    const checkpoints = [cp('a', '2026-01-01T00:00:00Z')]
    const entradas = [entrada('e1', '2026-03-01T00:00:00Z'), entrada('e2', '2030-01-01T00:00:00Z')]
    expect(agruparAuditoriaPorCheckpoint(checkpoints, entradas)[0].map((e) => e.id)).toEqual([
      'e1',
      'e2',
    ])
  })

  it('lo anterior al primer checkpoint no se asigna a ninguno', () => {
    const checkpoints = [cp('a', '2026-01-01T00:00:00Z')]
    const entradas = [entrada('e0', '2025-12-31T00:00:00Z')]
    expect(agruparAuditoriaPorCheckpoint(checkpoints, entradas)).toEqual([[]])
  })

  it('sin checkpoints devuelve una lista vacía; sin entradas, un grupo vacío por checkpoint', () => {
    expect(agruparAuditoriaPorCheckpoint([], [entrada('e1', '2026-01-01T00:00:00Z')])).toEqual([])
    expect(
      agruparAuditoriaPorCheckpoint(
        [cp('a', '2026-01-01T00:00:00Z'), cp('b', '2026-02-01T00:00:00Z')],
        [],
      ),
    ).toEqual([[], []])
  })

  it('acepta fechas como string ISO además de Date', () => {
    const checkpoints = [{ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' }]
    const entradas = [{ id: 'e1', createdAt: '2026-01-02T00:00:00.000Z' }]
    expect(agruparAuditoriaPorCheckpoint(checkpoints, entradas)[0]).toHaveLength(1)
  })
})
