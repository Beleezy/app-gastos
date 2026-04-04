export function useTheme() {
  const isDark = useState('theme-dark', () => true)

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

  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme(isDark.value)
  }

  function initTheme() {
    if (!process.client) return
    const saved = localStorage.getItem('theme')
    isDark.value = saved ? saved === 'dark' : true
    applyTheme(isDark.value)
  }

  return { isDark, toggleTheme, initTheme }
}
