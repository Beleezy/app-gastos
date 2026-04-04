import { db } from '../../utils/db.js'
import { categorias, configuraciones, personasEntidades } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, or, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.texto?.trim()) {
    throw createError({ statusCode: 400, message: 'El texto es obligatorio' })
  }

  const runtimeConfig = useRuntimeConfig()
  const apiKey = runtimeConfig.geminiApiKey

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'API key de Gemini no configurada' })
  }

  // Fetch user config for timezone
  const usuarioId = await getUsuarioId()
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

  // Fetch categories from DB
  const cats = await db
    .select({ nombre: categorias.nombre })
    .from(categorias)
    .where(or(eq(categorias.esPredefinida, true), eq(categorias.usuarioId, usuarioId), isNull(categorias.usuarioId)))
    .orderBy(categorias.nombre)
  const categoryList = cats.map(c => c.nombre).join(', ')

  // Usar timezone del usuario para evitar inconsistencias
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: zonaHoraria }))
  const hoy = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0')
  const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][ahora.getDay()]

  // Calcular fechas de referencia para ayudar al LLM
  const fechasReferencia = {}
  for (let i = 1; i <= 7; i++) {
    const d = new Date(ahora)
    d.setDate(d.getDate() - i)
    const nombreDia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]
    const fechaStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    if (!fechasReferencia[nombreDia]) {
      fechasReferencia[nombreDia] = fechaStr
    }
  }
  const referenciaDias = Object.entries(fechasReferencia).map(([dia, fecha]) => `${dia} pasado = ${fecha}`).join(', ')

  const systemPrompt = `Eres un asistente de finanzas personales. El usuario te va a dar un texto transcrito por voz donde describe uno o varios gastos que realizó. Tu tarea es extraer los datos de cada gasto mencionado.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
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
- La fecha por defecto es hoy: ${hoy} (${diaSemana}).
- Si el usuario dice "ayer", "el martes", "hace dos días", calcula la fecha correcta usando estas referencias exactas: ${referenciaDias}.
- IMPORTANTE: Usa las fechas de referencia proporcionadas, NO calcules las fechas por tu cuenta.
- Si menciona varios gastos en una sola oración, sepáralos en objetos individuales.
- Clasifica cada gasto en la categoría más apropiada.
- El concepto debe ser breve y descriptivo (máx 50 caracteres).
- Los montos deben ser números decimales (ej: 2.50, no "dos soles con cincuenta").
- Si no puedes interpretar algo, usa concepto "Gasto no especificado" y categoría "Otros".`

  const geminiModelPrimary = runtimeConfig.geminiModel || 'gemini-3.1-flash-lite'
  const geminiModelFallback = 'gemini-2.5-flash-lite'

  // Determinar si es parsing de deudas o gastos
  const modo = body.modo || 'gastos'
  const promptUsuario = body.texto

  let finalSystemPrompt = systemPrompt
  if (modo === 'deudas') {
    // Fetch existing person names to help the LLM match spoken names
    let personasExistentes = []
    try {
      const personasDb = await db
        .select({ id: personasEntidades.id, nombre: personasEntidades.nombre })
        .from(personasEntidades)
        .where(eq(personasEntidades.usuarioId, usuarioId))
      personasExistentes = personasDb.map(p => p.nombre)
    } catch (e) {
      console.warn('No se pudieron cargar personas existentes:', e.message)
    }

    const listaPersonas = personasExistentes.length > 0
      ? `\nPersonas registradas en el sistema: ${personasExistentes.join(', ')}\n- IMPORTANTE: Si el nombre mencionado por voz suena similar o parecido a alguno de la lista, usa el nombre EXACTO de la lista. Los nombres por voz pueden tener errores de transcripción (ej: "Deilan" → "Dayllan", "Maicol" → "Michael"). Prioriza siempre hacer match con nombres existentes.`
      : ''

    finalSystemPrompt = `Eres un asistente de finanzas personales. El usuario te va a dar un texto transcrito por voz donde describe deudas nuevas O pagos de deudas existentes. Tu tarea es extraer los datos de cada operación mencionada.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "deudas": [
    {
      "persona": "nombre de la persona u organización",
      "concepto": "descripción corta de la deuda",
      "monto": número decimal,
      "tipo": "me_deben" o "yo_debo",
      "fecha": "YYYY-MM-DD"
    }
  ],
  "pagos": [
    {
      "persona": "nombre de la persona u organización",
      "monto": número decimal,
      "fecha": "YYYY-MM-DD",
      "notas": "descripción opcional del pago"
    }
  ]
}
${listaPersonas}

Reglas:
- La fecha por defecto es hoy: ${hoy} (${diaSemana}).
- Si el usuario dice "ayer", "el martes", "hace dos días", calcula la fecha correcta usando estas referencias exactas: ${referenciaDias}.
- IMPORTANTE: Usa las fechas de referencia proporcionadas, NO calcules las fechas por tu cuenta.
- Si dice "me debe", "le presté", "le fié" → es una deuda nueva con tipo = "me_deben".
- Si dice "le debo", "me prestó", "me fió" → es una deuda nueva con tipo = "yo_debo".
- Si dice "me pagó", "ya pagó", "abonó", "canceló su deuda", "le pagué" → es un PAGO, va en el array "pagos".
- Si menciona varias operaciones, sepáralas en objetos individuales.
- El concepto debe ser breve y descriptivo (máx 50 caracteres).
- Los montos deben ser números decimales.
- Si no hay deudas nuevas, el array "deudas" debe estar vacío [].
- Si no hay pagos, el array "pagos" debe estar vacío [].
- Si no puedes interpretar algo, usa concepto "Deuda no especificada" y tipo "me_deben".`
  }

  const MAX_RETRIES = 3
  const RETRY_DELAYS = [0, 2000, 5000]
  const modelsToTry = [geminiModelPrimary, geminiModelFallback]
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
                parts: [{ text: finalSystemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: promptUsuario }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json',
              },
            }),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Error de Gemini API [${currentModel}] (intento ${attempt + 1}/${MAX_RETRIES}):`, errorText)
          lastError = errorText

          // Si es error 429 (cuota agotada), esperar más antes de reintentar
          if (response.status === 429) {
            lastErrorUserFriendly = 'Límite de solicitudes alcanzado. Espera un momento e intenta de nuevo.'
            // Extraer tiempo de espera sugerido del error si existe
            const waitMatch = errorText.match(/retry in (\d+)/i)
            const waitTime = waitMatch ? Math.min(parseInt(waitMatch[1]) * 1000, 60000) : 15000
            if (attempt < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, waitTime))
            }
            continue
          }

          if (response.status === 403) {
            lastErrorUserFriendly = 'API key de Gemini sin permisos. Verifica tu clave en Google AI Studio.'
            break // No reintentar con la misma key
          }

          continue
        }

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

        // Validar estructura según el modo
        if (modo === 'deudas') {
          if (!parsed.deudas && !parsed.pagos) {
            console.error(`Estructura inesperada del LLM [${currentModel}] en modo deudas (intento ${attempt + 1}/${MAX_RETRIES}):`, parsed)
            lastError = 'La respuesta del LLM no tiene el formato esperado'
            continue
          }
          parsed.deudas = Array.isArray(parsed.deudas) ? parsed.deudas.filter(d =>
            d && d.persona && (parseFloat(d.monto) > 0)
          ).map(d => ({
            persona: String(d.persona).substring(0, 100),
            concepto: String(d.concepto || 'Deuda no especificada').substring(0, 50),
            monto: Math.round(parseFloat(d.monto) * 100) / 100,
            tipo: d.tipo === 'yo_debo' ? 'yo_debo' : 'me_deben',
            fecha: d.fecha || hoy,
          })) : []
          parsed.pagos = Array.isArray(parsed.pagos) ? parsed.pagos.filter(p =>
            p && p.persona && (parseFloat(p.monto) > 0)
          ).map(p => ({
            persona: String(p.persona).substring(0, 100),
            monto: Math.round(parseFloat(p.monto) * 100) / 100,
            fecha: p.fecha || hoy,
            notas: p.notas || null,
          })) : []

          if (parsed.deudas.length === 0 && parsed.pagos.length === 0) {
            lastError = 'No se pudieron extraer deudas o pagos del texto'
            continue
          }
          return parsed
        }

        // Modo gastos: espera { gastos: [...] }
        if (!parsed.gastos || !Array.isArray(parsed.gastos)) {
          console.error(`Estructura inesperada del LLM [${currentModel}] (intento ${attempt + 1}/${MAX_RETRIES}):`, parsed)
          lastError = 'La respuesta del LLM no tiene el formato esperado'
          continue
        }

        parsed.gastos = parsed.gastos.filter(g => {
          return g && (parseFloat(g.monto) > 0) && g.concepto
        }).map(g => ({
          concepto: String(g.concepto).substring(0, 50),
          monto: Math.round(parseFloat(g.monto) * 100) / 100,
          categoria: g.categoria || 'Otros',
          fecha: g.fecha || hoy,
        }))

        if (parsed.gastos.length === 0) {
          lastError = 'No se pudieron extraer gastos válidos del texto'
          continue
        }

        return parsed
      } catch (e) {
        console.error(`Error [${currentModel}] en intento ${attempt + 1}/${MAX_RETRIES}:`, e.message)
        lastError = e.message
      }
    }
    console.warn(`Modelo ${currentModel} falló tras ${MAX_RETRIES} intentos, probando siguiente modelo...`)
  }

  const userMessage = lastErrorUserFriendly || 'No se pudo procesar el texto. Intenta de nuevo en unos segundos.'
  throw createError({ statusCode: 500, message: userMessage })
})
