// Mensajes y copy reutilizable.
// Ver §4.8 de planifica.md.
//
// Por ahora solo es una capa de "constantes nombradas" para evitar
// strings hardcodeados duplicados; cuando se introduzca @nuxtjs/i18n
// estos pasan a `locales/es.json` sin tocar callers.

export const MSG = {
  errores: {
    genericoApi: 'Hubo un problema al comunicarse con el servidor.',
    sinRed: 'No hay conexión. Tus cambios se guardarán cuando vuelva la red.',
    sesionExpirada: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    rateLimit: 'Demasiadas peticiones. Espera un momento.',
    cargandoFalla: 'No pudimos cargar la información.',
    montoInvalido: 'Ingresa un monto válido mayor a 0.',
    fechaInvalida: 'La fecha ingresada no es válida.',
  },
  exito: {
    gastoCreado: 'Gasto registrado',
    gastoActualizado: 'Gasto actualizado',
    gastoEliminado: 'Gasto eliminado',
    deudaCreada: 'Deuda registrada',
    pagoRegistrado: 'Pago registrado',
    plantillaGuardada: 'Plantilla guardada',
    plantillaAplicada: 'Plantilla aplicada',
  },
  confirmar: {
    eliminarGasto: '¿Eliminar este gasto?',
    eliminarPersona: '¿Eliminar la persona y todas sus deudas?',
    eliminarPlantilla: '¿Eliminar esta plantilla?',
  },
  vacios: {
    sinGastos: 'Aún no tienes gastos registrados',
    sinDeudas: 'Aún no tienes deudas',
    sinPlantillas: 'Aún no tienes plantillas',
  },
}

export const ETIQUETAS = {
  metodoRegistro: { voz: 'Voz', foto: 'Foto', manual: 'Manual' },
  tipoDeuda: { me_deben: 'Me deben', yo_debo: 'Yo debo' },
  estadoDeuda: {
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    pagado: 'Pagado',
    archivado: 'Archivado',
  },
  prioridadGasto: {
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja',
    sinDefinir: 'Sin definir',
  },
}

export function pluralizar(n, singular, plural) {
  return Math.abs(n) === 1 ? singular : plural || `${singular}s`
}
