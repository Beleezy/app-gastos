export function useDeudas() {
  const personas = ref([])
  const deudas = ref([])
  const isLoading = ref(false)

  async function fetchPersonas(tipo) {
    // TODO: GET /api/deudas/personas?tipo=
  }

  async function createDeuda(data) {
    // TODO: POST /api/deudas
  }

  async function registrarPago(deudaId, data) {
    // TODO: POST /api/deudas/:id/pagos
  }

  return {
    personas,
    deudas,
    isLoading,
    fetchPersonas,
    createDeuda,
    registrarPago,
  }
}
