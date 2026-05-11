<template>
  <div class="min-h-screen flex flex-col bg-theme-bg transition-[padding] duration-200" :class="collapsed ? 'lg:pl-16' : 'lg:pl-64'">
    <LayoutOfflineBanner />
    <LayoutSideNav />
    <main
      class="flex-1 pb-20 lg:pb-10"
      :class="isModalOpen ? 'overflow-hidden' : 'overflow-y-auto'"
    >
      <div class="w-full mx-auto max-w-full lg:max-w-6xl 2xl:max-w-7xl lg:px-6">
        
        <LayoutAppHeader>
          <template #title>{{ pageTitle }}</template>
        </LayoutAppHeader>

        <div class="px-4 lg:px-0 pt-2 pb-2 lg:pt-3">
          <div class="flex items-center gap-1 bg-theme-card/60 rounded-2xl p-1 border border-theme-border/50 overflow-x-auto hide-scrollbar">
            <NuxtLink
              to="/planificador?seccion=mensual"
              class="flex flex-1 justify-center items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0"
              :class="activeTab === 'mensual' ? 'bg-theme-accent text-theme-on-accent shadow-md shadow-theme-accent/20' : 'text-theme-text-muted hover:text-theme-text-sec'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
              </svg>
              Mensual
            </NuxtLink>
            <NuxtLink
              to="/futuros"
              class="flex flex-1 justify-center items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0"
              :class="activeTab === 'futuros' ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20' : 'text-violet-400 hover:bg-violet-500/10'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
              </svg>
              Futuros
            </NuxtLink>
            <NuxtLink
              to="/ahorros"
              class="flex flex-1 justify-center items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0"
              :class="activeTab === 'ahorros' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-emerald-400 hover:bg-emerald-500/10'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Ahorros
            </NuxtLink>
          </div>
        </div>

        <slot />

      </div>
    </main>
    <LayoutBottomNav />
    <LayoutMobileDrawer />
    <SharedToastNotification />
  </div>
</template>

<script setup>
const router = useRouter()
const { initTheme } = useTheme()
const { isModalOpen } = useModalLayer()
const { collapsed, toggle: toggleSideNav } = useSideNavCollapsed()

useKeyboardShortcuts({
  'g g': () => router.push('/'),
  'g p': () => router.push('/planificador'),
  'g r': () => router.push('/registro'),
  'g d': () => router.push('/deudas'),
  'g c': () => router.push('/categorias'),
  'mod+b': () => toggleSideNav(),
})

onMounted(initTheme)

const route = useRoute()

const activeTab = computed(() => {
  if (route.path.includes('/ahorros')) return 'ahorros'
  if (route.path.includes('/futuros')) return 'futuros'
  return 'mensual'
})

const pageTitle = computed(() => {
  if (activeTab.value === 'ahorros') return 'Ahorros'
  if (activeTab.value === 'futuros') return 'Gastos futuros'
  return 'Planificador'
})
</script>
