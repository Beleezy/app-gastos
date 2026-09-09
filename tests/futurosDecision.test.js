// Lógica de decisión y ordenación de `components/futuros/Lista.vue`, que
// con 2006 líneas es el archivo más grande del proyecto y el único módulo
// sin ningún test E2E: todo lo que decidía qué se ve estaba inline y no lo
// cubría nada.
//
// Estas funciones son puras y se extraen a composables/useFuturosDecision.js
// para poder fijarlas antes de tocar la plantilla del componente.

import { describe, it, expect } from 'vitest'
import {
  progresoProyecto,
  proyectoTieneDecididos,
  proyectoCompletamenteDecidido,
  detallesOrdenados,
  decisionBadge,
  prioridadBadge,
  hostDeUrl,
  rangoPrecios,
} from '../composables/useFuturosDecision.js'

const detalle = (over = {}) => ({ id: 1, estadoDecision: null, ...over })

describe('progresoProyecto', () => {
  it('un proyecto sin detalles no tiene progreso ni divide por cero', () => {
    expect(progresoProyecto({ detalles: [] })).toEqual({ total: 0, decididos: 0, porcentaje: 0 })
  })

  it('tolera un proyecto sin la propiedad detalles', () => {
    expect(progresoProyecto({})).toEqual({ total: 0, decididos: 0, porcentaje: 0 })
    expect(progresoProyecto(undefined)).toEqual({ total: 0, decididos: 0, porcentaje: 0 })
  })

  it('cuenta solo los detalles con decisión tomada', () => {
    const p = {
      detalles: [
        detalle({ estadoDecision: 'comprada' }),
        detalle({ estadoDecision: null }),
        detalle({ estadoDecision: 'planificada' }),
        detalle({ estadoDecision: null }),
      ],
    }
    expect(progresoProyecto(p)).toEqual({ total: 4, decididos: 2, porcentaje: 50 })
  })

  it('redondea el porcentaje', () => {
    const p = { detalles: [detalle({ estadoDecision: 'comprada' }), detalle(), detalle()] }
    // 1/3 = 33.33… → 33
    expect(progresoProyecto(p).porcentaje).toBe(33)
  })

  it('todo decidido es 100', () => {
    const p = { detalles: [detalle({ estadoDecision: 'comprada' })] }
    expect(progresoProyecto(p).porcentaje).toBe(100)
  })
})

describe('proyectoTieneDecididos / proyectoCompletamenteDecidido', () => {
  it('un proyecto vacío NO está completamente decidido', () => {
    // Sin este caso, `every` sobre un array vacío devuelve true y un
    // proyecto sin detalles aparecería como terminado.
    expect(proyectoCompletamenteDecidido({ detalles: [] })).toBe(false)
    expect(proyectoTieneDecididos({ detalles: [] })).toBe(false)
  })

  it('con al menos uno decidido, tieneDecididos es true pero completo no', () => {
    const p = { detalles: [detalle({ estadoDecision: 'comprada' }), detalle()] }
    expect(proyectoTieneDecididos(p)).toBe(true)
    expect(proyectoCompletamenteDecidido(p)).toBe(false)
  })

  it('con todos decididos, ambos son true', () => {
    const p = {
      detalles: [
        detalle({ estadoDecision: 'comprada' }),
        detalle({ estadoDecision: 'planificada' }),
      ],
    }
    expect(proyectoTieneDecididos(p)).toBe(true)
    expect(proyectoCompletamenteDecidido(p)).toBe(true)
  })

  it('no revienta sin detalles', () => {
    expect(proyectoTieneDecididos({})).toBe(false)
    expect(proyectoCompletamenteDecidido({})).toBe(false)
  })
})

describe('detallesOrdenados', () => {
  it('prioridad más alta primero', () => {
    const r = detallesOrdenados([
      { id: 'a', prioridad: 1 },
      { id: 'b', prioridad: 3 },
      { id: 'c', prioridad: 2 },
    ])
    expect(r.map((d) => d.id)).toEqual(['b', 'c', 'a'])
  })

  it('a igual prioridad, desempata por `orden` ascendente', () => {
    const r = detallesOrdenados([
      { id: 'a', prioridad: 2, orden: 5 },
      { id: 'b', prioridad: 2, orden: 1 },
    ])
    expect(r.map((d) => d.id)).toEqual(['b', 'a'])
  })

  it('a igual prioridad y orden, desempata por antigüedad', () => {
    const r = detallesOrdenados([
      { id: 'nuevo', prioridad: 1, orden: 0, createdAt: '2026-05-01' },
      { id: 'viejo', prioridad: 1, orden: 0, createdAt: '2026-01-01' },
    ])
    expect(r.map((d) => d.id)).toEqual(['viejo', 'nuevo'])
  })

  it('trata la prioridad y el orden ausentes como 0', () => {
    const r = detallesOrdenados([{ id: 'sin' }, { id: 'con', prioridad: 1 }])
    expect(r.map((d) => d.id)).toEqual(['con', 'sin'])
  })

  it('no muta el array recibido', () => {
    const entrada = [
      { id: 'a', prioridad: 1 },
      { id: 'b', prioridad: 3 },
    ]
    const copia = [...entrada]
    detallesOrdenados(entrada)
    expect(entrada).toEqual(copia)
  })

  it('tolera una lista vacía o ausente', () => {
    expect(detallesOrdenados([])).toEqual([])
    expect(detallesOrdenados(undefined)).toEqual([])
  })
})

describe('decisionBadge', () => {
  it('comprada y planificada tienen etiqueta propia', () => {
    expect(decisionBadge({ estadoDecision: 'comprada' }).label).toBe('Elegida · Comprada')
    expect(decisionBadge({ estadoDecision: 'planificada' }).label).toBe('Elegida · Planificada')
  })

  it('sin decisión no hay badge', () => {
    expect(decisionBadge({ estadoDecision: null })).toBeNull()
    expect(decisionBadge({})).toBeNull()
  })

  it('un estado desconocido no inventa un badge', () => {
    expect(decisionBadge({ estadoDecision: 'algo_nuevo' })).toBeNull()
  })
})

describe('prioridadBadge', () => {
  it.each([
    [3, '● Alta'],
    [2, '● Media'],
    [1, '● Baja'],
  ])('prioridad %i tiene etiqueta propia', (valor, label) => {
    expect(prioridadBadge(valor).label).toBe(label)
  })

  it('prioridad 0 o sin definir no pinta badge', () => {
    expect(prioridadBadge(0)).toBeNull()
    expect(prioridadBadge(null)).toBeNull()
    expect(prioridadBadge(undefined)).toBeNull()
  })

  it('un valor fuera de rango tampoco inventa badge', () => {
    expect(prioridadBadge(9)).toBeNull()
    expect(prioridadBadge('alta')).toBeNull()
  })
})

describe('hostDeUrl', () => {
  it('devuelve el host sin www', () => {
    expect(hostDeUrl('https://www.amazon.com/dp/123')).toBe('amazon.com')
    expect(hostDeUrl('https://tienda.example.pe/p/1')).toBe('tienda.example.pe')
  })

  it('una URL inválida no rompe la fila', () => {
    expect(hostDeUrl('no soy una url')).toBe('Abrir enlace')
    expect(hostDeUrl('')).toBe('Abrir enlace')
    expect(hostDeUrl(null)).toBe('Abrir enlace')
  })
})

describe('rangoPrecios', () => {
  it('con mínimo y máximo distintos devuelve ambos', () => {
    expect(rangoPrecios({ precioMinimo: '100', precioMaximo: '200' })).toEqual({
      min: 100,
      max: 200,
    })
  })

  it('con mínimo y máximo iguales devuelve uno solo', () => {
    expect(rangoPrecios({ precioMinimo: '150', precioMaximo: '150' })).toEqual({
      min: 150,
      max: null,
    })
  })

  it('un 0 cuenta como "sin precio", no como precio cero', () => {
    // El bug que arregla: la UI mostraba "S/ 480 — S/ 0" cuando solo se
    // había rellenado el mínimo.
    expect(rangoPrecios({ precioMinimo: '480', precioMaximo: '0' })).toEqual({
      min: 480,
      max: null,
    })
  })

  it('sin ningún precio devuelve null', () => {
    expect(rangoPrecios({ precioMinimo: '0', precioMaximo: '0' })).toBeNull()
    expect(rangoPrecios({})).toBeNull()
    expect(rangoPrecios(undefined)).toBeNull()
  })

  it('solo máximo también vale', () => {
    expect(rangoPrecios({ precioMaximo: '99' })).toEqual({ min: 99, max: null })
  })
})
