export function useGastos() {
  const gastos = ref([])
  const isLoading = ref(false)

  async function fetchGastos(fecha) {
    // TODO: GET /api/gastos?fecha=
  }

  async function createGasto(data) {
    // TODO: POST /api/gastos
  }

  async function updateGasto(id, data) {
    // TODO: PUT /api/gastos/:id
  }

  async function deleteGasto(id) {
    // TODO: DELETE /api/gastos/:id
  }

  return {
    gastos,
    isLoading,
    fetchGastos,
    createGasto,
    updateGasto,
    deleteGasto,
  }
}
