// Reportes mensuales por módulo (Registro, Planificador, Ahorro, Deudas) para
// el perfil activo. Exporta a PDF o Excel y permite compartir por WhatsApp
// (Web Share API con archivo adjunto; fallback a wa.me + descarga).

export const MODULOS_REPORTE = [
  { valor: 'registro', label: 'Registro (gastos)' },
  { valor: 'planificador', label: 'Planificador' },
  { valor: 'ahorro', label: 'Ahorro' },
  { valor: 'deudas', label: 'Deudas' },
]

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function useReportes() {
  const { apiFetch } = useApiFetch()
  const { currencySymbol, formatMonto } = useCurrency()
  const { nombrePerfilActivo } = usePerfiles()

  const fmt = (n) => `${currencySymbol.value} ${formatMonto(Number(n) || 0)}`

  async function construir(modulo, mes, anio) {
    const periodo = `${MESES[mes - 1] || ''} ${anio}`
    const perfil = nombrePerfilActivo.value

    if (modulo === 'registro') {
      const data = await apiFetch('/api/gastos', { params: { mes, anio, limit: 2000, orden: 'fecha' } })
      const filas = Array.isArray(data) ? data : []
      const total = filas.reduce((s, g) => s + (Number(g.monto) || 0), 0)
      return {
        titulo: `Gastos de ${perfil}`,
        subtitulo: periodo,
        columnas: [
          { label: 'Fecha', getValue: (f) => f.fecha || '' },
          { label: 'Concepto', getValue: (f) => f.concepto || '' },
          { label: 'Categoría', getValue: (f) => f.categoriaNombre || '' },
          { label: 'Monto', getValue: (f) => fmt(f.monto) },
        ],
        filas,
        totalLabel: 'Total gastado',
        total: fmt(total),
        vacioMsg: 'Sin gastos en el mes.',
      }
    }

    if (modulo === 'planificador') {
      const data = await apiFetch('/api/planificador', { params: { mes, anio } })
      const filas = Array.isArray(data?.gastos) ? data.gastos : []
      const total = filas.reduce((s, g) => s + (Number(g.montoEstimado) || 0), 0)
      const presupuesto = Number(data?.plan?.montoPresupuesto) || 0
      return {
        titulo: `Planificador de ${perfil}`,
        subtitulo: `${periodo}  ·  Presupuesto: ${fmt(presupuesto)}`,
        columnas: [
          { label: 'Concepto', getValue: (f) => f.concepto || '' },
          { label: 'Categoría', getValue: (f) => f.categoriaNombre || '' },
          { label: 'Estimado', getValue: (f) => fmt(f.montoEstimado) },
          { label: 'Estado', getValue: (f) => (f.estado === 'pagado' ? 'Pagado' : 'Pendiente') },
        ],
        filas,
        totalLabel: 'Total planificado',
        total: fmt(total),
        vacioMsg: 'Sin gastos planificados en el mes.',
      }
    }

    if (modulo === 'ahorro') {
      const data = await apiFetch('/api/ahorros', { params: { mes, anio } })
      const filas = Array.isArray(data?.ahorros) ? data.ahorros : []
      const total = data?.totalMes != null
        ? Number(data.totalMes)
        : filas.reduce((s, a) => s + (Number(a.monto) || 0), 0)
      return {
        titulo: `Ahorros de ${perfil}`,
        subtitulo: periodo,
        columnas: [
          { label: 'Fecha', getValue: (f) => f.fecha || '' },
          { label: 'Medio', getValue: (f) => f.medioNombre || f.medio || '' },
          { label: 'Concepto', getValue: (f) => f.concepto || f.nota || '' },
          { label: 'Monto', getValue: (f) => fmt(f.monto) },
        ],
        filas,
        totalLabel: 'Total ahorrado',
        total: fmt(total),
        vacioMsg: 'Sin aportes de ahorro en el mes.',
      }
    }

    // deudas (snapshot del estado actual; no depende del mes)
    const data = await apiFetch('/api/deudas')
    const filas = (Array.isArray(data) ? data : []).filter(
      (d) => d.estado === 'pendiente' || d.estado === 'parcial',
    )
    const total = filas.reduce((s, d) => s + (Number(d.montoPendiente) || 0), 0)
    return {
      titulo: `Deudas de ${perfil}`,
      subtitulo: `Estado al ${new Date().toLocaleDateString('es-PE')}`,
      columnas: [
        { label: 'Persona', getValue: (f) => f.personaNombre || '' },
        { label: 'Concepto', getValue: (f) => f.concepto || '' },
        { label: 'Tipo', getValue: (f) => (f.tipoDeuda === 'me_deben' ? 'Me deben' : 'Yo debo') },
        { label: 'Pendiente', getValue: (f) => fmt(f.montoPendiente) },
      ],
      filas,
      totalLabel: 'Total pendiente',
      total: fmt(total),
      vacioMsg: 'Sin deudas pendientes.',
    }
  }

  async function blobPdf(rep) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()
    const marginX = 14
    const usable = pageW - marginX * 2
    let y = 18

    doc.setFontSize(15)
    doc.setFont(undefined, 'bold')
    doc.text(rep.titulo, marginX, y)
    y += 7
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(110)
    doc.text(rep.subtitulo, marginX, y)
    doc.setTextColor(0)
    y += 8

    const cols = rep.columnas
    const colW = usable / cols.length
    const xAt = (i) => marginX + colW * i

    const header = () => {
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      cols.forEach((c, i) => doc.text(String(c.label), xAt(i), y))
      y += 2
      doc.setDrawColor(200)
      doc.line(marginX, y, pageW - marginX, y)
      y += 4
      doc.setFont(undefined, 'normal')
    }

    const trunc = (s, max) => (s.length > max ? s.slice(0, max - 1) + '…' : s)
    const maxChars = Math.max(8, Math.floor(colW / 1.9))

    header()
    if (!rep.filas.length) {
      doc.setTextColor(120)
      doc.text(rep.vacioMsg, marginX, y)
      doc.setTextColor(0)
      y += 6
    }
    for (const fila of rep.filas) {
      if (y > 280) {
        doc.addPage()
        y = 18
        header()
      }
      cols.forEach((c, i) => {
        doc.text(trunc(String(c.getValue(fila) ?? ''), maxChars), xAt(i), y)
      })
      y += 6
    }

    y += 2
    doc.setDrawColor(200)
    doc.line(marginX, y, pageW - marginX, y)
    y += 6
    doc.setFont(undefined, 'bold')
    doc.text(`${rep.totalLabel}: ${rep.total}`, marginX, y)

    return doc.output('blob')
  }

  async function blobExcel(rep) {
    const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Reporte')
    ws.addRow([rep.titulo])
    ws.addRow([rep.subtitulo])
    ws.addRow([])
    ws.addRow(rep.columnas.map((c) => c.label))
    for (const fila of rep.filas) {
      ws.addRow(rep.columnas.map((c) => c.getValue(fila) ?? ''))
    }
    ws.addRow([])
    ws.addRow([rep.totalLabel, rep.total])
    const buffer = await wb.xlsx.writeBuffer()
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function compartir(blob, nombre, textoWa) {
    const file = new File([blob], nombre, { type: blob.type })
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: nombre, text: textoWa })
        return
      } catch {
        // cancelado o no soportado → fallback
      }
    }
    descargar(blob, nombre)
    if (typeof window !== 'undefined') {
      window.open(`https://wa.me/?text=${encodeURIComponent(textoWa)}`, '_blank')
    }
  }

  function slug(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'perfil'
  }

  async function generar({ modulo, mes, anio, formato = 'pdf', accion = 'descargar' }) {
    const rep = await construir(modulo, mes, anio)
    const ext = formato === 'excel' ? 'xlsx' : 'pdf'
    const nombre = `reporte-${modulo}-${slug(nombrePerfilActivo.value)}-${anio}-${String(mes).padStart(2, '0')}.${ext}`
    const blob = formato === 'excel' ? await blobExcel(rep) : await blobPdf(rep)
    const textoWa = `${rep.titulo} · ${rep.subtitulo}\n${rep.totalLabel}: ${rep.total}`
    if (accion === 'compartir') await compartir(blob, nombre, textoWa)
    else descargar(blob, nombre)
  }

  return { generar, MODULOS_REPORTE }
}
