export function recordatorioToMinutes({ tipo, hora }) {
  if (tipo === 'mismo_dia') return 0
  const [hStr, mStr] = (hora || '00:00').split(':')
  const h = parseInt(hStr, 10) || 0
  const m = parseInt(mStr, 10) || 0
  const horasAntes = { dia_anterior: 24, dos_dias_antes: 48, una_semana_antes: 168 }
  const baseHoras = horasAntes[tipo]
  if (!baseHoras) return 0
  return (baseHoras - h) * 60 - m
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatMonto(n) {
  return Number(n).toFixed(2)
}

export function buildEvent({
  gasto,
  gastoReal = null,
  moneda = 'S/',
  recordatorios = [],
  appUrl = '',
}) {
  const monto = formatMonto(gasto.montoEstimado)
  const tituloBase = `${moneda} ${monto} · ${gasto.concepto}`
  const fechaEvento = gasto.fechaProbablePago
  const endDate = addDays(fechaEvento, 1) // all-day: end = start + 1 día

  const isPagado = gasto.estado === 'pagado' && gastoReal
  const summary = isPagado ? `✅ PAGADO · ${tituloBase}` : tituloBase

  const descPartes = []
  if (isPagado) {
    descPartes.push(
      `✅ Pagado el ${gastoReal.fecha} · Monto real: ${moneda} ${formatMonto(gastoReal.monto)}`,
    )
  } else {
    descPartes.push(`Pendiente · ${moneda} ${monto}`)
  }
  if (gasto.categoriaNombre) descPartes.push(`Categoría: ${gasto.categoriaNombre}`)
  if (gasto.notas) descPartes.push('', gasto.notas)
  if (appUrl) {
    descPartes.push('')
    if (isPagado) {
      descPartes.push(`Abrir en Mis Finanzas: ${appUrl}/registro?gasto=${gastoReal.id}`)
    } else {
      descPartes.push(`Abrir en Mis Finanzas: ${appUrl}/planificador?gasto=${gasto.id}`)
    }
  }

  const event = {
    summary,
    description: descPartes.join('\n'),
    start: { date: fechaEvento },
    end: { date: endDate },
    reminders: isPagado
      ? { useDefault: false, overrides: [] }
      : {
          useDefault: false,
          overrides: recordatorios.map((r) => ({
            method: 'popup',
            minutes: recordatorioToMinutes(r),
          })),
        },
  }

  if (isPagado) {
    event.colorId = '2' // Sage (verde) en paleta de Google Calendar
  }

  return event
}
