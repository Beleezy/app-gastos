const ACCENT_COLORS = [
  { id: 'negro',   label: 'Negro',   color: '#6b7280' },
  { id: 'azul',    label: 'Azul',    color: '#3b82f6' },
  { id: 'celeste', label: 'Celeste', color: '#06b6d4' },
  { id: 'morado',  label: 'Morado',  color: '#8b5cf6' },
  { id: 'rosado',  label: 'Rosado',  color: '#ec4899' },
  { id: 'naranja', label: 'Naranja', color: '#f97316' },
  { id: 'verde',   label: 'Verde',   color: '#10b981' },
  { id: 'blanco',  label: 'Blanco',  color: '#e2e8f0' },
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

  function setAccentColor(id) {
    accentColor.value = id
    applyAccent(id)
  }

  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme(isDark.value)
  }

  function initTheme() {
    if (!process.client) return
    const saved = localStorage.getItem('theme')
    isDark.value = saved ? saved === 'dark' : true
    applyTheme(isDark.value)

    const savedAccent = localStorage.getItem('theme-accent')
    accentColor.value = savedAccent || 'azul'
    applyAccent(accentColor.value)
  }

  return { isDark, toggleTheme, initTheme, accentColor, setAccentColor, ACCENT_COLORS }
}
