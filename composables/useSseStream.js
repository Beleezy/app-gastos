/**
 * Cliente Server-Sent Events ligero, sin EventSource (que no soporta
 * headers personalizados como Authorization). Usa fetch + ReadableStream.
 *
 * Ver §2.4 de planifica.md.
 *
 * Uso:
 *   const { start, stop, isConnected, error } = useSseStream({
 *     onEvent: (data) => { ... },
 *     onComplete: () => { ... },
 *   })
 *   start('/api/voz/parse-stream', { texto: '...' })
 */

export function useSseStream({ onEvent, onComplete } = {}) {
  const isConnected = ref(false)
  const error = ref(null)
  let controller = null

  function parseFrame(frame) {
    const lines = frame.split('\n')
    let data = []
    let event = 'message'
    for (const l of lines) {
      if (l.startsWith('data:')) data.push(l.slice(5).trim())
      else if (l.startsWith('event:')) event = l.slice(6).trim()
    }
    if (data.length === 0) return null
    const raw = data.join('\n')
    let parsed = raw
    try { parsed = JSON.parse(raw) } catch {}
    return { event, data: parsed }
  }

  async function start(url, body, opts = {}) {
    stop()
    error.value = null
    controller = new AbortController()

    let response
    try {
      response = await fetch(url, {
        method: opts.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(opts.headers || {}),
        },
        body: body != null ? JSON.stringify(body) : null,
        signal: controller.signal,
      })
    } catch (e) {
      if (e?.name !== 'AbortError') error.value = e.message || 'Error de red'
      return
    }

    if (!response.ok || !response.body) {
      error.value = `HTTP ${response.status}`
      return
    }

    isConnected.value = true
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const parsed = parseFrame(frame)
          if (parsed && typeof onEvent === 'function') {
            onEvent(parsed.data, parsed.event)
          }
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') error.value = e.message || 'Error leyendo stream'
    } finally {
      isConnected.value = false
      if (typeof onComplete === 'function') onComplete()
    }
  }

  function stop() {
    if (controller) {
      try { controller.abort() } catch {}
      controller = null
    }
    isConnected.value = false
  }

  if (typeof onScopeDispose === 'function') {
    onScopeDispose(stop)
  }

  return { start, stop, isConnected, error, parseFrame }
}
