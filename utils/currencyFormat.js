/**
 * Helpers puros de formato de moneda y montos.
 * Versión testable (sin Intl.NumberFormat reactivo) que se usa desde
 * server-side para PDFs/Excel y desde tests.
 *
 * Para componentes Vue seguir usando `useCurrency` (que respeta
 * locale + tema).
 */

const CURRENCY_SYMBOLS = {
  PEN: 'S/',
  USD: '$',
  EUR: '€',
  MXN: 'MX$',
  ARS: '$',
  COP: 'COL$',
  CLP: '$',
  BRL: 'R$',
  GBP: '£',
}

export function getSymbol(moneda = 'PEN') {
  return CURRENCY_SYMBOLS[moneda] || moneda
}

/**
 * Formatea un monto con miles y 2 decimales.
 * Es determinístico: NO usa Intl (que depende del runtime locale).
 *
 * @param {number|string} valor
 * @param {object} [opts]
 * @param {string} [opts.moneda='PEN']
 * @param {boolean} [opts.signo=false] mostrar +/- al frente
 * @param {string} [opts.separadorMiles=',']
 * @param {string} [opts.separadorDecimales='.']
 */
export function formatMonto(valor, opts = {}) {
  const {
    moneda = 'PEN',
    signo = false,
    separadorMiles = ',',
    separadorDecimales = '.',
  } = opts

  const n = parseFloat(valor)
  if (!Number.isFinite(n)) return `${getSymbol(moneda)} 0${separadorDecimales}00`

  const abs = Math.abs(n)
  const fixed = abs.toFixed(2)
  const [entero, dec] = fixed.split('.')
  const enteroConMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles)

  const sym = getSymbol(moneda)
  const prefix = signo ? (n >= 0 ? '+' : '-') : (n < 0 ? '-' : '')
  return `${prefix}${sym} ${enteroConMiles}${separadorDecimales}${dec}`
}

/**
 * Parsea un string de monto formateado a número (inverso de formatMonto).
 * Acepta variantes locales (S/, $, espacios, miles con , o .).
 */
export function parseMonto(str) {
  if (typeof str !== 'string') return parseFloat(str)
  // quitar símbolos no numéricos excepto coma, punto y signo
  let limpio = str.replace(/[^0-9,.-]/g, '').trim()
  if (!limpio) return NaN
  // Si tiene coma Y punto: el último separador es el decimal
  const lastComma = limpio.lastIndexOf(',')
  const lastDot = limpio.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // formato es-PE con coma decimal
      limpio = limpio.replace(/\./g, '').replace(',', '.')
    } else {
      limpio = limpio.replace(/,/g, '')
    }
  } else if (lastComma > -1 && lastDot === -1) {
    // solo coma: si hay 2 dígitos después, es decimal, sino es miles
    const partes = limpio.split(',')
    if (partes.length === 2 && partes[1].length === 2) {
      limpio = limpio.replace(',', '.')
    } else {
      limpio = limpio.replace(/,/g, '')
    }
  } else if (lastDot > -1 && lastComma === -1) {
    // solo punto: 2 dígitos finales = decimal, otra cantidad = miles
    const partes = limpio.split('.')
    const ultimo = partes[partes.length - 1]
    if (partes.length > 2 || ultimo.length !== 2) {
      limpio = limpio.replace(/\./g, '')
    }
  }
  return parseFloat(limpio)
}

/**
 * Convierte un monto en su forma "compacta" para UI estrecha (ej. mobile).
 * 1500 → "1.5K", 2_500_000 → "2.5M".
 */
export function formatCompact(valor, opts = {}) {
  const { moneda = 'PEN' } = opts
  const n = parseFloat(valor)
  if (!Number.isFinite(n)) return `${getSymbol(moneda)} 0`
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const sym = getSymbol(moneda)
  if (abs >= 1_000_000) return `${sign}${sym} ${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${sign}${sym} ${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return `${sign}${sym} ${abs.toFixed(2).replace(/\.00$/, '')}`
}
