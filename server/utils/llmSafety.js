// Helpers de seguridad para entradas y respuestas del LLM.
// Ver §1.4 de planifica.md.

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
// Zero-width + bidi override — vectores frecuentes de obfuscación.
// U+200B-U+200F, U+202A-U+202E, U+2060-U+206F, U+FEFF.
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁯﻿]/g
const PROMPT_BOUNDARY_TAGS =
  /<\/?(system|user|assistant|tool|user_input|instruction|prompt|context|developer)[^>]*>/gi
// Marcadores tipo ChatML / Llama / Anthropic usados como vector de injection.
const ROLE_MARKERS = /<\|(?:im_start|im_end|endoftext|start_header_id|end_header_id|eot_id|system|user|assistant)\|>/gi
// Frases que históricamente disparan jailbreaks. Las neutralizamos
// reemplazándolas por una marca para que el modelo NO las interprete
// como instrucción autoritativa proveniente del system prompt.
const JAILBREAK_PHRASES = [
  /ignore\s+(?:all\s+|the\s+|previous\s+|above\s+|prior\s+)+(?:instructions|prompts|rules|directives)/gi,
  /disregard\s+(?:all\s+|the\s+|previous\s+|above\s+|prior\s+)+(?:instructions|prompts|rules)/gi,
  /forget\s+(?:everything|all\s+previous|the\s+above)/gi,
  /(?:olvida|ignora|descarta)\s+(?:todo\s+lo\s+anterior|las\s+instrucciones|el\s+prompt)/gi,
  /(?:act\s+as|you\s+are\s+now|pretend\s+to\s+be|roleplay\s+as)\s+/gi,
  /(?:actúa|actua|hazte\s+pasar|finge\s+ser|comp[oó]rtate)\s+como\s+/gi,
  /system\s*[:=]\s*"/gi,
  /assistant\s*[:=]\s*"/gi,
  /\bDAN\b|\bjailbreak\b|\bdeveloper\s+mode\b/gi,
  /\bmodo\s+(?:desarrollador|sin\s+restricciones|libre)\b/gi,
]
// Marcadores que algunos parsers downstream interpretan como llamadas a tool.
const TOOL_MARKERS = /(?:\bfunctions?\.[a-z_]+\s*\(|<tool_call>|<tool_response>|<function_call>)/gi
// URLs y esquemas peligrosos en texto libre.
const URL_LIKE = /\b(?:https?:\/\/|data:|javascript:|vbscript:|file:\/\/)\S+/gi

/**
 * Sanitiza un input que se va a enviar al LLM:
 * - normaliza Unicode (NFKC) para que los homoglifos no esquiven los filtros
 * - elimina caracteres de control y zero-width / bidi override
 * - neutraliza intentos de cerrar/abrir bloques de rol del prompt
 * - neutraliza markers ChatML / "<|...|>"
 * - reemplaza frases típicas de prompt injection por placeholder
 * - degrada URLs / data: / javascript: para que no actúen como hipervínculos
 *   ejecutables si la respuesta se renderiza sin sanear
 * - recorta a maxChars y colapsa newlines repetidos
 *
 * No es defensa absoluta — la defensa principal sigue siendo el system
 * prompt que delimita USER_INPUT como dato y un validador estricto de
 * la respuesta del LLM (ver validate*Llm).
 */
export function sanitizeLlmInput(raw, maxChars = 2000) {
  if (typeof raw !== 'string') return ''
  let text = raw
    .normalize('NFKC')
    .replace(CONTROL_CHARS, ' ')
    .replace(INVISIBLE_CHARS, '')
    .replace(ROLE_MARKERS, '[marker-removido]')
    .replace(PROMPT_BOUNDARY_TAGS, '[etiqueta-removida]')
    .replace(TOOL_MARKERS, '[tool-removido]')
    .replace(URL_LIKE, '[url-removida]')
    .replace(/```/g, "'''")
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')

  for (const re of JAILBREAK_PHRASES) {
    text = text.replace(re, '[instrucción-removida] ')
  }

  text = text.trim()

  if (text.length > maxChars) {
    text = text.slice(0, maxChars)
  }
  return text
}

/**
 * Sanitiza valores que se van a inyectar dentro del PROPIO system prompt
 * (no como USER_INPUT). Más estricto que sanitizeLlmInput porque el
 * modelo trata el system prompt como autoridad: si un atacante logra
 * insertar texto ahí (ej. a través de un nombre persistido en DB), el
 * impacto es mayor.
 *
 * Uso típico: nombres de personas, categorías custom, etc., que vienen
 * de DB pero originalmente fueron texto libre del usuario.
 */
export function sanitizeForSystemPrompt(raw, maxChars = 200) {
  if (raw == null) return ''
  let text = String(raw)
    .normalize('NFKC')
    .replace(CONTROL_CHARS, ' ')
    .replace(INVISIBLE_CHARS, '')
    .replace(ROLE_MARKERS, '')
    .replace(PROMPT_BOUNDARY_TAGS, '')
    .replace(TOOL_MARKERS, '')
    .replace(URL_LIKE, '')
    .replace(/```/g, "'''")
    .replace(/[\r\n]+/g, ' ')

  for (const re of JAILBREAK_PHRASES) {
    text = text.replace(re, ' ')
  }
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length > maxChars) text = text.slice(0, maxChars)
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
