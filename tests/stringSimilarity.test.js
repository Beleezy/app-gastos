import { describe, it, expect } from 'vitest'
import {
  levenshtein,
  normalizarNombre,
  similitudNombres,
  clusterizarSugerencias,
} from '../server/utils/stringSimilarity.js'

describe('levenshtein', () => {
  it('strings idénticos → 0', () => {
    expect(levenshtein('abc', 'abc')).toBe(0)
  })
  it('inserción', () => {
    expect(levenshtein('abc', 'abcd')).toBe(1)
  })
  it('sustitución', () => {
    expect(levenshtein('cat', 'bat')).toBe(1)
  })
  it('strings vacíos', () => {
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
  })
})

describe('normalizarNombre', () => {
  it('quita diacríticos y baja a minúsculas', () => {
    expect(normalizarNombre('  José  Pérez ')).toBe('jose perez')
  })
  it('null/undefined → string vacío', () => {
    expect(normalizarNombre(null)).toBe('')
    expect(normalizarNombre(undefined)).toBe('')
  })
})

describe('similitudNombres', () => {
  it('idénticos → 1', () => {
    expect(similitudNombres('Juan', 'Juan')).toBe(1)
  })
  it('detecta variantes con tilde', () => {
    expect(similitudNombres('José', 'Jose')).toBe(1)
  })
  it('totalmente distintos → cercano a 0', () => {
    expect(similitudNombres('xxxx', 'yyyy')).toBeLessThan(0.5)
  })
})

describe('clusterizarSugerencias', () => {
  it('agrupa nombres similares', () => {
    const personas = [
      { id: 1, nombre: 'Juan Pérez' },
      { id: 2, nombre: 'Juan Perez' },
      { id: 3, nombre: 'Ana Lopez' },
      { id: 4, nombre: 'Ana López' },
      { id: 5, nombre: 'Carlos Único' },
    ]
    const clusters = clusterizarSugerencias(personas)
    expect(clusters).toHaveLength(2)
    expect(clusters[0]).toHaveLength(2)
    expect(clusters[0].map((p) => p.id).sort()).toEqual([1, 2])
    expect(clusters[1].map((p) => p.id).sort()).toEqual([3, 4])
  })

  it('no agrupa si son distintos', () => {
    const personas = [
      { id: 1, nombre: 'Juan' },
      { id: 2, nombre: 'Pedro' },
      { id: 3, nombre: 'María' },
    ]
    expect(clusterizarSugerencias(personas)).toHaveLength(0)
  })
})
