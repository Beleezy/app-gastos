export function useDeudaPdf() {
  const { config, fetchConfig } = useConfiguraciones()
  const { currencySymbol, formatMonto } = useCurrency()

  async function generarPdfDeuda(persona, deudasActivas, deudasSaldadas = []) {
    // Ensure config is loaded to get user name
    if (!config.value) {
      await fetchConfig()
    }
    const nombreUsuario = config.value?.nombre || 'Mi persona'

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(`Detalle de Deudas hacia ${nombreUsuario}`, pageWidth / 2, y, { align: 'center' })
    y += 12

    // Persona info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Deudor: ${persona.nombre}`, 20, y)
    y += 7
    if (persona.contacto) {
      doc.text(`Contacto: ${persona.contacto}`, 20, y)
      y += 7
    }
    doc.text(`Fecha de emision: ${formatFechaCorta(new Date().toISOString().split('T')[0])}`, 20, y)
    y += 12

    // Total pendiente
    const totalPendiente = deudasActivas.reduce((sum, d) => sum + d.montoPendiente, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total pendiente: ${currencySymbol.value} ${formatMonto(totalPendiente)}`, 20, y)
    y += 12

    // Active debts table
    if (deudasActivas.length > 0) {
      const tieneAbonos = deudasActivas.some(d => d.montoOriginal > d.montoPendiente)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Deudas pendientes', 20, y)
      y += 8

      // Table header
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setFillColor(240, 240, 240)
      doc.rect(20, y - 4, pageWidth - 40, 7, 'F')
      doc.text('Concepto', 22, y)
      doc.text('Fecha', 75, y)
      doc.text('Monto', 105, y)
      if (tieneAbonos) {
        doc.text('Abonado', 130, y)
        doc.text('Pendiente', 160, y)
      } else {
        doc.text('Pendiente', 145, y)
      }
      y += 8

      // Table rows
      doc.setFont('helvetica', 'normal')
      for (const deuda of deudasActivas) {
        if (y > 270) {
          doc.addPage()
          y = 20
        }

        const montoAbonado = deuda.montoOriginal - deuda.montoPendiente

        doc.text(truncar(deuda.concepto, 25), 22, y)
        doc.text(formatFechaCorta(deuda.fechaCreacion), 75, y)
        doc.text(`${currencySymbol.value} ${formatMonto(deuda.montoOriginal)}`, 105, y)
        if (tieneAbonos) {
          if (montoAbonado > 0) {
            doc.setTextColor(34, 139, 34)
            doc.text(`${currencySymbol.value} ${formatMonto(montoAbonado)}`, 130, y)
            doc.setTextColor(0, 0, 0)
          } else {
            doc.text('-', 130, y)
          }
          doc.text(`${currencySymbol.value} ${formatMonto(deuda.montoPendiente)}`, 160, y)
        } else {
          doc.text(`${currencySymbol.value} ${formatMonto(deuda.montoPendiente)}`, 145, y)
        }
        y += 7

        if (deuda.notas) {
          doc.setFontSize(8)
          doc.setTextColor(120, 120, 120)
          doc.text(`  Nota: ${truncar(deuda.notas, 60)}`, 22, y)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(9)
          y += 6
        }
      }

      // Total abonado summary
      if (tieneAbonos) {
        const totalAbonado = deudasActivas.reduce((sum, d) => sum + (d.montoOriginal - d.montoPendiente), 0)
        if (totalAbonado > 0) {
          y += 3
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(34, 139, 34)
          doc.text(`Total abonado: ${currencySymbol.value} ${formatMonto(totalAbonado)}`, 20, y)
          doc.setTextColor(0, 0, 0)
          y += 2
        }
      }

      y += 5
    }

    // Settled debts (configurable days)
    const diasPdf = config.value?.diasPdfSaldadas || 7
    const haceDias = new Date()
    haceDias.setDate(haceDias.getDate() - diasPdf)
    const haceDiasStr = haceDias.toISOString().split('T')[0]

    const saldadasRecientes = deudasSaldadas.filter(d => {
      const fechaUpdate = d.updatedAt ? new Date(d.updatedAt).toISOString().split('T')[0] : null
      return fechaUpdate && fechaUpdate >= haceDiasStr
    })

    if (saldadasRecientes.length > 0) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Deudas saldadas (ultimos ${diasPdf} dias)`, 20, y)
      y += 8

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setFillColor(240, 240, 240)
      doc.rect(20, y - 4, pageWidth - 40, 7, 'F')
      doc.text('Concepto', 22, y)
      doc.text('Fecha', 100, y)
      doc.text('Monto', 145, y)
      doc.text('Estado', 170, y)
      y += 8

      doc.setFont('helvetica', 'normal')
      for (const deuda of saldadasRecientes) {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(truncar(deuda.concepto, 35), 22, y)
        doc.text(formatFechaCorta(deuda.fechaCreacion), 100, y)
        doc.text(`${currencySymbol.value} ${formatMonto(deuda.montoOriginal)}`, 145, y)
        doc.text(deuda.estado === 'archivado' ? 'Archivada' : 'Pagada', 170, y)
        y += 7
      }
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Generado por Mis Finanzas', pageWidth / 2, 290, { align: 'center' })
      doc.setTextColor(0, 0, 0)
    }

    // Return doc and filename for sharing
    const nombre = persona.nombre.replace(/\s+/g, '_')
    const filename = `deuda_${nombre}_${new Date().toISOString().split('T')[0]}.pdf`

    return { doc, filename }
  }

  async function descargarPdf(persona, deudasActivas, deudasSaldadas = []) {
    const { doc, filename } = await generarPdfDeuda(persona, deudasActivas, deudasSaldadas)
    doc.save(filename)
  }

  async function compartirWhatsapp(persona, deudasActivas, deudasSaldadas = []) {
    const { doc, filename } = await generarPdfDeuda(persona, deudasActivas, deudasSaldadas)
    const blob = doc.output('blob')
    const file = new File([blob], filename, { type: 'application/pdf' })

    // Use Web Share API if available (mobile)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Deuda - ${persona.nombre}`,
          text: `Detalle de deudas de ${persona.nombre}`,
        })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }

    // Fallback: download PDF and open WhatsApp with detailed text summary
    doc.save(filename)
    const totalPendiente = deudasActivas.reduce((sum, d) => sum + d.montoPendiente, 0)
    const lineasDeudas = deudasActivas
      .map(d => {
        const pendiente = d.montoPendiente !== d.montoOriginal
          ? ` (pendiente: ${currencySymbol.value} ${formatMonto(d.montoPendiente)})`
          : ''
        return `• ${d.concepto}: ${currencySymbol.value} ${formatMonto(d.montoOriginal)}${pendiente}`
      })
      .join('\n')

    const mensaje = [
      `Hola ${persona.nombre}, te paso el detalle de lo que me debes:`,
      '',
      lineasDeudas,
      '',
      `*Total pendiente: ${currencySymbol.value} ${formatMonto(totalPendiente)}*`,
      '',
      '_(El PDF fue descargado en tu dispositivo)_',
    ].join('\n')

    const phone = persona.contacto?.replace(/\D/g, '')
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(waUrl, '_blank')
  }

  function formatFechaCorta(fecha) {
    if (!fecha) return ''
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function truncar(texto, max) {
    if (!texto) return ''
    return texto.length > max ? texto.substring(0, max) + '...' : texto
  }

  return { generarPdfDeuda, descargarPdf, compartirWhatsapp }
}
