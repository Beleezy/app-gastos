export function useToast() {
  const toasts = useState('toasts', () => [])

  function show({ message, type = 'info', duration = 3000 }) {
    const id = Date.now() + Math.random()
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  return {
    toasts,
    success: (msg, duration) => show({ message: msg, type: 'success', duration }),
    error: (msg, duration) => show({ message: msg, type: 'error', duration: duration ?? 4000 }),
    warning: (msg, duration) => show({ message: msg, type: 'warning', duration }),
    info: (msg, duration) => show({ message: msg, type: 'info', duration }),
  }
}
