export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// MESES[0] = 'Enero', índices 0-11
// Para uso con mes numérico (1-12): MESES[mes - 1]
// Para uso con Date.getMonth() (0-11): MESES[d.getMonth()]

export function getInitials(nombre) {
  return nombre
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
