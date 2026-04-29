import { describe, it, expect } from 'vitest'
import { MSG, ETIQUETAS, pluralizar } from '../utils/messages.js'

describe('MSG', () => {
  it('claves usadas comunes existen', () => {
    expect(MSG.errores.genericoApi).toBeDefined()
    expect(MSG.errores.rateLimit).toBeDefined()
    expect(MSG.exito.gastoCreado).toBeDefined()
    expect(MSG.confirmar.eliminarGasto).toBeDefined()
    expect(MSG.vacios.sinGastos).toBeDefined()
  })
})

describe('ETIQUETAS', () => {
  it('tiene todos los tipos de deuda', () => {
    expect(ETIQUETAS.tipoDeuda.me_deben).toBe('Me deben')
    expect(ETIQUETAS.tipoDeuda.yo_debo).toBe('Yo debo')
  })
  it('tiene todos los metodos de registro', () => {
    expect(ETIQUETAS.metodoRegistro.voz).toBe('Voz')
    expect(ETIQUETAS.metodoRegistro.foto).toBe('Foto')
    expect(ETIQUETAS.metodoRegistro.manual).toBe('Manual')
  })
})

describe('pluralizar', () => {
  it('singular cuando |n|=1', () => {
    expect(pluralizar(1, 'persona')).toBe('persona')
    expect(pluralizar(-1, 'persona')).toBe('persona')
  })
  it('plural cuando ≠1', () => {
    expect(pluralizar(0, 'persona')).toBe('personas')
    expect(pluralizar(2, 'persona')).toBe('personas')
  })
  it('forma plural personalizada', () => {
    expect(pluralizar(2, 'pez', 'peces')).toBe('peces')
  })
})
