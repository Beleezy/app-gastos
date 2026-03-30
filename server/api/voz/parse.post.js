import Anthropic from '@anthropic-ai/sdk'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.texto?.trim()) {
    throw createError({ statusCode: 400, message: 'El texto es obligatorio' })
  }

  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'API key de Anthropic no configurada' })
  }

  const hoy = new Date().toISOString().split('T')[0]
  const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date().getDay()]

  const systemPrompt = `Eres un asistente de finanzas personales. El usuario te va a dar un texto transcrito por voz donde describe uno o varios gastos que realizó. Tu tarea es extraer los datos de cada gasto mencionado.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "gastos": [
    {
      "concepto": "descripción corta del gasto",
      "monto": número decimal,
      "categoria": "una de: Alimentación, Transporte, Vivienda, Salud, Educación, Entretenimiento, Vestimenta, Servicios, Ahorro, Deudas, Otros",
      "fecha": "YYYY-MM-DD"
    }
  ]
}

Reglas:
- La fecha por defecto es hoy: ${hoy} (${diaSemana}).
- Si el usuario dice "ayer", "el martes", "hace dos días", calcula la fecha correcta.
- Si menciona varios gastos en una sola oración, sepáralos en objetos individuales.
- Clasifica cada gasto en la categoría más apropiada.
- El concepto debe ser breve y descriptivo (máx 50 caracteres).
- Los montos deben ser números decimales (ej: 2.50, no "dos soles con cincuenta").
- Si no puedes interpretar algo, usa concepto "Gasto no especificado" y categoría "Otros".`

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: body.texto }
    ],
  })

  const text = response.content[0].text.trim()

  try {
    const parsed = JSON.parse(text)
    return parsed
  } catch {
    throw createError({ statusCode: 500, message: 'Error al interpretar la respuesta del LLM' })
  }
})
