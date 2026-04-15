const STORAGE_KEY = 'sidenav:collapsed'

const collapsed = ref(false)
let initialized = false

function initFromStorage() {
  if (initialized || !import.meta.client) return
  initialized = true
  try {
    collapsed.value = localStorage.getItem(STORAGE_KEY) === '1'
  } catch {}
}

export function useSideNavCollapsed() {
  initFromStorage()

  function toggle() {
    collapsed.value = !collapsed.value
    if (import.meta.client) {
      try { localStorage.setItem(STORAGE_KEY, collapsed.value ? '1' : '0') } catch {}
    }
  }

  return { collapsed, toggle }
}
