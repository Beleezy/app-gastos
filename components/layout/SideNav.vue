<template>
  <aside
    class="hidden lg:flex fixed top-0 left-0 bottom-0 z-40 flex-col side-nav transition-[width] duration-200"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <!-- Branding -->
    <div
      class="flex items-center gap-3 h-16 border-b border-theme-border shrink-0"
      :class="collapsed ? 'px-3 justify-center' : 'px-5'"
    >
      <div class="w-9 h-9 rounded-xl bg-theme-accent-bg flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <div v-if="!collapsed" class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-theme-text leading-tight truncate">Mis Finanzas</p>
        <p class="text-[11px] text-theme-text-muted leading-tight truncate">Control personal</p>
      </div>
      <button
        v-if="!collapsed"
        @click="toggle"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors"
        title="Colapsar (mod+b)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
    </div>

    <!-- Main nav -->
    <nav class="flex-1 overflow-y-auto py-4 space-y-1" :class="collapsed ? 'px-2' : 'px-3'">
      <p v-if="!collapsed" class="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted px-3 mb-2">Principal</p>
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="group relative flex items-center gap-3 rounded-xl transition-all duration-200"
        :class="[
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          isActive(item.to)
            ? 'bg-theme-accent-bg text-theme-accent font-semibold'
            : 'text-theme-text-sec hover:bg-theme-border-md hover:text-theme-text'
        ]"
        :title="collapsed ? item.label : undefined"
      >
        <span
          v-if="!collapsed"
          class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full transition-all duration-200"
          :class="isActive(item.to) ? 'bg-theme-accent' : 'bg-transparent'"
        ></span>
        <div class="relative shrink-0">
          <component :is="item.icon" class="w-5 h-5" />
          <span
            v-if="getBadge(item.to) > 0"
            class="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
          >{{ getBadge(item.to) > 99 ? '99+' : getBadge(item.to) }}</span>
        </div>
        <span v-if="!collapsed" class="text-sm flex-1 truncate">{{ item.label }}</span>
      </NuxtLink>

      <p v-if="!collapsed" class="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted px-3 mt-6 mb-2">Ajustes</p>
      <div v-else class="my-3 mx-auto w-8 border-t border-theme-border"></div>
      <NuxtLink
        v-for="item in secondaryItems"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-3 rounded-xl transition-all duration-200"
        :class="[
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          isActive(item.to)
            ? 'bg-theme-accent-bg text-theme-accent font-semibold'
            : 'text-theme-text-sec hover:bg-theme-border-md hover:text-theme-text'
        ]"
        :title="collapsed ? item.label : undefined"
      >
        <component :is="item.icon" class="w-5 h-5 shrink-0" />
        <span v-if="!collapsed" class="text-sm flex-1 truncate">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- Bottom widget: saldo + deudas vencidas -->
    <div class="shrink-0 border-t border-theme-border" :class="collapsed ? 'p-2' : 'p-3'">
      <div v-if="!collapsed" class="rounded-xl bg-theme-border-md/40 p-3 space-y-2">
        <div>
          <p class="text-[10px] uppercase tracking-wider text-theme-text-muted">Saldo del mes</p>
          <p class="text-base font-bold text-theme-text tabular-nums truncate">{{ saldoFmt }}</p>
        </div>
        <div v-if="deudasVencidas > 0" class="flex items-center gap-2 text-[11px] text-red-500">
          <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          {{ deudasVencidas }} deuda{{ deudasVencidas === 1 ? '' : 's' }} vencida{{ deudasVencidas === 1 ? '' : 's' }}
        </div>
      </div>
      <button
        v-else
        @click="toggle"
        class="w-full h-10 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors"
        title="Expandir (mod+b)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { h } from 'vue'

const route = useRoute()

const { personas } = useDeudas()
const { resumen: resumenPlan } = usePlanificador()
const { countPendientes: vinculosPendientes } = useVinculos()
const { collapsed, toggle } = useSideNavCollapsed()
const { formatMontoConSimbolo } = useCurrency()

const deudasVencidas = computed(() =>
  personas.value.filter(p => p.tieneVencidas).length
)

const saldoFmt = computed(() => {
  const r = resumenPlan.value || {}
  const saldo = r.saldoProyectado ?? r.saldo ?? r.montoPresupuesto ?? 0
  try { return formatMontoConSimbolo(saldo) } catch { return `S/ ${Number(saldo).toFixed(2)}` }
})

function getBadge(path) {
  if (path === '/deudas') return deudasVencidas.value + vinculosPendientes.value
  if (path === '/planificador') return resumenPlan.value.countPendientes
  return 0
}

const makeIcon = (d) => () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
  'stroke-width': '1.75',
  stroke: 'currentColor'
}, [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d })])

const IconHome = makeIcon('M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25')
const IconClipboard = makeIcon('M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z')
const IconMic = makeIcon('M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z')
const IconCreditCard = makeIcon('M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z')
const IconCog = makeIcon('M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z')
const IconTag = makeIcon('M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z')
const IconInfo = makeIcon('M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z')

const navItems = [
  { to: '/', icon: IconHome, label: 'Inicio' },
  { to: '/planificador', icon: IconClipboard, label: 'Planificador' },
  { to: '/registro', icon: IconMic, label: 'Registro' },
  { to: '/deudas', icon: IconCreditCard, label: 'Deudas' },
]

const secondaryItems = [
  { to: '/categorias', icon: IconTag, label: 'Categorías' },
  { to: '/configuraciones', icon: IconCog, label: 'Configuraciones' },
  { to: '/informacion', icon: IconInfo, label: 'Información' },
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
.side-nav {
  background: var(--color-card);
  border-right: 1px solid var(--color-border);
  box-shadow: 4px 0 30px rgba(0, 0, 0, 0.1);
}
</style>
