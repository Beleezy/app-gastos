const handlers = new Map()
let installed = false
let lastKey = ''
let lastKeyAt = 0
const CHORD_WINDOW_MS = 800

function isEditableTarget(el) {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

function keyFromEvent(e) {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('mod')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

function onKeydown(e) {
  if (isEditableTarget(e.target)) return

  const combo = keyFromEvent(e)
  const now = performance.now()

  // Chord detection (g p, g r, g d, etc.)
  if (lastKey && now - lastKeyAt < CHORD_WINDOW_MS) {
    const chord = `${lastKey} ${combo}`
    lastKey = ''
    const chordHandler = handlers.get(chord)
    if (chordHandler) {
      e.preventDefault()
      chordHandler(e)
      return
    }
  }

  const direct = handlers.get(combo)
  if (direct) {
    e.preventDefault()
    direct(e)
    return
  }

  // Keys that start a chord
  if (combo === 'g') {
    lastKey = 'g'
    lastKeyAt = now
  } else {
    lastKey = ''
  }
}

function ensureInstalled() {
  if (installed || !import.meta.client) return
  installed = true
  window.addEventListener('keydown', onKeydown)
}

export function useKeyboardShortcuts(map) {
  ensureInstalled()

  const keys = Object.keys(map)

  onMounted(() => {
    keys.forEach(k => handlers.set(k, map[k]))
  })

  onUnmounted(() => {
    keys.forEach(k => {
      if (handlers.get(k) === map[k]) handlers.delete(k)
    })
  })
}
