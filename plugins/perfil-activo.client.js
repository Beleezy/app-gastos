// Sincroniza el "perfil activo" desde localStorage hacia el estado de Nuxt al
// iniciar en el cliente. Necesario porque el initializer de useState corre en
// SSR (sin localStorage) y el cliente hidrata ese valor (null) sin releer.
// Sin esto, la barra de contexto mostraba "Yo" aunque el perfil sí cambiaba.

export default defineNuxtPlugin(() => {
  const perfilActivoId = useState('perfil-activo-id-state', () => null)
  try {
    const v = localStorage.getItem('perfil-activo-id')
    perfilActivoId.value = v || null
  } catch {
    // sin localStorage
  }
})
