// Fecha "de hoy" según el NEGOCIO, no según el reloj del runner.
//
// Las fechas de negocio se miden en la zona horaria del usuario
// (`configuraciones.zona_horaria`, por defecto America/Lima). Los tests las
// calculaban con `new Date()`, que en CI es UTC. Entre las 00:00 y las
// 05:00 UTC —las 19:00 y 24:00 en Lima— las dos fechas NO coinciden: el
// test crea un gasto con fecha de mañana y luego lo busca en el historial,
// que muestra el día de hoy del usuario. No aparece, y el test falla.
//
// No es hipotético ni raro: son cinco horas de cada día en las que toda la
// suite que toca fechas se cae, y el runner de CI arranca a la hora que le
// toque. Cuesta un fallo intermitente que parece flake y no lo es.
//
// El helper pregunta la zona a la API en vez de fijarla: si un usuario de
// prueba cambia de zona, el test sigue de acuerdo con el servidor.

const ZONA_DEFECTO = 'America/Lima'
const cacheZona = new Map()

async function zonaDelUsuario(request) {
  const clave = request
  if (cacheZona.has(clave)) return cacheZona.get(clave)
  let tz = ZONA_DEFECTO
  try {
    const r = await request.get('/api/configuraciones')
    if (r.ok()) tz = (await r.json())?.zonaHoraria || ZONA_DEFECTO
  } catch {
    // Sin configuración accesible, el servidor también cae al default.
  }
  cacheZona.set(clave, tz)
  return tz
}

/** Formatea un Date como YYYY-MM-DD en la zona indicada. */
export function fechaEnZona(date, timeZone) {
  // 'en-CA' da directamente YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * El "hoy" que verá el usuario en la app.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function hoyNegocio(request) {
  return fechaEnZona(new Date(), await zonaDelUsuario(request))
}

/**
 * Como `hoyNegocio`, pero acotado al día 28 para los tests que necesitan
 * que la fecha exista en cualquier mes (duplicar mes, recurrencias).
 */
export async function hoyNegocioSeguro(request) {
  const [a, m, d] = (await hoyNegocio(request)).split('-')
  return `${a}-${m}-${String(Math.min(Number(d), 28)).padStart(2, '0')}`
}
