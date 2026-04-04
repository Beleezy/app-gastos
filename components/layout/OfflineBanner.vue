<template>
  <Transition name="banner">
    <div
      v-if="!isOnline"
      class="fixed top-0 left-0 right-0 z-[400] flex items-center justify-center gap-2 bg-red-500/95 text-white text-xs font-medium py-2 px-4 backdrop-blur-sm"
    >
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
      </svg>
      Sin conexión — los datos podrían no estar actualizados
    </div>
  </Transition>
</template>

<script setup>
const { isOnline } = useOnlineStatus()
</script>

<style scoped>
.banner-enter-active { transition: transform 0.3s ease-out; }
.banner-leave-active { transition: transform 0.25s ease-in; }
.banner-enter-from, .banner-leave-to { transform: translateY(-100%); }
</style>
