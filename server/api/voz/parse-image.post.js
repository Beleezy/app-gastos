import { db } from '../../utils/db.js'
import { categorias, configuraciones } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { vozParseImageBodySchema } from '~/shared/schemas/gastos.js'
import {
  parseModelList,
  getValidModels,
  selectBestModel,
  getFallbackModels,
  trackRequest,
  getWaitMessage,
} from '../../utils/geminiModels.js'
import { rateLimits } from '../../utils/rateLimit.js'
import { logger } from '../../utils/logger.js'
import { sanitizeForSystemPrompt } from '../../utils/llmSafety.js'
import { assertImagePayload } from '../../utils/imageMagic.js'
import { trackUsoLlm, assertCuotaMensual } from '../../utils/usoLlm.js'
import { hoyConReferencias } from '../../utils/dateLocal.js'
import { eq, or, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Shape + tamaño via Zod. La validación de magic bytes es aparte
  // (assertImagePayload) — un attacker podría enviar un PDF con MIME
  // image/jpeg que pasa el schema pero no debe llegar al LLM.
  const body = await validateBody(event, vozParseImageBodySchema)

  const runtimeConfig = useRuntimeConfig()
  const apiKey = runtimeConfig.geminiApiKey

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'API key de Gemini no configurada' })
  }

  const usuarioId = await getUsuarioFromEvent(event)
  await rateLimits.vozParseImage(event, usuarioId)
  await rateLimits.vozParseImageHora(event, usuarioId)
  await assertCuotaMensual(usuarioId)
  let zonaHoraria = 'America/Lima'
  try {
    const [userConfig] = await db
      .select()
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)
    zonaHoraria = userConfig?.zonaHoraria || 'America/Lima'
  } catch (e) {
    logger.warn('No se pudo leer configuraciones, usando zona horaria por defecto', { error: e })
  }

  // Fetch categories
  const cats = await db
    .select({ nombre: categorias.nombre })
    .from(categorias)
    .where(
      or(
        eq(categorias.esPredefinida, true),
        eq(categorias.usuarioId, usuarioId),
        isNull(categorias.usuarioId),
      ),
    )
    .orderBy(categorias.nombre)
  // Saneamos nombres custom (texto libre del usuario) antes de inyectarlos
  // al system prompt — evita stored prompt injection.
  const categoryList = cats
    .map((c) => sanitizeForSystemPrompt(c.nombre, 50))
    .filter(Boolean)
    .join(', ')

  // Calculate dates
  const { fecha: hoy, diaSemana } = hoyConReferencias(zonaHoraria)

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
- DESCUENTOS Y PROMOCIONES:
  * Si una línea de descuento aparece INMEDIATAMENTE DEBAJO de un ítem específico (está asociada a ese ítem), réstala del precio bruto de ese ítem: monto_neto = precio_item - descuento. Agrega "(desc.)" al concepto del ítem. NO incluyas el descuento como ítem separado.
    Ejemplo: "Leche 5.00 / Descuento -1.00" → un solo ítem con monto 4.00 y concepto "Leche (desc.)"
  * Si hay un descuento global al final del comprobante que NO está asociado a ningún ítem en particular, agrégalo como ítem con monto NEGATIVO y concepto "Descuento [descripción]".
- VALIDACIÓN OBLIGATORIA: La suma de TODOS los montos (incluyendo negativos) DEBE ser igual a "total_comprobante". Si no coincide, revisa los descuentos y ajusta los montos antes de responder. El total final siempre manda.
- Ignora IGV y subtotales intermedios. Usa solo el TOTAL FINAL como referencia.
- Si la imagen no es un recibo o no puedes extraer gastos, devuelve: {"total_comprobante": null, "gastos": []}
- Si solo ves el total sin desglose, usa el nombre del establecimiento o "Compra" como concepto.`

  // Valida magic bytes y desempaqueta dataURI. assertImagePayload lanza
  // 400 si el contenido no es JPEG/PNG/GIF/WEBP/HEIC, o si el MIME
  // declarado por el cliente no concuerda con el contenido real.
  const { mimeType, base64: imageBase64 } = assertImagePayload(body.image)

  // Model selection (same logic as voice parse)
  const configuredModels = parseModelList(runtimeConfig.geminiModel || 'gemini-2.5-flash')
  const validModels = await getValidModels(configuredModels, apiKey)

  // Seleccionar el modelo con capacidad disponible (no a 1 del límite RPM/RPD)
  const primaryModel = selectBestModel(validModels, runtimeConfig)
  if (!primaryModel) {
    const waitMsg = getWaitMessage(validModels, runtimeConfig)
    throw createError({ statusCode: 429, message: waitMsg })
  }
  const fallbackModels = getFallbackModels(validModels, primaryModel, runtimeConfig)
  const modelsToTry = [primaryModel, ...fallbackModels]

  const MAX_RETRIES = runtimeConfig.geminiMaxRetries || 3
  const RETRY_DELAYS = Array.from({ length: MAX_RETRIES }, (_, i) =>
    i === 0 ? 0 : Math.min(i * 2000, 10000),
  )
  let lastError = null
  let lastErrorUserFriendly = null

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
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
          },
        )

        if (!response.ok) {
          const errorText = await response.text()
          logger.error('Error de Gemini API (image)', {
            model: currentModel,
            attempt: attempt + 1,
            status: response.status,
          })
          lastError = `gemini ${response.status}`

          if (response.status === 429) {
            lastErrorUserFriendly =
              'Límite de solicitudes alcanzado. Espera un momento e intenta de nuevo.'
            const waitMatch = String(errorText).match(/retry in (\d+)/i)
            const waitTime = waitMatch ? Math.min(parseInt(waitMatch[1]) * 1000, 60000) : 15000
            if (attempt < MAX_RETRIES - 1) {
              await new Promise((resolve) => setTimeout(resolve, waitTime))
            }
            continue
          }

          if (response.status === 403) {
            lastErrorUserFriendly =
              'API key de Gemini sin permisos. Verifica tu clave en Google AI Studio.'
            break
          }

          continue
        }

        trackRequest(currentModel)
        trackUsoLlm({ usuarioId, endpoint: 'voz/parse-image' }).catch(() => {})

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
          logger.warn('JSON inválido del LLM (image)', {
            model: currentModel,
            attempt: attempt + 1,
          })
          lastError = 'La respuesta del LLM no es JSON válido'
          continue
        }

        if (!parsed.gastos || !Array.isArray(parsed.gastos)) {
          logger.warn('Estructura inesperada del LLM (image)', {
            model: currentModel,
            attempt: attempt + 1,
          })
          lastError = 'La respuesta del LLM no tiene el formato esperado'
          continue
        }

        const rawTotal = parseFloat(parsed.total_comprobante)
        const totalComprobante = Number.isFinite(rawTotal) ? Math.round(rawTotal * 100) / 100 : null

        const categoriasValidas = new Set(cats.map((c) => c.nombre))
        const MAX_MONTO = 100_000
        parsed.gastos = parsed.gastos
          .filter((g) => {
            if (!g || !g.concepto) return false
            const m = parseFloat(g.monto)
            if (!Number.isFinite(m) || m === 0) return false
            if (Math.abs(m) > MAX_MONTO) return false
            return true
          })
          .map((g) => {
            const m = Math.round(parseFloat(g.monto) * 100) / 100
            let categoria = String(g.categoria || 'Otros').substring(0, 50)
            if (!categoriasValidas.has(categoria)) categoria = 'Otros'
            return {
              concepto: String(g.concepto).substring(0, 50),
              monto: m,
              categoria,
              fecha: /^\d{4}-\d{2}-\d{2}$/.test(g.fecha) ? g.fecha : hoy,
            }
          })

        if (parsed.gastos.length === 0) {
          lastError = 'No se pudieron extraer gastos de la imagen'
          continue
        }

        return {
          gastos: parsed.gastos,
          totalComprobante,
        }
      } catch (e) {
        logger.error('Error invocando Gemini (image)', {
          model: currentModel,
          attempt: attempt + 1,
          error: e,
        })
        lastError = e.message
      }
    }
    logger.warn(`Modelo ${currentModel} falló tras ${MAX_RETRIES} intentos`, {
      model: currentModel,
    })
  }

  const userMessage =
    lastErrorUserFriendly ||
    'No se pudo procesar la imagen. Intenta de nuevo con una foto más clara.'
  throw createError({ statusCode: 500, message: userMessage })
})
