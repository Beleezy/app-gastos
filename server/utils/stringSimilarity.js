// Distancia de Levenshtein y helpers de similitud.
// Ver §5.C punto 5 de planifica.md.

/**
 * Distancia de edición entre dos strings.
 * Implementación de dos filas (O(n*m) tiempo, O(min(n,m)) memoria).
 */
export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const sa = String(a)
  const sb = String(b)
  if (sa.length < sb.length) return levenshtein(sb, sa)

  let prev = new Array(sb.length + 1)
  let cur = new Array(sb.length + 1)
  for (let j = 0; j <= sb.length; j++) prev[j] = j

  for (let i = 1; i <= sa.length; i++) {
    cur[0] = i
    for (let j = 1; j <= sb.length; j++) {
      const cost = sa.charCodeAt(i - 1) === sb.charCodeAt(j - 1) ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[sb.length]
}

/**
 * Normaliza un nombre para comparar: lowercase + trim + sin diacríticos
 * + colapsa espacios.
 */
export function normalizarNombre(s) {
  if (s == null) return ''
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Devuelve la similitud 0..1 (1 = idéntico, 0 = totalmente distinto)
 * con normalización aplicada.
 */
export function similitudNombres(a, b) {
  const na = normalizarNombre(a)
  const nb = normalizarNombre(b)
  if (!na && !nb) return 1
  if (!na || !nb) return 0
  const dist = levenshtein(na, nb)
  const max = Math.max(na.length, nb.length)
  return 1 - dist / max
}

/**
 * Agrupa personas en clusters de potenciales duplicados.
 * @param {Array<{id, nombre}>} personas
 * @param {object} opts
 * @param {number} opts.umbralSimilitud Default 0.85.
 * @param {number} opts.maxDistancia Default 2.
 */
export function clusterizarSugerencias(personas, opts = {}) {
  const umbral = opts.umbralSimilitud ?? 0.85
  const maxDist = opts.maxDistancia ?? 2

  const arr = personas.map((p) => ({ ...p, _norm: normalizarNombre(p.nombre) }))
  const visited = new Set()
  const clusters = []

  for (let i = 0; i < arr.length; i++) {
    if (visited.has(i)) continue
    const cluster = [arr[i]]
    visited.add(i)
    for (let j = i + 1; j < arr.length; j++) {
      if (visited.has(j)) continue
      const dist = levenshtein(arr[i]._norm, arr[j]._norm)
      const max = Math.max(arr[i]._norm.length, arr[j]._norm.length) || 1
      const sim = 1 - dist / max
      if (sim >= umbral || dist <= maxDist) {
        cluster.push(arr[j])
        visited.add(j)
      }
    }
    if (cluster.length > 1) {
      clusters.push(cluster.map(({ _norm, ...rest }) => rest))
    }
  }
  return clusters
}
