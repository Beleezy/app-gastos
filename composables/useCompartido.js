// Módulo Compartido — visibilidad de gastos entre usuarios.
//
// El "Sincronizar" de la UI no sincroniza nada: los dos usuarios están en la
// misma BD, así que refresca. Por eso `fresh` va como query param — sin él
// el navegador devolvería la respuesta cacheada y el botón parecería roto.

import { calcularProyeccion } from '~/shared/compartido/proyeccion.js'

export function useCompartido() {
  const { apiFetch } = useApiFetch()

  const compartoCon = useState('compartido-emitidas', () => [])
  const meComparten = useState('compartido-recibidas', () => [])
  const invitacionesRecibidas = useState('compartido-invitaciones', () => [])
  const novedades = useState('compartido-novedades', () => null)
  const vistas = useState('compartido-vistas', () => ({}))
  const cargando = ref(false)
  const error = ref(null)
  // Epoch del módulo, con el mismo idiom que useGastos: toda mutación lo
  // incrementa y viaja como `_v` en las lecturas.
  //
  // No es un lujo: estos endpoints responden con Cache-Control de 15–60s, así
  // que sin él un refetch hecho justo después de mutar devuelve el estado
  // ANTERIOR desde la caché del navegador. Se veía al pausar una conexión (la
  // tarjeta seguía diciendo "Activo") y al mandar un aviso (no aparecía en el
  // feed, ni siquiera recargando la página).
  const epoch = useState('compartido-epoch', () => 0)
  const bust = () => {
    epoch.value++
  }
  const conV = (query = {}) => (epoch.value ? { ...query, _v: epoch.value } : query)

  const badge = computed(() => novedades.value?.badge || 0)
  const hayConexiones = computed(
    () =>
      compartoCon.value.length + meComparten.value.length + invitacionesRecibidas.value.length > 0,
  )

  async function fetchConexiones() {
    cargando.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/compartido/conexiones', { query: conV() })
      compartoCon.value = data.compartoCon || []
      meComparten.value = data.meComparten || []
      invitacionesRecibidas.value = data.invitacionesRecibidas || []
      return data
    } catch (e) {
      error.value = mensajeError(e)
      throw e
    } finally {
      cargando.value = false
    }
  }

  // Varios sitios piden novedades al montar (badge de navegación, banner de
  // recordatorios, dashboard, y cada tarjeta de conexión al marcar visto).
  // Sin deduplicar, una carga de /compartido dispara media docena de
  // peticiones idénticas, y si el endpoint falla los guardas
  // `if (!novedades.value)` reintentan en cascada. Compartir la promesa en
  // vuelo deja una sola petición por ráfaga.
  const novedadesEnVuelo = useState('compartido-novedades-en-vuelo', () => null)

  async function fetchNovedades() {
    if (novedadesEnVuelo.value) return novedadesEnVuelo.value
    const promesa = apiFetch('/api/compartido/novedades', { query: conV() })
      .then((data) => {
        novedades.value = data
        return data
      })
      .catch((e) => {
        // El badge no debe romper la navegación si falla.
        console.warn('[compartido] novedades falló:', e)
        return null
      })
      .finally(() => {
        novedadesEnVuelo.value = null
      })
    novedadesEnVuelo.value = promesa
    return promesa
  }

  async function invitar({ email, mensaje, nivelDetalle = 'resumen', categorias = [] }) {
    cargando.value = true
    error.value = null
    try {
      const conexion = await apiFetch('/api/compartido/conexiones', {
        method: 'POST',
        body: { email, mensaje, nivelDetalle, categorias },
      })
      bust()
      await fetchConexiones()
      return conexion
    } catch (e) {
      error.value = mensajeError(e)
      throw e
    } finally {
      cargando.value = false
    }
  }

  async function aceptar(conexionId) {
    const r = await apiFetch(`/api/compartido/conexiones/${conexionId}/aceptar`, { method: 'POST' })
    bust()
    await Promise.all([fetchConexiones(), fetchNovedades()])
    return r
  }

  async function rechazar(conexionId) {
    const r = await apiFetch(`/api/compartido/conexiones/${conexionId}/rechazar`, {
      method: 'POST',
    })
    bust()
    await Promise.all([fetchConexiones(), fetchNovedades()])
    return r
  }

  async function guardarAlcance(conexionId, cambios) {
    const r = await apiFetch(`/api/compartido/conexiones/${conexionId}/alcance`, {
      method: 'PUT',
      body: cambios,
    })
    compartoCon.value = compartoCon.value.map((c) => (c.id === conexionId ? { ...c, ...r } : c))
    // Además del estado propio, cambiar el alcance deja eventos de sistema en
    // el feed del receptor.
    bust()
    return r
  }

  async function revocar(conexionId) {
    await apiFetch(`/api/compartido/conexiones/${conexionId}`, { method: 'DELETE' })
    compartoCon.value = compartoCon.value.filter((c) => c.id !== conexionId)
    meComparten.value = meComparten.value.filter((c) => c.id !== conexionId)
    delete vistas.value[conexionId]
    bust()
    await fetchNovedades()
  }

  /**
   * @param {boolean} fresh - true cuando viene del botón Sincronizar: saltea
   *   el Cache-Control para que el usuario vea datos realmente nuevos.
   */
  async function fetchVista(conexionId, { mes, anio, fresh = false } = {}) {
    const query = {}
    if (mes) query.mes = mes
    if (anio) query.anio = anio
    if (fresh) query.fresh = '1'
    if (epoch.value) query._v = epoch.value

    const anterior = vistas.value[conexionId]
    const data = await apiFetch(`/api/compartido/vista/${conexionId}`, { query })
    vistas.value = { ...vistas.value, [conexionId]: data }

    // Cuántos gastos entraron desde la última vez que miramos: es lo que el
    // toast del botón Sincronizar necesita para decir algo útil.
    const nuevos =
      anterior && anterior.mes === data.mes && anterior.anio === data.anio
        ? Math.max(0, contarMovimientos(data) - contarMovimientos(anterior))
        : 0
    return { data, nuevos }
  }

  function contarMovimientos(vista) {
    return (vista?.categorias || []).reduce((a, c) => a + (c.cantidad || 0), 0)
  }

  async function marcarVisto(conexionId) {
    try {
      await apiFetch(`/api/compartido/vista/${conexionId}/visto`, { method: 'POST' })
      await fetchNovedades()
    } catch (e) {
      console.warn('[compartido] marcarVisto falló:', e)
    }
  }

  async function fetchAvisos(conexionId) {
    return apiFetch('/api/compartido/avisos', { query: conV({ conexionId }) })
  }

  async function enviarAviso({ conexionId, tipo = 'aviso', categoriaId, gastoId, mensaje }) {
    const aviso = await apiFetch('/api/compartido/avisos', {
      method: 'POST',
      body: { conexionId, tipo, categoriaId, gastoId, mensaje },
      headers: { 'Idempotency-Key': `aviso-${conexionId}-${Date.now()}` },
    })
    bust()
    await fetchNovedades()
    return aviso
  }

  async function marcarAvisoLeido(avisoId) {
    await apiFetch(`/api/compartido/avisos/${avisoId}/leido`, { method: 'POST' })
    bust()
    await fetchNovedades()
  }

  /** Recalcula la proyección en cliente al cambiar de mes, sin ir al servidor. */
  function proyectar(categoria, { diasTranscurridos, diasDelMes }) {
    if (!categoria?.proyeccion) return null
    return calcularProyeccion({
      consumido: categoria.consumido,
      presupuesto: categoria.proyeccion.presupuesto,
      diasTranscurridos,
      diasDelMes,
      umbral: categoria.umbralAviso ?? 75,
    })
  }

  function mensajeError(e) {
    return e?.data?.message || e?.message || 'Algo salió mal'
  }

  return {
    compartoCon,
    meComparten,
    invitacionesRecibidas,
    novedades,
    vistas,
    cargando,
    error,
    badge,
    hayConexiones,
    epoch,
    fetchConexiones,
    fetchNovedades,
    invitar,
    aceptar,
    rechazar,
    guardarAlcance,
    revocar,
    fetchVista,
    marcarVisto,
    fetchAvisos,
    enviarAviso,
    marcarAvisoLeido,
    proyectar,
  }
}
