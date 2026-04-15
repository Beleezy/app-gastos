const STORAGE_KEY = 'registro-gastos-favoritos-v1'
const MAX_FAVORITOS = 5
const MIN_FRECUENCIA = 2

// Persistencia en localStorage con { concepto, monto, categoriaId, count, lastUsed }
function leerStorage() {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function escribirStorage(lista) {
  if (!import.meta.client) return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)) } catch { /* ignore */ }
}

function normalizar(texto) {
  return (texto || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function useGastoFavoritos() {
  const favoritos = ref([])

  function cargar() {
    favoritos.value = leerStorage()
  }

  function registrarUso(gasto) {
    const { concepto, monto, categoriaId } = gasto
    if (!concepto || !monto || !categoriaId) return
    const key = `${normalizar(concepto)}__${Number(monto).toFixed(2)}__${categoriaId}`
    const lista = leerStorage()
    const existente = lista.find(f => f.key === key)
    if (existente) {
      existente.count++
      existente.lastUsed = Date.now()
    } else {
      lista.push({
        key, concepto, monto: Number(monto), categoriaId,
        count: 1, lastUsed: Date.now(),
      })
    }
    // Mantener sólo los 30 más recientes en storage
    lista.sort((a, b) => b.lastUsed - a.lastUsed)
    escribirStorage(lista.slice(0, 30))
    favoritos.value = leerStorage()
  }

  function registrarUsoBulk(gastos) {
    gastos.forEach(registrarUso)
  }

  // Top N por frecuencia (count), sólo si aparecen al menos MIN_FRECUENCIA veces
  const topFavoritos = computed(() => {
    return [...favoritos.value]
      .filter(f => f.count >= MIN_FRECUENCIA)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return b.lastUsed - a.lastUsed
      })
      .slice(0, MAX_FAVORITOS)
  })

  function eliminarFavorito(key) {
    const lista = leerStorage().filter(f => f.key !== key)
    escribirStorage(lista)
    favoritos.value = lista
  }

  return { favoritos, topFavoritos, cargar, registrarUso, registrarUsoBulk, eliminarFavorito }
}
