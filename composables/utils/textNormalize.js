// Normaliza texto para búsqueda fuzzy: minúsculas, sin diacríticos,
// trim. Devuelve '' para entradas null/undefined. Patrón usado en al
// menos 7 archivos antes de esta extracción.

const COMBINING_MARKS = /[̀-ͯ]/g

export function normalizar(texto) {
  if (texto == null) return ''
  return String(texto)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
}

export function sinDiacriticos(texto) {
  if (texto == null) return ''
  return String(texto).normalize('NFD').replace(COMBINING_MARKS, '')
}
