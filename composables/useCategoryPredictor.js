/**
 * Predictor de categoría offline para gastos.
 * Ver §5.B punto 4 de planifica.md.
 *
 * Aprende del histórico del usuario qué categoría usa con más
 * frecuencia para cada concepto. Persiste un mapa
 * `concepto_normalizado -> { categoriaId -> count }` en localStorage
 * para predecir sin red. Útil cuando:
 *  - el usuario está offline y registra un gasto manual.
 *  - se llena el form pero no se quiere ir al LLM.
 *  - se quiere sugerir categoría tras escribir el concepto.
 */

import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'gastos.categoryHints.v1'
const MAX_VARIANTS = 5
const MAX_KEYS = 500
const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con',
  'y', 'o', 'pero', 'mi', 'tu', 'su',
])

function normalizar(s) {
  if (s == null) return ''
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .slice(0, 3)
    .join(' ')
}

export function useCategoryPredictor() {
  const hints = useLocalStorage(STORAGE_KEY, {})

  function aprender(concepto, categoriaId) {
    const key = normalizar(concepto)
    if (!key || !categoriaId) return
    const next = { ...(hints.value || {}) }
    if (!next[key]) next[key] = {}
    next[key][categoriaId] = (next[key][categoriaId] || 0) + 1
    // Cap variantes por concepto
    const entries = Object.entries(next[key]).sort((a, b) => b[1] - a[1])
    if (entries.length > MAX_VARIANTS) {
      next[key] = Object.fromEntries(entries.slice(0, MAX_VARIANTS))
    }
    // Cap total de claves: si crece, droppear las menos usadas
    const claves = Object.keys(next)
    if (claves.length > MAX_KEYS) {
      const ranked = claves
        .map((k) => [k, Object.values(next[k]).reduce((a, b) => a + b, 0)])
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_KEYS)
      const filtered = {}
      for (const [k] of ranked) filtered[k] = next[k]
      hints.value = filtered
      return
    }
    hints.value = next
  }

  function predecir(concepto) {
    const key = normalizar(concepto)
    if (!key) return null
    const all = hints.value || {}

    // Acumula counts entre la clave exacta y todas las que comparten
    // prefijo (en cualquier dirección), para que "Pan" sume a partir
    // de "Pan integral", "Pan panadería", etc.
    const aggregated = {}
    let total = 0
    for (const [k, map] of Object.entries(all)) {
      if (k === key || k.startsWith(key) || key.startsWith(k)) {
        for (const [id, count] of Object.entries(map)) {
          aggregated[id] = (aggregated[id] || 0) + count
          total += count
        }
      }
    }

    if (total === 0) return null

    let bestId = null
    let bestCount = 0
    for (const [id, count] of Object.entries(aggregated)) {
      if (count > bestCount) {
        bestCount = count
        bestId = id
      }
    }
    if (!bestId) return null
    return { categoriaId: bestId, confianza: bestCount / total, observaciones: total }
  }

  function reset() {
    hints.value = {}
  }

  return { aprender, predecir, reset, hints }
}
