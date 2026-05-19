<template>
  <div class="min-h-screen flex flex-col bg-theme-bg transition-[padding] duration-200" :class="collapsed ? 'lg:pl-16' : 'lg:pl-64'">
    <LayoutOfflineBanner />
    <LayoutSideNav />
    <main
      class="flex-1 pb-20 lg:pb-10"
      :class="isModalOpen ? 'overflow-hidden' : 'overflow-y-auto'"
    >
      <div class="w-full mx-auto max-w-full lg:max-w-6xl 2xl:max-w-7xl lg:px-6">
        <slot />
      </div>
    </main>
    <LayoutBottomNav />
    <LayoutMobileDrawer />
    <LayoutSyncQueueBadge />
    <LayoutPwaUpdatePrompt />
    <SharedToastNotification />
  </div>
</template>

<script setup>
const router = useRouter()
const { initTheme } = useTheme()
const { isModalOpen } = useModalLayer()
const { collapsed, toggle: toggleSideNav } = useSideNavCollapsed()
const { isOnline } = useOnlineStatus()
const { pending, flush } = useSyncQueue()
const { apiFetch } = useApiFetch()
const { success } = useToast()

useKeyboardShortcuts({
  'g g': () => router.push('/'),
  'g p': () => router.push('/planificador'),
  'g r': () => router.push('/registro'),
  'g d': () => router.push('/deudas'),
  'g c': () => router.push('/categorias'),
  'mod+b': () => toggleSideNav(),
})

// Al volver online, drenar cola y avisar al usuario si había pendientes.
watch(isOnline, async (online, prev) => {
  if (online && prev === false) {
    const pendientesAntes = (pending.value || []).length
    if (pendientesAntes === 0) return
    await flush(apiFetch).catch(() => {})
    const pendientesDespues = (pending.value || []).length
    const sincronizados = pendientesAntes - pendientesDespues
    if (sincronizados > 0) {
      success(`✓ Sincronizado ${sincronizados} cambio${sincronizados === 1 ? '' : 's'}`)
    }
  }
})

onMounted(initTheme)
</script>
