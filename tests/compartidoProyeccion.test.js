import { describe, it, expect } from 'vitest'
import {
  calcularProyeccion,
  estadoDesdePorcentaje,
  diasDelMesDesdeFecha,
} from '../shared/compartido/proyeccion.js'

describe('calcularProyeccion — el caso que motiva el módulo', () => {
  // "X destina 600 al mes a comida y a las 2 semanas ya gastó 450"
  const r = calcularProyeccion({
    consumido: 450,
    presupuesto: 600,
    diasTranscurridos: 14,
    diasDelMes: 30,
  })

  it('calcula el ritmo diario y la proyección al cierre', () => {
    expect(r.ritmoDiario).toBeCloseTo(32.14, 2)
    expect(r.proyectado).toBeCloseTo(964.29, 2)
    expect(r.porcentajeProyectado).toBeCloseTo(160.71, 2)
  })

  it('avisa que a este ritmo se pasa antes de fin de mes', () => {
    expect(r.seAgotaAntesDeFin).toBe(true)
    expect(r.diaAgotamiento).toBe(19)
    expect(r.estadoProyectado).toBe('critico')
  })

  it('reparte lo que queda entre los días restantes', () => {
    expect(r.disponible).toBe(150)
    expect(r.diasRestantes).toBe(16)
    expect(r.disponiblePorDia).toBeCloseTo(9.38, 2)
    expect(r.excedido).toBe(false)
  })

  it('el estado actual es alerta con el umbral por defecto', () => {
    expect(r.porcentaje).toBe(75)
    expect(r.estado).toBe('alerta')
  })
})

describe('calcularProyeccion — bordes', () => {
  it('sin días transcurridos no inventa una proyección de cero', () => {
    const r = calcularProyeccion({ consumido: 80, presupuesto: 600, diasTranscurridos: 0 })
    expect(r.ritmoDiario).toBe(0)
    expect(r.proyectado).toBe(80)
    expect(r.diaAgotamiento).toBe(null)
    expect(r.seAgotaAntesDeFin).toBe(false)
  })

  it('sin presupuesto no calcula porcentajes ni miente con un semáforo', () => {
    const r = calcularProyeccion({ consumido: 300, presupuesto: 0, diasTranscurridos: 10 })
    expect(r.tienePresupuesto).toBe(false)
    expect(r.porcentaje).toBe(null)
    expect(r.disponible).toBe(null)
    expect(r.disponiblePorDia).toBe(null)
    expect(r.estado).toBe('sin_presupuesto')
  })

  it('ya excedido: disponible negativo pero nada por día', () => {
    const r = calcularProyeccion({
      consumido: 700,
      presupuesto: 600,
      diasTranscurridos: 20,
      diasDelMes: 30,
    })
    expect(r.excedido).toBe(true)
    expect(r.disponible).toBe(-100)
    expect(r.disponiblePorDia).toBe(0)
    expect(r.estado).toBe('critico')
    expect(r.diaAgotamiento).toBeLessThan(20)
  })

  it('mes completo: no quedan días ni cuota diaria', () => {
    const r = calcularProyeccion({
      consumido: 500,
      presupuesto: 600,
      diasTranscurridos: 30,
      diasDelMes: 30,
    })
    expect(r.diasRestantes).toBe(0)
    expect(r.disponiblePorDia).toBe(null)
    expect(r.proyectado).toBe(500)
  })

  it('recorta días transcurridos que exceden el mes y tolera basura', () => {
    const r = calcularProyeccion({
      consumido: 100,
      presupuesto: 200,
      diasTranscurridos: 99,
      diasDelMes: 28,
    })
    expect(r.diasTranscurridos).toBe(28)
    expect(r.diasRestantes).toBe(0)

    const vacio = calcularProyeccion()
    expect(vacio.consumido).toBe(0)
    expect(vacio.estado).toBe('sin_presupuesto')
    expect(Number.isFinite(vacio.proyectado)).toBe(true)
  })

  it('sin consumo el semáforo está en ok', () => {
    const r = calcularProyeccion({ consumido: 0, presupuesto: 600, diasTranscurridos: 5 })
    expect(r.porcentaje).toBe(0)
    expect(r.estado).toBe('ok')
    expect(r.diaAgotamiento).toBe(null)
  })
})

describe('estadoDesdePorcentaje', () => {
  it('respeta el umbral del observador', () => {
    expect(estadoDesdePorcentaje(50, 75)).toBe('ok')
    expect(estadoDesdePorcentaje(75, 75)).toBe('alerta')
    expect(estadoDesdePorcentaje(99, 75)).toBe('alerta')
    expect(estadoDesdePorcentaje(100, 75)).toBe('critico')
    // Umbral > 100: "avísame solo si se pasa"
    expect(estadoDesdePorcentaje(105, 120)).toBe('critico')
    expect(estadoDesdePorcentaje(null)).toBe('sin_presupuesto')
  })
})

describe('diasDelMesDesdeFecha', () => {
  it('mes en curso: días transcurridos = día de hoy', () => {
    expect(diasDelMesDesdeFecha('2026-09-14', 9, 2026)).toEqual({
      diasDelMes: 30,
      diasTranscurridos: 14,
    })
  })

  it('mes pasado se ve completo', () => {
    expect(diasDelMesDesdeFecha('2026-09-14', 8, 2026)).toEqual({
      diasDelMes: 31,
      diasTranscurridos: 31,
    })
    expect(diasDelMesDesdeFecha('2026-01-05', 12, 2025).diasTranscurridos).toBe(31)
  })

  it('mes futuro aún no transcurrió', () => {
    expect(diasDelMesDesdeFecha('2026-09-14', 10, 2026)).toEqual({
      diasDelMes: 31,
      diasTranscurridos: 0,
    })
    expect(diasDelMesDesdeFecha('2026-12-20', 1, 2027).diasTranscurridos).toBe(0)
  })

  it('febrero bisiesto', () => {
    expect(diasDelMesDesdeFecha('2028-02-10', 2, 2028).diasDelMes).toBe(29)
    expect(diasDelMesDesdeFecha('2026-02-10', 2, 2026).diasDelMes).toBe(28)
  })
})
