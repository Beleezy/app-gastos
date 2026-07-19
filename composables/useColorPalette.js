/**
 * Paleta de colores accesible WCAG AA con helpers de contraste.
 * Ver §3.7 de planifica.md.
 *
 * Centraliza:
 *  - paleta default para gráficos (alta diferenciación + accesible
 *    para daltónicos según ColorBrewer)
 *  - paleta para modo daltónico
 *  - cálculo de luminancia y contraste WCAG
 */

const PALETA_DEFAULT = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
]

const PALETA_DALTONICO = [
  '#0072B2',
  '#009E73',
  '#F0E442',
  '#D55E00',
  '#CC79A7',
  '#56B4E9',
  '#E69F00',
  '#000000',
  '#999999',
  '#0072B2',
]

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const num = parseInt(expanded, 16)
  if (Number.isNaN(num)) return null
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function srgbToLinear(c) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground, background) {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

export function cumpleAA(foreground, background, { large = false } = {}) {
  const ratio = contrastRatio(foreground, background)
  return ratio >= (large ? 3 : 4.5)
}

export function cumpleAAA(foreground, background, { large = false } = {}) {
  const ratio = contrastRatio(foreground, background)
  return ratio >= (large ? 4.5 : 7)
}

/**
 * Devuelve un color de texto (#fff o #000) con buen contraste sobre el fondo dado.
 */
export function textoSobreFondo(hexFondo) {
  return relativeLuminance(hexFondo) > 0.5 ? '#000000' : '#ffffff'
}

export function useColorPalette({ daltonico = false } = {}) {
  const paleta = daltonico ? PALETA_DALTONICO : PALETA_DEFAULT

  function colorParaIndice(idx) {
    if (!Number.isFinite(idx)) return paleta[0]
    return paleta[Math.abs(Math.floor(idx)) % paleta.length]
  }

  function paraNumero(n) {
    return colorParaIndice(n | 0)
  }

  /**
   * Genera un color a partir de un string (categoria, persona, etc).
   * Determinístico: el mismo string siempre devuelve el mismo color.
   */
  function paraTexto(s) {
    if (!s) return paleta[0]
    let hash = 0
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i)
      hash |= 0
    }
    return paleta[Math.abs(hash) % paleta.length]
  }

  return {
    paleta,
    colorParaIndice,
    paraNumero,
    paraTexto,
    textoSobreFondo,
    cumpleAA,
    cumpleAAA,
    contrastRatio,
  }
}
