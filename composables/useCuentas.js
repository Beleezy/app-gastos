// Composable cliente para gestión de cuentas/billeteras.
// El estado es global con useState para que el selector de cuenta en
// formularios (gastos/ingresos) lo reuse sin refetchear.

export function useCuentas() {
  const { apiFetch } = useApiFetch()
  const cuentas = useState('cuentas-lista', () => [])
  const isLoading = useState('cuentas-loading', () => false)
  const fetched = useState('cuentas-fetched', () => false)

  const cuentaPredeterminada = computed(() =>
    cuentas.value.find((c) => c.esPredeterminada) || cuentas.value[0] || null
  )

  const cuentasActivas = computed(() =>
    cuentas.value.filter((c) => !c.archivada)
  )

  const saldoTotal = computed(() =>
    cuentas.value.reduce((s, c) => s + (Number(c.saldoActual) || 0), 0)
  )

  async function fetchCuentas(force = false) {
    if (fetched.value && !force) return cuentas.value
    isLoading.value = true
    try {
      cuentas.value = await apiFetch('/api/cuentas')
      fetched.value = true
    } catch (e) {
      console.warn('[cuentas] fetch falló', e)
      cuentas.value = []
    } finally {
      isLoading.value = false
    }
    return cuentas.value
  }

  async function crearCuenta(payload) {
    const c = await apiFetch('/api/cuentas', { method: 'POST', body: payload })
    cuentas.value = [...cuentas.value, c]
    return c
  }

  async function actualizarCuenta(id, payload) {
    const c = await apiFetch(`/api/cuentas/${id}`, { method: 'PUT', body: payload })
    const idx = cuentas.value.findIndex((x) => x.id === id)
    if (idx >= 0) cuentas.value[idx] = { ...cuentas.value[idx], ...c }
    return c
  }

  async function eliminarCuenta(id) {
    await apiFetch(`/api/cuentas/${id}`, { method: 'DELETE' })
    cuentas.value = cuentas.value.filter((c) => c.id !== id)
  }

  async function crearTransferencia(payload) {
    const t = await apiFetch('/api/cuentas/transferencias', { method: 'POST', body: payload })
    // Saldo recalculado on-demand: refetch para que UI muestre saldo actualizado.
    fetchCuentas(true)
    return t
  }

  return {
    cuentas,
    cuentasActivas,
    cuentaPredeterminada,
    saldoTotal,
    isLoading,
    fetchCuentas,
    crearCuenta,
    actualizarCuenta,
    eliminarCuenta,
    crearTransferencia,
  }
}
