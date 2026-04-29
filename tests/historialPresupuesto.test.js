import { describe, it, expect } from 'vitest'
import { agruparPorDia, agruparPorSemana, inicioSemana, totalEnRango } from '../composables/useHistorialNavigation.js'
import { calcularPresupuesto, mensajePresupuesto } from '../composables/usePresupuestoCalc.js'

describe('agruparPorDia', () => {
  it('agrupa y ordena desc', () => {
    const r = agruparPorDia([
      { fecha: '2026-04-01', monto: 10 },
      { fecha: '2026-04-02', monto: 20 },
      { fecha: '2026-04-01', monto: 5 },
    ])
    expect(r[0].fecha).toBe('2026-04-02')
    expect(r[1].fecha).toBe('2026-04-01')
    expect(r[1].total).toBe(15)
  })
})

describe('inicioSemana', () => {
  it('lunes devuelve el mismo dia', () => {
    expect(inicioSemana('2026-04-27')).toBe('2026-04-27') // 2026-04-27 es lunes
  })
  it('domingo retrocede al lunes anterior', () => {
    expect(inicioSemana('2026-04-26')).toBe('2026-04-20') // domingo → 2026-04-20 lunes
  })
})

describe('agruparPorSemana', () => {
  it('agrupa lunes-domingo', () => {
    const r = agruparPorSemana([
      { fecha: '2026-04-21', monto: 10 }, // martes
      { fecha: '2026-04-26', monto: 5 }, // domingo
      { fecha: '2026-04-27', monto: 20 }, // lunes nueva semana
    ])
    expect(r).toHaveLength(2)
    const semana20 = r.find((s) => s.semana === '2026-04-20')
    expect(semana20.total).toBe(15)
    expect(semana20.hasta).toBe('2026-04-26')
  })
})

describe('totalEnRango', () => {
  it('filtra por desde/hasta', () => {
    const gastos = [
      { fecha: '2026-04-01', monto: 10 },
      { fecha: '2026-04-15', monto: 20 },
      { fecha: '2026-05-01', monto: 30 },
    ]
    const r = totalEnRango(gastos, { desde: '2026-04-01', hasta: '2026-04-30' })
    expect(r.count).toBe(2)
    expect(r.total).toBe(30)
  })
})

describe('calcularPresupuesto', () => {
  it('porcentaje y alerta normal', () => {
    const r = calcularPresupuesto({ presupuesto: 1000, gastado: 200, diasTranscurridos: 5, diasMes: 30 })
    expect(r.porcentaje).toBe(20)
    expect(r.alerta).toBe('normal')
    expect(r.restante).toBe(800)
  })
  it('alerta sobrepaso cuando supera', () => {
    const r = calcularPresupuesto({ presupuesto: 100, gastado: 120, diasTranscurridos: 30, diasMes: 30 })
    expect(r.alerta).toBe('sobrepaso')
  })
  it('alerta cerca al 80%+', () => {
    const r = calcularPresupuesto({ presupuesto: 100, gastado: 85, diasTranscurridos: 25, diasMes: 30 })
    expect(r.alerta).toBe('cerca')
  })
  it('proyeccion detecta sobrepaso al ritmo actual', () => {
    const r = calcularPresupuesto({ presupuesto: 100, gastado: 30, diasTranscurridos: 5, diasMes: 30 })
    expect(r.proyectadoSobrepaso).toBe(true)
    expect(r.proyeccionMes).toBe(180)
  })
})

describe('mensajePresupuesto', () => {
  it('da mensaje específico para sobrepaso', () => {
    const calc = { alerta: 'sobrepaso', restante: -20, porcentaje: 120, proyectadoSobrepaso: true, proyeccionMes: 120 }
    expect(mensajePresupuesto(calc)).toContain('sobrepasado')
  })
  it('proyectado pero aún no sobrepasado', () => {
    const calc = { alerta: 'normal', restante: 50, porcentaje: 50, proyectadoSobrepaso: true, proyeccionMes: 110 }
    expect(mensajePresupuesto(calc)).toContain('proyectarás')
  })
})
