// Helpers de seguridad para entradas y respuestas del LLM.
// Ver §1.4 de planifica.md.

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
const PROMPT_BOUNDARY_TAGS = /<\/?(system|user|assistant|tool|user_input)[^>]*>/gi

/**
 * Sanitiza un input que se va a enviar al LLM:
 * - elimina caracteres de control
 * - neutraliza intentos de cerrar/abrir bloques de rol del prompt
 * - recorta a maxChars
 * - colapsa newlines repetidos
 *
 * No es una defensa absoluta contra prompt injection, pero reduce el
 * vector más obvio. La defensa principal sigue siendo el system prompt
 * que instruye a tratar USER_INPUT como dato.
 */
export function sanitizeLlmInput(raw, maxChars = 2000) {
  if (typeof raw !== 'string') return ''
  let text = raw
    .replace(CONTROL_CHARS, ' ')
    .replace(PROMPT_BOUNDARY_TAGS, '[etiqueta-removida]')
    .replace(/```/g, "'''")
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()

  if (text.length > maxChars) {
    text = text.slice(0, maxChars)
  }
  return text
}

/**
 * Coerce a número decimal con 2 decimales positivo. Devuelve null si inválido.
 */
export function coerceMonto(value) {
  const n = parseFloat(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

/**
 * Coerce a string truncado.
 */
export function coerceString(value, maxLen = 200) {
  if (value == null) return ''
  return String(value).slice(0, maxLen).trim()
}

/**
 * Valida una respuesta de gastos del LLM.
 * Espera { gastos: [{concepto, monto, categoria, fecha}] }.
 *
 * Filtra entradas inválidas, recorta strings, valida montos y devuelve
 * el resultado normalizado. No lanza: el caller decide qué hacer si
 * `gastos.length === 0`.
 */
export function validateGastosLlm(parsed, { fechaDefault, categoriasValidas, montoMaximo = 100_000 } = {}) {
  if (!parsed || typeof parsed !== 'object') return { gastos: [] }
  const arr = Array.isArray(parsed.gastos) ? parsed.gastos : []
  const gastos = arr
    .map((g) => {
      if (!g || typeof g !== 'object') return null
      const concepto = coerceString(g.concepto, 50)
      const monto = coerceMonto(g.monto)
      if (!concepto || monto == null) return null
      if (monto > montoMaximo) return null
      let categoria = coerceString(g.categoria, 50) || 'Otros'
      if (categoriasValidas && !categoriasValidas.has(categoria)) {
        categoria = 'Otros'
      }
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(g.fecha) ? g.fecha : fechaDefault
      return { concepto, monto, categoria, fecha }
    })
    .filter(Boolean)
  return { gastos }
}

/**
 * Valida respuesta de deudas/pagos del LLM.
 */
export function validateDeudasLlm(parsed, { fechaDefault, montoMaximo = 100_000 } = {}) {
  if (!parsed || typeof parsed !== 'object') return { deudas: [], pagos: [] }
  const deudas = (Array.isArray(parsed.deudas) ? parsed.deudas : [])
    .map((d) => {
      if (!d || typeof d !== 'object') return null
      const persona = coerceString(d.persona, 100)
      const monto = coerceMonto(d.monto)
      if (!persona || monto == null || monto > montoMaximo) return null
      return {
        persona,
        concepto: coerceString(d.concepto, 50) || 'Deuda no especificada',
        monto,
        tipo: d.tipo === 'yo_debo' ? 'yo_debo' : 'me_deben',
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) ? d.fecha : fechaDefault,
      }
    })
    .filter(Boolean)
  const pagos = (Array.isArray(parsed.pagos) ? parsed.pagos : [])
    .map((p) => {
      if (!p || typeof p !== 'object') return null
      const persona = coerceString(p.persona, 100)
      const monto = coerceMonto(p.monto)
      if (!persona || monto == null || monto > montoMaximo) return null
      return {
        persona,
        monto,
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : fechaDefault,
        notas: p.notas ? coerceString(p.notas, 500) : null,
      }
    })
    .filter(Boolean)
  return { deudas, pagos }
}
