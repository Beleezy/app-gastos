import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from '#imports'

export function useModalBack(closeCallback) {
  const route = useRoute()
  const router = useRouter()
  const modalHash = '#modal-' + Math.random().toString(36).substring(2, 9)
  
  let intendedClose = false

  const handleHashChange = () => {
    // If the hash changed and it's no longer our modal's hash, it means user pressed back
    if (route.hash !== modalHash) {
      intendedClose = true
      closeCallback() // Trigger the close locally
    }
  }

  onMounted(() => {
    // Push the hash to the URL to create a history entry gracefully
    router.push({ hash: modalHash })
    window.addEventListener('popstate', handleHashChange)
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', handleHashChange)
    
    // If the component is unmounting (e.g. they clicked an X button to close it)
    // we need to clean up the URL hash so it doesn't linger or break future navigation.
    if (!intendedClose && route.hash === modalHash) {
      router.back()
    }
  })
}
