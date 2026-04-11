<template>
  <div class="min-h-screen flex flex-col bg-theme-bg">
    <LayoutOfflineBanner />
    <main class="flex-1 pb-20 overflow-y-auto">
      <slot />
    </main>
    <LayoutBottomNav />
    <SharedToastNotification />
  </div>
</template>

<script setup>
const { initTheme } = useTheme()
onMounted(initTheme)
</script>
