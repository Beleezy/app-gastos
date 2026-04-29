import { describe, it, expect } from 'vitest'
import { aplicarFiltrosFuturos } from '../composables/useGastosFuturosFiltros.js'

const proyectos = [
  {
    id: 1,
    concepto: 'Laptop nueva',
    tipo: 'tecnología',
    prioridad: 'alta',
    detalles: [
      { id: 11, concepto: 'MacBook Air', estadoDecision: 'pendiente', opciones: [{ nombre: 'M2', precioMin: 1200 }] },
    ],
  },
  {
    id: 2,
    concepto: 'Vacaciones',
    tipo: 'viajes',
    prioridad: 'media',
    detalles: [
      { id: 21, concepto: 'Hotel Cuzco', estadoDecision: 'decidido', opciones: [{ nombre: 'Belmond', precioMin: 800 }] },
    ],
  },
  {
    id: 3,
    concepto: 'Curso',
    tipo: 'educación',
    prioridad: 'baja',
    detalles: [],
  },
]

describe('aplicarFiltrosFuturos', () => {
  it('sin filtros devuelve todos', () => {
    expect(aplicarFiltrosFuturos(proyectos)).toHaveLength(3)
  })

  it('texto en concepto', () => {
    expect(aplicarFiltrosFuturos(proyectos, { texto: 'laptop' })).toHaveLength(1)
  })

  it('texto en opciones (nivel 3)', () => {
    expect(aplicarFiltrosFuturos(proyectos, { texto: 'belmond' })).toHaveLength(1)
  })

  it('prioridad', () => {
    expect(aplicarFiltrosFuturos(proyectos, { prioridad: 'alta' })).toHaveLength(1)
    expect(aplicarFiltrosFuturos(proyectos, { prioridad: 'baja' })).toHaveLength(1)
  })

  it('estadoDecision decididos', () => {
    expect(aplicarFiltrosFuturos(proyectos, { estadoDecision: 'decididos' })).toHaveLength(1)
  })

  it('orden alfabético', () => {
    const r = aplicarFiltrosFuturos(proyectos, {}, 'alfabetico')
    expect(r.map((p) => p.id)).toEqual([3, 1, 2]) // Curso, Laptop, Vacaciones
  })

  it('orden por prioridad', () => {
    const r = aplicarFiltrosFuturos(proyectos, {}, 'prioridad')
    expect(r.map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('orden por precio asc', () => {
    const r = aplicarFiltrosFuturos(proyectos, {}, 'precio')
    expect(r[0].id).toBe(2) // 800
  })
})
