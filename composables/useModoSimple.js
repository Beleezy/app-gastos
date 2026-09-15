// Modo simple (configuraciones.modoSimple, migración 0037).
//
// Una sola fuente de verdad: la configuración del usuario, que ya está en
// `useState('configuraciones')` (useConfiguraciones / prefetch). El
// composable la expone como booleano y pinta la clase `modo-simple` en
// <html>, que es lo que engancha el CSS (controles y letra más grandes) y
// lo que consultan los componentes para ocultar lo avanzado.
//
// La clase se aplica solo en cliente y fuera de Vue (classList), así que no
// entra en la hidratación. Para que no parpadee al abrir la app, el plugin
// modo-simple.client.js la pone antes de montar leyendo localStorage, y
// aquí se mantiene sincronizada con lo que diga el servidor.

const CLAVE_LOCAL = 'ui.modoSimple'

export function useModoSimple() {
  const { config, fetchConfig } = useConfiguraciones()
  const activo = computed(() => !!config.value?.modoSimple)

  if (import.meta.client) {
    // La configuración la trae el prefetch en idle, pero el modo tiene que
    // saberse al montar la navegación: pedirla aquí (cache de 5 min y
    // dedupe de peticiones en vuelo, así da igual cuántos componentes lo
    // llamen). Solo dentro de un componente: fuera no hay ciclo de vida.
    if (getCurrentInstance()) {
      onMounted(() => {
        fetchConfig().catch(() => {})
      })
    }

    watch(
      activo,
      (v) => {
        document.documentElement.classList.toggle('modo-simple', v)
        try {
          localStorage.setItem(CLAVE_LOCAL, v ? '1' : '0')
        } catch {}
      },
      { immediate: true },
    )
  }

  return { activo }
}
