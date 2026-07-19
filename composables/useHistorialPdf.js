/**
 * Genera un PDF con el historial completo de pagos de una persona.
 * Ver §5.C de planifica.md.
 *
 * Es una versión simple, sin dependencia de useDeudaPdf, para incluir
 * pagos saldados además de pendientes (auditoria/comprobante).
 */

import { useFormatters } from './useFormatters'

export function useHistorialPdf() {
  const { formatCurrency, formatDate } = useFormatters()

  async function generar({ persona, deudas = [], pagos = [], titulo } = {}) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    const margin = 15
    const ancho = doc.internal.pageSize.getWidth() - margin * 2
    let y = margin

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(titulo || 'Historial de movimientos', margin, y)
    y += 7

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Persona: ${persona?.nombre || '-'}`, margin, y)
    y += 5
    if (persona?.email) {
      doc.text(`Email: ${persona.email}`, margin, y)
      y += 5
    }
    if (persona?.telefono) {
      doc.text(`Teléfono: ${persona.telefono}`, margin, y)
      y += 5
    }

    const totalPendiente = deudas.reduce((s, d) => s + (parseFloat(d.montoPendiente) || 0), 0)
    const totalPagos = pagos.reduce((s, p) => s + (parseFloat(p.montoPagado) || 0), 0)

    y += 3
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Total pendiente: ${formatCurrency(totalPendiente)}`, margin, y)
    y += 5
    doc.text(`Total pagado: ${formatCurrency(totalPagos)}`, margin, y)
    y += 5
    doc.text(`Movimientos: ${deudas.length} deudas · ${pagos.length} pagos`, margin, y)
    y += 8

    function checkPage() {
      if (y > doc.internal.pageSize.getHeight() - margin - 10) {
        doc.addPage()
        y = margin
      }
    }

    if (deudas.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('Deudas', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      for (const d of deudas) {
        checkPage()
        const linea = `${formatDate(d.fechaCreacion)} · ${d.concepto} · pend ${formatCurrency(d.montoPendiente)} · estado ${d.estado || '-'}`
        const lines = doc.splitTextToSize(linea, ancho)
        doc.text(lines, margin, y)
        y += lines.length * 5
      }
      y += 4
    }

    if (pagos.length > 0) {
      checkPage()
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Pagos', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      for (const p of pagos) {
        checkPage()
        const linea = `${formatDate(p.fechaPago)} · ${p.concepto || '-'} · ${formatCurrency(p.montoPagado)}${p.metodoPago ? ` · ${p.metodoPago}` : ''}`
        const lines = doc.splitTextToSize(linea, ancho)
        doc.text(lines, margin, y)
        y += lines.length * 5
      }
    }

    const safeName = (persona?.nombre || 'historial').replace(/[^a-zA-Z0-9]+/g, '_')
    doc.save(`historial_${safeName}.pdf`)
  }

  return { generar }
}
