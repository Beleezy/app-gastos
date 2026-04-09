import { db } from '../../utils/db.js'
import { categorias, configuraciones } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { parseModelList, getValidModels, selectBestModel, getFallbackModels, trackRequest } from '../../utils/geminiModels.js'
import { eq, or, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.image) {
    throw createError({ statusCode: 400, message: 'La imagen es obligatoria' })
  }

  const runtimeConfig = useRuntimeConfig()
  const apiKey = runtimeConfig.geminiApiKey

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'API key de Gemini no configurada' })
  }

  const usuarioId = await getUsuarioFromEvent(event)
  let zonaHoraria = 'America/Lima'
  try {
    const [userConfig] = await db
      .select()
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)
    zonaHoraria = userConfig?.zonaHoraria || 'America/Lima'
  } catch (e) {
    console.warn('No se pudo leer configuraciones, usando zona horaria por defecto:', e.message)
  }

  // Fetch categories
  const cats = await db
    .select({ nombre: categorias.nombre })
    .from(categorias)
    .where(or(eq(categorias.esPredefinida, true), eq(categorias.usuarioId, usuarioId), isNull(categorias.usuarioId)))
    .orderBy(categorias.nombre)
  const categoryList = cats.map(c => c.nombre).join(', ')

  // Calculate dates
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: zonaHoraria }))
  const hoy = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0')
  const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][ahora.getDay()]

  const systemPrompt = `Eres un asistente de finanzas personales. El usuario te envía una foto de un voucher, boleta, recibo, ticket o comprobante de pago. Tu tarea es extraer los datos de cada gasto o ítem que aparezca en la imagen.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "total_comprobante": número decimal o null,
  "gastos": [
    {
      "concepto": "descripción corta del gasto",
      "monto": número decimal,
      "categoria": "una de: ${categoryList}",
      "fecha": "YYYY-MM-DD"
    }
  ]
}

Reglas:
- "total_comprobante" es el TOTAL FINAL que aparece en el comprobante (el monto que realmente se pagó). Si no es visible, usa null.
- Si la imagen muestra un recibo con múltiples ítems, crea un objeto por cada ítem individual.
- Si la imagen muestra solo un total general sin desglose, crea un solo objeto con ese total.
- Si hay una fecha visible en el recibo/voucher, úsala. Si no, usa la fecha de hoy: ${hoy} (${diaSemana}).
- Clasifica cada gasto en la categoría más apropiada de la lista proporcionada.
- El concepto debe ser breve y descriptivo (máx 50 caracteres).
- Los montos deben ser números decimales (ej: 2.50).
- DESCUENTOS Y PROMOCIONES: Si un ítem tiene descuento, promoción u oferta, usa el PRECIO FINAL (después del descuento) como monto. Ejemplo: precio 10.00, descuento 2.00 → monto = 8.00. Agrega "(desc.)" al concepto.
- Si hay un descuento global (no asociado a un ítem), agrégalo como ítem con monto NEGATIVO y concepto "Descuento [descripción]".
- VALIDACIÓN OBLIGATORIA: La suma de todos los montos DEBE ser igual a "total_comprobante". Si no coincide, revisa los descuentos y ajusta antes de responder.
- Ignora IGV y subtotales intermedios. Usa solo el TOTAL FINAL como referencia.
- Si la imagen no es un recibo o no puedes extraer gastos, devuelve: {"total_comprobante": null, "gastos": []}
- Si solo ves el total sin desglose, usa el nombre del establecimiento o "Compra" como concepto.`

  // Parse image data - accept "data:image/...;base64,XXXX" or raw base64
  let imageBase64 = body.image
  let mimeType = 'image/jpeg'

  if (imageBase64.startsWith('data:')) {
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
    if (match) {
      mimeType = match[1]
      imageBase64 = match[2]
    } else {
      throw createError({ statusCode: 400, message: 'Formato de imagen inválido' })
    }
  }

  // Model selection (same logic as voice parse)
  const configuredModels = parseModelList(runtimeConfig.geminiModel || 'gemini-2.5-flash')
  const validModels = await getValidModels(configuredModels, apiKey)

  // Filter to models that support vision (most Gemini models do)
  const primaryModel = selectBestModel(validModels)
  const fallbackModels = getFallbackModels(validModels, primaryModel)
  const modelsToTry = [primaryModel, ...fallbackModels]

  const MAX_RETRIES = 3
  const RETRY_DELAYS = [0, 2000, 5000]
  let lastError = null
  let lastErrorUserFriendly = null

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: imageBase64,
                      },
                    },
                    { text: 'Extrae los gastos de este voucher/recibo.' },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
              },
            }),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Error de Gemini API [${currentModel}] (intento ${attempt + 1}/${MAX_RETRIES}):`, errorText)
          lastError = errorText

          if (response.status === 429) {
            lastErrorUserFriendly = 'Límite de solicitudes alcanzado. Espera un momento e intenta de nuevo.'
            const waitMatch = errorText.match(/retry in (\d+)/i)
            const waitTime = waitMatch ? Math.min(parseInt(waitMatch[1]) * 1000, 60000) : 15000
            if (attempt < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, waitTime))
            }
            continue
          }

          if (response.status === 403) {
            lastErrorUserFriendly = 'API key de Gemini sin permisos. Verifica tu clave en Google AI Studio.'
            break
          }

          continue
        }

        trackRequest(currentModel)

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

        if (!text) {
          lastError = 'Respuesta vacía del LLM'
          continue
        }

        let parsed
        try {
          parsed = JSON.parse(text)
        } catch (jsonErr) {
          console.error(`JSON inválido del LLM [${currentModel}] (intento ${attempt + 1}/${MAX_RETRIES}):`, text)
          lastError = 'La respuesta del LLM no es JSON válido'
          continue
        }

        if (!parsed.gastos || !Array.isArray(parsed.gastos)) {
          console.error(`Estructura inesperada del LLM [${currentModel}] (intento ${attempt + 1}/${MAX_RETRIES}):`, parsed)
          lastError = 'La respuesta del LLM no tiene el formato esperado'
          continue
        }

        const totalComprobante = parsed.total_comprobante != null
          ? Math.round(parseFloat(parsed.total_comprobante) * 100) / 100
          : null

        parsed.gastos = parsed.gastos.filter(g => {
          return g && parseFloat(g.monto) !== 0 && g.concepto
        }).map(g => ({
          concepto: String(g.concepto).substring(0, 50),
          monto: Math.round(parseFloat(g.monto) * 100) / 100,
          categoria: g.categoria || 'Otros',
          fecha: g.fecha || hoy,
        }))

        if (parsed.gastos.length === 0) {
          lastError = 'No se pudieron extraer gastos de la imagen'
          continue
        }

        return {
          gastos: parsed.gastos,
          totalComprobante,
        }
      } catch (e) {
        console.error(`Error [${currentModel}] en intento ${attempt + 1}/${MAX_RETRIES}:`, e.message)
        lastError = e.message
      }
    }
    console.warn(`Modelo ${currentModel} falló tras ${MAX_RETRIES} intentos, probando siguiente modelo...`)
  }

  const userMessage = lastErrorUserFriendly || 'No se pudo procesar la imagen. Intenta de nuevo con una foto más clara.'
  throw createError({ statusCode: 500, message: userMessage })
})
