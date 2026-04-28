// Tests del builder de mensaje de recordatorio.
// Mockea los formatters de Nuxt para evitar levantar el contexto.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#imports', () => ({}))
vi.mock('../composables/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: (n) => `S/ ${Number(n).toFixed(2)}`,
    formatDate: (d) => new Date(d).toISOString().slice(0, 10),
  }),
}))

import { useReminderText } from '../composables/useReminderText.js'

describe('useReminderText', () => {
  let api
  beforeEach(() => {
    api = useReminderText()
  })

  it('arma mensaje con header, lista y total', () => {
    const msg = api.buildMessage({
      persona: { nombre: 'Pedro' },
      deudas: [
        { concepto: 'Almuerzo', montoPendiente: 30, fechaCreacion: '2026-04-01' },
        { concepto: 'Café', montoPendiente: 10, fechaCreacion: '2026-04-15' },
      ],
      total: 40,
    })
    expect(msg).toContain('Hola Pedro')
    expect(msg).toContain('Almuerzo')
    expect(msg).toContain('S/ 30.00')
    expect(msg).toContain('Café')
    expect(msg).toContain('Total pendiente: *S/ 40.00*')
  })

  it('omite deudas con monto 0', () => {
    const msg = api.buildMessage({
      persona: { nombre: 'Ana' },
      deudas: [
        { concepto: 'Saldada', montoPendiente: 0 },
        { concepto: 'Pendiente', montoPendiente: 5 },
      ],
      total: 5,
    })
    expect(msg).not.toContain('Saldada')
    expect(msg).toContain('Pendiente')
  })

  it('genera URL de WhatsApp con teléfono limpio', () => {
    const url = api.buildWhatsappUrl({
      persona: { nombre: 'Luis', telefono: '+51 999-888-777' },
      deudas: [{ concepto: 'X', montoPendiente: 10 }],
      total: 10,
    })
    expect(url.startsWith('https://wa.me/51999888777?text=')).toBe(true)
  })

  it('sin teléfono devuelve url sin destino', () => {
    const url = api.buildWhatsappUrl({
      persona: { nombre: 'Sin' },
      deudas: [{ concepto: 'X', montoPendiente: 10 }],
      total: 10,
    })
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
  })
})
