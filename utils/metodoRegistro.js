const FOTO_TRANSCRIPCION = 'Escaneado desde foto de voucher'

export function resolveMetodoRegistro(gasto = {}) {
  if (gasto.metodoRegistro === 'foto') return 'foto'
  if (gasto.transcripcionVoz === FOTO_TRANSCRIPCION) return 'foto'
  if (gasto.metodoRegistro === 'voz') return 'voz'
  return gasto.metodoRegistro || 'manual'
}

export function getMetodoRegistroBadgeLabel(gasto = {}) {
  if (gasto.gastoPlanificadoId) return 'PLAN'
  const metodo = resolveMetodoRegistro(gasto)
  if (metodo === 'foto') return 'FOTO'
  if (metodo === 'voz') return 'VOZ'
  return ''
}
