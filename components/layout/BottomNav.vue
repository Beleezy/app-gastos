<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 nav-glass"
       style="padding-bottom: env(safe-area-inset-bottom, 0px)">
    <div class="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 group"
        :class="[
          isActive(item.to)
            ? 'text-blue-400'
            : 'text-theme-text-muted hover:text-theme-text-sec'
        ]"
      >
        <!-- Active indicator pill -->
        <div
          class="absolute -top-0.5 w-8 h-1 rounded-full transition-all duration-300"
          :class="isActive(item.to) ? 'bg-blue-400 shadow-sm shadow-blue-400/50' : 'bg-transparent'"
        ></div>

        <!-- Icon container -->
        <div class="relative">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 mb-0.5"
            :class="isActive(item.to) ? 'bg-blue-500/15 scale-105' : 'group-hover:bg-primary-700/30'"
          >
            <component :is="item.icon" class="w-6 h-6 transition-transform duration-300" :class="isActive(item.to) ? 'scale-110' : ''" />
          </div>
          <!-- Badge -->
          <span
            v-if="getBadge(item.to) > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
          >{{ getBadge(item.to) > 99 ? '99+' : getBadge(item.to) }}</span>
        </div>

        <span
          class="text-[10px] font-semibold transition-all duration-300 leading-none"
          :class="isActive(item.to) ? 'text-blue-400 opacity-100' : 'opacity-70'"
        >{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
const route = useRoute()

const { personas } = useDeudas()
const { resumen: resumenPlan } = usePlanificador()
const { countPendientes: vinculosPendientes } = useVinculos()

const deudasVencidas = computed(() =>
  personas.value.filter(p => p.tieneVencidas).length
)

function getBadge(path) {
  if (path === '/deudas') return deudasVencidas.value + vinculosPendientes.value
  if (path === '/planificador') return resumenPlan.value.countPendientes
  return 0
}

// SVG icon components usando render functions (evita necesitar el compilador Vue en runtime)
import { h } from 'vue'

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

const navItems = [
  { to: '/', icon: IconHome, label: 'Inicio' },
  { to: '/planificador', icon: IconClipboard, label: 'Planificador' },
  { to: '/registro', icon: IconMic, label: 'Registro' },
  { to: '/deudas', icon: IconCreditCard, label: 'Deudas' },
]

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.nav-glass {
  background: var(--color-nav);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.3);
}
</style>
