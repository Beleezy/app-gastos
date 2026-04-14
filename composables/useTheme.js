const ACCENT_COLORS = [
  { id: 'negro',   label: 'Negro',   color: '#6b7280', mode: 'dark' },
  { id: 'azul',    label: 'Azul',    color: '#3b82f6', mode: 'dark' },
  { id: 'celeste', label: 'Celeste', color: '#06b6d4', mode: 'dark' },
  { id: 'morado',  label: 'Morado',  color: '#8b5cf6', mode: 'dark' },
  { id: 'rosado',  label: 'Rosado',  color: '#f9a8d4', mode: 'light' },

  { id: 'blanco',  label: 'Blanco',  color: '#e2e8f0', mode: 'light' },
]

export function useTheme() {
  const isDark = useState('theme-dark', () => true)
  const accentColor = useState('theme-accent', () => 'azul')

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
  }

  return { isDark, toggleTheme, initTheme, accentColor, setAccentColor, ACCENT_COLORS }
}
