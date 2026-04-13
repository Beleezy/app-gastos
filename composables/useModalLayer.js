function syncModalDomState(isModalOpen) {
  if (!process.client) return

  document.documentElement.classList.toggle('modal-open', isModalOpen)
  document.body.dataset.modalOpen = isModalOpen ? 'true' : 'false'
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
