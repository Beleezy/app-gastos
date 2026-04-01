export function useCategorias() {
  const categorias = useState('registro-categorias', () => [])

  function normalizarTexto(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  function getCategoriaColor(nombre) {
    const cat = categorias.value.find(c => normalizarTexto(c.nombre) === normalizarTexto(nombre))
    return cat?.color || '#6b7280'
  }

  function getCategoriaIcono(nombre) {
    const cat = categorias.value.find(c => normalizarTexto(c.nombre) === normalizarTexto(nombre))
    return cat?.icono || '📦'
  }

  function getCategoriaNames() {
    return categorias.value.map(c => c.nombre)
  }

  return { categorias, getCategoriaColor, getCategoriaIcono, getCategoriaNames }
}
