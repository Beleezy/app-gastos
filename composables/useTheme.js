const FONT_SIZES = [
  { id: 'normal',     label: 'Normal',     rootPx: 16 },
  { id: 'grande',     label: 'Grande',     rootPx: 18 },
  { id: 'muy_grande', label: 'Muy grande', rootPx: 20 },
]

const ACCENT_COLORS = [
  { id: 'negro',   label: 'Negro',   color: '#6b7280', mode: 'dark' },
  { id: 'azul',    label: 'Azul',    color: '#3b82f6', mode: 'dark' },
  { id: 'celeste', label: 'Celeste', color: '#06b6d4', mode: 'dark' },
  { id: 'morado',  label: 'Morado',  color: '#8b5cf6', mode: 'dark' },
  { id: 'rosado',  label: 'Rosado',  color: '#ec4899', mode: 'light' },

  { id: 'blanco',  label: 'Blanco',  color: '#e2e8f0', mode: 'light' },
]

export function useTheme() {
  const isDark = useState('theme-dark', () => true)
  const accentColor = useState('theme-accent', () => 'azul')
  const fontSize = useState('theme-font-size', () => 'normal')
  const isColorblind = useState('theme-colorblind', () => false)

  function applyTheme(dark) {
    if (!process.client) return
    if (dark) {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }

  function applyAccent(id) {
    if (!process.client) return
    ACCENT_COLORS.forEach(c => {
      document.documentElement.classList.remove(`accent-${c.id}`)
    })
    document.documentElement.classList.add(`accent-${id}`)
    localStorage.setItem('theme-accent', id)
  }

  function modeFor(id) {
    const c = ACCENT_COLORS.find(x => x.id === id)
    return c?.mode === 'light' ? false : true
  }

  function applyFontSize(id) {
    if (!process.client) return
    const size = FONT_SIZES.find(s => s.id === id) || FONT_SIZES[0]
    document.documentElement.style.fontSize = `${size.rootPx}px`
    localStorage.setItem('theme-font-size', id)
  }

  function setFontSize(id) {
    fontSize.value = id
    applyFontSize(id)
  }

  function applyColorblind(enabled) {
    if (!process.client) return
    if (enabled) {
      document.documentElement.classList.add('colorblind')
    } else {
      document.documentElement.classList.remove('colorblind')
    }
    localStorage.setItem('colorblind-mode', enabled ? 'true' : 'false')
  }

  function setColorblindMode(enabled) {
    isColorblind.value = enabled
    applyColorblind(enabled)
  }

  function setAccentColor(id) {
    accentColor.value = id
    const dark = modeFor(id)
    isDark.value = dark
    applyTheme(dark)
    applyAccent(id)
  }

  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme(isDark.value)
  }

  function initTheme() {
    if (!process.client) return
    const savedAccent = localStorage.getItem('theme-accent') || 'azul'
    accentColor.value = savedAccent
    const dark = modeFor(savedAccent)
    isDark.value = dark
    applyTheme(dark)
    applyAccent(savedAccent)

    const savedFontSize = localStorage.getItem('theme-font-size') || 'normal'
    fontSize.value = savedFontSize
    applyFontSize(savedFontSize)

    const savedColorblind = localStorage.getItem('colorblind-mode') === 'true'
    isColorblind.value = savedColorblind
    applyColorblind(savedColorblind)
  }

  return { isDark, toggleTheme, initTheme, accentColor, setAccentColor, ACCENT_COLORS, fontSize, setFontSize, FONT_SIZES, isColorblind, setColorblindMode }
}
