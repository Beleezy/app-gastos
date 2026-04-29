import { describe, it, expect } from 'vitest'
import {
  contrastRatio,
  cumpleAA,
  cumpleAAA,
  relativeLuminance,
  textoSobreFondo,
  useColorPalette,
} from '../composables/useColorPalette.js'

describe('contrastRatio', () => {
  it('blanco vs negro = 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21)
  })
  it('mismo color = 1', () => {
    expect(contrastRatio('#abcdef', '#abcdef')).toBe(1)
  })
})

describe('cumpleAA', () => {
  it('blanco sobre negro pasa', () => {
    expect(cumpleAA('#ffffff', '#000000')).toBe(true)
  })
  it('grises bajos no pasan', () => {
    expect(cumpleAA('#bbbbbb', '#cccccc')).toBe(false)
  })
})

describe('cumpleAAA', () => {
  it('estricto: 4.5 large no pasa AAA', () => {
    expect(cumpleAAA('#777777', '#ffffff')).toBe(false)
    expect(cumpleAAA('#000000', '#ffffff')).toBe(true)
  })
})

describe('relativeLuminance', () => {
  it('rangos sensatos', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })
  it('hex inválido → 0', () => {
    expect(relativeLuminance('not-a-color')).toBe(0)
  })
})

describe('textoSobreFondo', () => {
  it('fondo claro → texto negro', () => {
    expect(textoSobreFondo('#ffffff')).toBe('#000000')
  })
  it('fondo oscuro → texto blanco', () => {
    expect(textoSobreFondo('#000000')).toBe('#ffffff')
  })
})

describe('useColorPalette', () => {
  it('paraTexto es determinístico', () => {
    const { paraTexto } = useColorPalette()
    expect(paraTexto('Comida')).toBe(paraTexto('Comida'))
  })
  it('paraTexto distintos strings dan distintos colores (mayoría)', () => {
    const { paraTexto } = useColorPalette()
    const colores = new Set(['Comida', 'Transporte', 'Otros', 'Salud', 'Vivienda'].map(paraTexto))
    expect(colores.size).toBeGreaterThanOrEqual(2)
  })
  it('daltonico=true cambia la paleta', () => {
    const a = useColorPalette({ daltonico: false })
    const b = useColorPalette({ daltonico: true })
    expect(a.paleta).not.toEqual(b.paleta)
  })
  it('colorParaIndice cicla con módulo', () => {
    const { paleta, colorParaIndice } = useColorPalette()
    expect(colorParaIndice(0)).toBe(paleta[0])
    expect(colorParaIndice(paleta.length)).toBe(paleta[0])
  })
})
