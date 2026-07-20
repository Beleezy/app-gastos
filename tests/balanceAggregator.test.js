import { describe, it, expect } from 'vitest'
import { agregarBalance } from '../server/services/deudas.service.js'

describe('agregarBalance', () => {
  it('input vacío', () => {
    const r = agregarBalance([])
    expect(r).toEqual({ totalMeDeben: 0, totalYoDebo: 0, balanceNeto: 0, personas: [] })
  })

  it('agrega correctamente y ordena por |balance| desc', () => {
    const rows = [
      { personaId: 'a', persona: 'Ana', tipoDeuda: 'me_deben', total: 100 },
      { personaId: 'b', persona: 'Beto', tipoDeuda: 'yo_debo', total: 200 },
      { personaId: 'c', persona: 'Cesar', tipoDeuda: 'me_deben', total: 50 },
      { personaId: 'a', persona: 'Ana', tipoDeuda: 'yo_debo', total: 30 },
    ]
    const r = agregarBalance(rows)
    expect(r.totalMeDeben).toBe(150)
    expect(r.totalYoDebo).toBe(230)
    expect(r.balanceNeto).toBe(-80)

    const ana = r.personas.find((p) => p.personaId === 'a')
    expect(ana.meDeben).toBe(100)
    expect(ana.yoDebo).toBe(30)
    expect(ana.balance).toBe(70)

    expect(r.personas[0].personaId).toBe('b') // |200| más alto
  })

  it('redondea a 2 decimales', () => {
    const rows = [{ personaId: 'a', persona: 'A', tipoDeuda: 'me_deben', total: '10.555' }]
    const r = agregarBalance(rows)
    expect(r.totalMeDeben).toBe(10.56)
  })

  it('total inválido se trata como 0', () => {
    const rows = [{ personaId: 'a', persona: 'A', tipoDeuda: 'me_deben', total: 'abc' }]
    const r = agregarBalance(rows)
    expect(r.totalMeDeben).toBe(0)
  })
})
