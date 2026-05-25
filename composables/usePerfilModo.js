// Cómo se cambia entre "Yo" y un perfil de familia:
//  - 'selector': barra/selector global visible en toda la app.
//  - 'familia':  solo se cambia entrando desde la página Familia.
// Configurable en /configuraciones.

import { useLocalStorage } from './useLocalStorage'

export function usePerfilModo() {
  const modo = useLocalStorage('perfil-modo', 'selector')

  function setModo(v) {
    modo.value = v === 'familia' ? 'familia' : 'selector'
  }

  return { modo, setModo }
}
