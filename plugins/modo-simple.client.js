// Aplica la clase `modo-simple` a <html> antes del primer render si el
// usuario la tenía activa la última vez (ver composables/useModoSimple.js).
// Evita que la app abra "normal" y salte a "simple" cuando llega la
// configuración. No toca nada de Vue: es un classList fuera de la
// hidratación.
export default defineNuxtPlugin(() => {
  try {
    if (localStorage.getItem('ui.modoSimple') === '1') {
      document.documentElement.classList.add('modo-simple')
    }
  } catch {}
})
