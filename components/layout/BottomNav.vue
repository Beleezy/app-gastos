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
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        <!-- Active indicator pill -->
        <div
          class="absolute -top-0.5 w-8 h-1 rounded-full transition-all duration-300"
          :class="isActive(item.to) ? 'bg-blue-400 shadow-sm shadow-blue-400/50' : 'bg-transparent'"
        ></div>

        <!-- Icon container -->
        <div
          class="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 mb-0.5"
          :class="isActive(item.to) ? 'bg-blue-500/15 scale-105' : 'group-hover:bg-primary-700/30'"
        >
          <span class="text-xl transition-transform duration-300" :class="isActive(item.to) ? 'scale-110' : ''">{{ item.icon }}</span>
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

const navItems = [
  { to: '/', icon: '\uD83C\uDFE0', label: 'Inicio' },
  { to: '/planificador', icon: '\uD83D\uDCCB', label: 'Planificador' },
  { to: '/registro', icon: '\uD83C\uDF99\uFE0F', label: 'Registro' },
  { to: '/deudas', icon: '\uD83D\uDCB3', label: 'Deudas' },
]

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.nav-glass {
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.3);
}
</style>
