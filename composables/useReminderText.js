/**
 * Genera mensajes de recordatorio para deudores listos para compartir
 * vía WhatsApp / link nativo / clipboard.
 *
 * Ver §5.C punto 1 de planifica.md.
 */
import { useFormatters } from './useFormatters'

export function useReminderText() {
  const { formatCurrency, formatDate } = useFormatters()

  function buildHeader(persona) {
    const nombre = persona?.nombre || 'amigo'
    return `Hola ${nombre} 👋, te paso un recordatorio amistoso del saldo pendiente:`
  }

  function buildBody({ deudas = [] }) {
    if (!deudas.length) return ''
    const lineas = deudas
      .filter((d) => parseFloat(d.montoPendiente) > 0)
      .map((d) => {
        const monto = formatCurrency(parseFloat(d.montoPendiente))
        const fecha = d.fechaCreacion ? ` (desde ${formatDate(d.fechaCreacion)})` : ''
        return `• ${d.concepto} — ${monto}${fecha}`
      })
    return lineas.join('\n')
  }

  function buildFooter(total) {
    return `\nTotal pendiente: *${formatCurrency(total)}*\n¡Gracias!`
  }

  function buildMessage({ persona, deudas = [], total = 0 }) {
    const header = buildHeader(persona)
    const body = buildBody({ deudas })
    const footer = buildFooter(total)
    return [header, body, footer].filter(Boolean).join('\n\n').trim()
  }

  function buildWhatsappUrl({ persona, deudas, total }) {
    const text = buildMessage({ persona, deudas, total })
    const phone = (persona?.telefono || '').replace(/\D/g, '')
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    return `${base}?text=${encodeURIComponent(text)}`
  }

  async function copyToClipboard(text) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  return {
    buildMessage,
    buildWhatsappUrl,
    copyToClipboard,
  }
}
