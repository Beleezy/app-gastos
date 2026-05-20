<template>
  <div class="min-h-screen flex flex-col bg-theme-bg transition-[padding] duration-200" :class="collapsed ? 'lg:pl-16' : 'lg:pl-64'">
    <a
      href="#contenido-principal"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-theme-accent focus:text-white focus:shadow-lg"
    >
      Saltar al contenido principal
    </a>
    <LayoutOfflineBanner />
    <LazyLayoutSideNav />
    <main
      id="contenido-principal"
      class="flex-1 pb-20 lg:pb-10"
      :class="isModalOpen ? 'overflow-hidden' : 'overflow-y-auto'"
      tabindex="-1"
    >
      <div class="w-full mx-auto max-w-full lg:max-w-6xl 2xl:max-w-7xl lg:px-6">
        <slot />
      </div>
    </main>
    <LayoutBottomNav />
    <LazyLayoutMobileDrawer />
    <LayoutSyncQueueBadge />
    <LazyLayoutPwaUpdatePrompt />
    <SharedToastNotification />
    <LazyOnboardingTourOverlay />
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
const { debeMostrarTour, iniciarTour } = useOnboarding()

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

onMounted(() => {
  initTheme()
  // Tour de onboarding: baja prioridad. Antes setTimeout(600) duro; ahora
  // esperamos idle real para no competir con TTI ni con los fetches del
  // dashboard.
  const tarea = () => { if (debeMostrarTour()) iniciarTour() }
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(tarea, { timeout: 2500 })
  } else {
    setTimeout(tarea, 800)
  }
})
</script>
