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

  const badge = computed(() => novedades.value?.badge || 0)
  const hayConexiones = computed(
    () =>
      compartoCon.value.length + meComparten.value.length + invitacionesRecibidas.value.length > 0,
  )

  async function fetchConexiones() {
    cargando.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/compartido/conexiones')
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

  async function fetchNovedades() {
    try {
      novedades.value = await apiFetch('/api/compartido/novedades')
      return novedades.value
    } catch (e) {
      // El badge no debe romper la navegación si falla.
      console.warn('[compartido] novedades falló:', e)
      return null
    }
  }

  async function invitar({ email, mensaje, nivelDetalle = 'resumen', categorias = [] }) {
    cargando.value = true
    error.value = null
    try {
      const conexion = await apiFetch('/api/compartido/conexiones', {
        method: 'POST',
        body: { email, mensaje, nivelDetalle, categorias },
      })
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
    await Promise.all([fetchConexiones(), fetchNovedades()])
    return r
  }

  async function rechazar(conexionId) {
    const r = await apiFetch(`/api/compartido/conexiones/${conexionId}/rechazar`, {
      method: 'POST',
    })
    await Promise.all([fetchConexiones(), fetchNovedades()])
    return r
  }

  async function guardarAlcance(conexionId, cambios) {
    const r = await apiFetch(`/api/compartido/conexiones/${conexionId}/alcance`, {
      method: 'PUT',
      body: cambios,
    })
    compartoCon.value = compartoCon.value.map((c) => (c.id === conexionId ? { ...c, ...r } : c))
    return r
  }

  async function revocar(conexionId) {
    await apiFetch(`/api/compartido/conexiones/${conexionId}`, { method: 'DELETE' })
    compartoCon.value = compartoCon.value.filter((c) => c.id !== conexionId)
    meComparten.value = meComparten.value.filter((c) => c.id !== conexionId)
    delete vistas.value[conexionId]
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
    return apiFetch('/api/compartido/avisos', { query: { conexionId } })
  }

  async function enviarAviso({ conexionId, tipo = 'aviso', categoriaId, gastoId, mensaje }) {
    const aviso = await apiFetch('/api/compartido/avisos', {
      method: 'POST',
      body: { conexionId, tipo, categoriaId, gastoId, mensaje },
      headers: { 'Idempotency-Key': `aviso-${conexionId}-${Date.now()}` },
    })
    await fetchNovedades()
    return aviso
  }

  async function marcarAvisoLeido(avisoId) {
    await apiFetch(`/api/compartido/avisos/${avisoId}/leido`, { method: 'POST' })
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
