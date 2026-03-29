<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-primary-800 border-t border-primary-700/50 z-50"
       style="padding-bottom: env(safe-area-inset-bottom, 0px)">
    <div class="flex justify-around items-center h-16 max-w-lg mx-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
        :class="[
          isActive(item.to)
            ? 'text-indigo-400'
            : 'text-gray-400 hover:text-gray-200'
        ]"
      >
        <span class="text-xl mb-0.5">{{ item.icon }}</span>
        <span class="text-[11px] font-medium">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
const route = useRoute()

const navItems = [
  { to: '/planificador', icon: '\uD83D\uDCCB', label: 'Planificador' },
  { to: '/registro', icon: '\uD83C\uDF99\uFE0F', label: 'Registro' },
  { to: '/deudas', icon: '\uD83D\uDCB3', label: 'Deudas' },
]

function isActive(path) {
  return route.path === path
}
</script>
