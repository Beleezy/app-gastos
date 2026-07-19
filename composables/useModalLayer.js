function syncModalDomState(isModalOpen) {
  if (!import.meta.client) return

  const html = document.documentElement
  const body = document.body
  const wasOpen = body.dataset.modalOpen === 'true'

  if (isModalOpen && !wasOpen) {
    const scrollY = window.scrollY || window.pageYOffset || 0
    body.dataset.scrollY = String(scrollY)
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    html.classList.add('modal-open')
    body.dataset.modalOpen = 'true'
  } else if (!isModalOpen && wasOpen) {
    const scrollY = parseInt(body.dataset.scrollY || '0', 10)
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.width = ''
    html.classList.remove('modal-open')
    body.dataset.modalOpen = 'false'
    delete body.dataset.scrollY
    window.scrollTo(0, scrollY)
  }
}

export function useModalLayer() {
  const modalStackCount = useState('modal-stack-count', () => 0)
  const isModalOpen = computed(() => modalStackCount.value > 0)

  function registerModal() {
    modalStackCount.value += 1
    syncModalDomState(true)
  }

  function unregisterModal() {
    modalStackCount.value = Math.max(0, modalStackCount.value - 1)
    syncModalDomState(modalStackCount.value > 0)
  }

  return {
    modalStackCount,
    isModalOpen,
    registerModal,
    unregisterModal,
  }
}
