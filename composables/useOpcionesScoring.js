/**
 * Scoring de opciones comparables de un gasto futuro.
 * Ver §5.A punto 5 de planifica.md.
 *
 * Combina precio (más barato = mejor), confiabilidad (rango precio
 * pequeño = más confiable) y opcionalmente prioridad manual.
 *
 * Uso:
 *   const { rankear } = useOpcionesScoring()
 *   const ranked = rankear(opciones)
 *   ranked[0] // mejor opcion
 */

// El API expone precioMinimo/precioMaximo; se aceptan también los alias
// cortos precioMin/precioMax por compatibilidad con callers antiguos.
function precioBase(o) {
  const candidatos = [
    o.precioPromedio,
    o.precioMin ?? o.precioMinimo,
    o.precioMax ?? o.precioMaximo,
  ]
    .map((x) => parseFloat(x))
    .filter((x) => Number.isFinite(x) && x > 0)
  if (candidatos.length === 0) return null
  return candidatos.reduce((a, b) => a + b, 0) / candidatos.length
}

function rangoRelativo(o) {
  const min = parseFloat(o.precioMin ?? o.precioMinimo)
  const max = parseFloat(o.precioMax ?? o.precioMaximo)
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0) return null
  if (max < min) return null
  return (max - min) / min
}

export function rankearOpciones(opciones, opts = {}) {
  if (!Array.isArray(opciones) || opciones.length === 0) return []
  const pesoPrecio = opts.pesoPrecio ?? 0.6
  const pesoConfianza = opts.pesoConfianza ?? 0.25
  const pesoManual = opts.pesoManual ?? 0.15

  const conPrecio = opciones
    .map((o) => ({
      raw: o,
      precio: precioBase(o),
      rango: rangoRelativo(o) ?? 0.5,
      manual: Number.isFinite(parseFloat(o.prioridadManual)) ? parseFloat(o.prioridadManual) : null,
    }))
    .filter((x) => x.precio != null)

  if (conPrecio.length === 0) return []

  const minPrecio = Math.min(...conPrecio.map((x) => x.precio))
  const maxPrecio = Math.max(...conPrecio.map((x) => x.precio))
  const spread = maxPrecio - minPrecio || 1

  return conPrecio
    .map((x) => {
      // Precio: 1.0 al más barato, 0.0 al más caro
      const scorePrecio = 1 - (x.precio - minPrecio) / spread
      // Confianza: rango pequeño es mejor (cap a 0..1)
      const scoreConfianza = Math.max(0, 1 - Math.min(1, x.rango))
      // Manual: 0..1 si fue provisto; default 0.5 (neutro)
      const scoreManual = x.manual != null ? Math.max(0, Math.min(1, x.manual)) : 0.5
      const score =
        scorePrecio * pesoPrecio + scoreConfianza * pesoConfianza + scoreManual * pesoManual
      return {
        ...x.raw,
        _score: Math.round(score * 1000) / 1000,
        _precioBase: Math.round(x.precio * 100) / 100,
      }
    })
    .sort((a, b) => b._score - a._score)
}

export function useOpcionesScoring() {
  return { rankearOpciones }
}
