export function useToast() {
  const toasts = useState('toasts', () => [])

  function dismiss(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show({ message, type = 'info', duration = 3000, action = null }) {
    const id = Date.now() + Math.random()
    const toast = { id, message, type, action: null }
    if (action && typeof action.onClick === 'function') {
      toast.action = {
        label: action.label || 'Deshacer',
        onClick: () => {
          action.onClick()
          dismiss(id)
        },
      }
    }
    toasts.value.push(toast)
    setTimeout(() => dismiss(id), duration)
    return id
  }

  return {
    toasts,
    show,
    dismiss,
    success: (msg, duration) => show({ message: msg, type: 'success', duration }),
    error: (msg, duration) => show({ message: msg, type: 'error', duration: duration ?? 4000 }),
    warning: (msg, duration) => show({ message: msg, type: 'warning', duration }),
    info: (msg, duration) => show({ message: msg, type: 'info', duration }),
  }
}
