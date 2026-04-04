export function useOnlineStatus() {
  const isOnline = useState('online-status', () => true)

  if (process.client) {
    isOnline.value = navigator.onLine
    useEventListener(window, 'online', () => { isOnline.value = true })
    useEventListener(window, 'offline', () => { isOnline.value = false })
  }

  return { isOnline }
}
