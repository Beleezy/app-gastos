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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-theme-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      </div>
      <div v-if="!collapsed" class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-theme-text leading-tight truncate">Mis Finanzas</p>
        <p class="text-[0.6875rem] text-theme-text-muted leading-tight truncate">
          Control personal
        </p>
      </div>
      <button
        v-if="!collapsed"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors"
        title="Colapsar (mod+b)"
        @click="toggle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
    </div>

    <!-- Main nav -->
    <nav class="flex-1 overflow-y-auto py-4 space-y-1" :class="collapsed ? 'px-2' : 'px-3'">
      <p
        v-if="!collapsed"
        class="text-[0.6875rem] font-semibold uppercase tracking-wider text-theme-text-muted px-3 mb-2"
      >
        Principal
      </p>
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="group relative flex items-center gap-3 rounded-xl transition-all duration-200"
        :class="[
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          isActive(item.to)
            ? 'bg-theme-accent-bg text-theme-accent font-semibold'
            : 'text-theme-text-sec hover:bg-theme-border-md hover:text-theme-text',
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
            class="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[0.6875rem] font-bold flex items-center justify-center leading-none"
            >{{ getBadge(item.to) > 99 ? '99+' : getBadge(item.to) }}</span
          >
        </div>
        <span v-if="!collapsed" class="text-sm flex-1 truncate">{{ item.label }}</span>
      </NuxtLink>

      <p
        v-if="!collapsed"
        class="text-[0.6875rem] font-semibold uppercase tracking-wider text-theme-text-muted px-3 mt-6 mb-2"
      >
        Ajustes
      </p>
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
            : 'text-theme-text-sec hover:bg-theme-border-md hover:text-theme-text',
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
          <p class="text-[0.6875rem] uppercase tracking-wider text-theme-text-muted">
            Saldo del mes
          </p>
          <p class="text-base font-bold text-theme-text tabular-nums truncate">{{ saldoFmt }}</p>
        </div>
        <div
          v-if="deudasVencidas > 0"
          class="flex items-center gap-2 text-[0.6875rem] text-red-500"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          {{ deudasVencidas }} deuda{{ deudasVencidas === 1 ? '' : 's' }} vencida{{
            deudasVencidas === 1 ? '' : 's'
          }}
        </div>
      </div>
      <button
        v-else
        class="w-full h-10 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors"
        title="Expandir (mod+b)"
        @click="toggle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
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

const deudasVencidas = computed(() => personas.value.filter((p) => p.tieneVencidas).length)

const saldoFmt = computed(() => {
  const r = resumenPlan.value || {}
  const saldo = r.saldoProyectado ?? r.saldo ?? r.montoPresupuesto ?? 0
  try {
    return formatMontoConSimbolo(saldo)
  } catch {
    return `S/ ${Number(saldo).toFixed(2)}`
  }
})

function getBadge(path) {
  if (path === '/deudas') return deudasVencidas.value + vinculosPendientes.value
  if (path === '/planificador') return resumenPlan.value.countPendientes
  return 0
}

const makeIcon = (d) => () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      'stroke-width': '1.75',
      stroke: 'currentColor',
    },
    [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d })],
  )

const IconHome = makeIcon(
  'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
)
const IconClipboard = makeIcon(
  'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
)
const IconMic = makeIcon(
  'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
)
const IconCreditCard = makeIcon(
  'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
)
const IconCog = makeIcon(
  'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z',
)
const IconTag = makeIcon(
  'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z',
)
const IconInfo = makeIcon(
  'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
)
const IconSparkles = makeIcon(
  'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z',
)
const IconPiggyBank = makeIcon(
  'M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3',
)
const IconArrowDownCircle = makeIcon(
  'M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a9 9 0 1118 0 9 9 0 01-18 0z',
)
const IconUsers = makeIcon(
  'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
)
const IconTrash = makeIcon(
  'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
)
const IconChartLine = makeIcon('M3 3v18h18M7 14l4-4 4 4 5-5')
const IconReporte = makeIcon(
  'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
)
const IconCalendarDays = makeIcon(
  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
)

const navItems = [
  { to: '/', icon: IconHome, label: 'Inicio' },
  { to: '/planificador', icon: IconClipboard, label: 'Planificador' },
  { to: '/registro', icon: IconMic, label: 'Registro' },
  { to: '/ingresos', icon: IconArrowDownCircle, label: 'Ingresos' },
  { to: '/deudas', icon: IconCreditCard, label: 'Deudas' },
  { to: '/futuros', icon: IconSparkles, label: 'Gastos futuros' },
  { to: '/ahorros', icon: IconPiggyBank, label: 'Ahorros' },
  { to: '/familia', icon: IconUsers, label: 'Familia' },
]

const secondaryItems = [
  { to: '/metricas', icon: IconChartLine, label: 'Métricas' },
  { to: '/reportes', icon: IconReporte, label: 'Reportes' },
  { to: '/calendario', icon: IconCalendarDays, label: 'Calendario' },
  { to: '/categorias', icon: IconTag, label: 'Categorías' },
  { to: '/papelera', icon: IconTrash, label: 'Papelera' },
  { to: '/configuraciones', icon: IconCog, label: 'Configuraciones' },
  { to: '/informacion', icon: IconInfo, label: 'Información' },
]

function isActive(itemTo) {
  if (itemTo === '/') return route.path === '/'
  if (itemTo.includes('?')) {
    const [path, qs] = itemTo.split('?')
    const params = new URLSearchParams(qs)
    if (route.path !== path) return false
    for (const [k, v] of params) {
      if (route.query[k] !== v) return false
    }
    return true
  }
  return route.path === itemTo || route.path.startsWith(itemTo + '/')
}
</script>

<style scoped>
.side-nav {
  background: var(--color-card);
  border-right: 1px solid var(--color-border);
  box-shadow: 4px 0 30px rgba(0, 0, 0, 0.1);
}
</style>
