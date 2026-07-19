import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

globalThis.ref = ref
globalThis.onScopeDispose = () => {}

import { useSseStream } from '../composables/useSseStream.js'

describe('useSseStream parseFrame', () => {
  it('parsea frame con JSON', () => {
    const { parseFrame } = useSseStream()
    const r = parseFrame('event: gasto\ndata: {"concepto":"Pan","monto":5}')
    expect(r.event).toBe('gasto')
    expect(r.data).toEqual({ concepto: 'Pan', monto: 5 })
  })

  it('soporta data multilínea', () => {
    const { parseFrame } = useSseStream()
    const r = parseFrame('data: linea 1\ndata: linea 2')
    expect(r.event).toBe('message') // default
    expect(r.data).toBe('linea 1\nlinea 2')
  })

  it('frame sin data → null', () => {
    const { parseFrame } = useSseStream()
    expect(parseFrame('event: ping')).toBeNull()
  })
})

describe('useSseStream start con stub fetch', () => {
  it('emite onEvent por cada frame y onComplete al final', async () => {
    const events = []
    let completed = false

    const encoder = new TextEncoder()
    const chunks = ['data: {"i":1}\n\n', 'data: {"i":2}\n\n', 'data: {"i":3}\n\n']

    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c))
        controller.close()
      },
    })

    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      body: stream,
    }))

    const { start } = useSseStream({
      onEvent: (data) => events.push(data),
      onComplete: () => {
        completed = true
      },
    })

    await start('/api/stream', { x: 1 })
    expect(events).toEqual([{ i: 1 }, { i: 2 }, { i: 3 }])
    expect(completed).toBe(true)
  })

  it('error si HTTP no OK', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, body: null }))
    const sse = useSseStream()
    await sse.start('/api/stream', {})
    expect(sse.error.value).toContain('500')
  })
})
