<template>
  <div class="min-h-screen flex flex-col bg-primary-900">
    <main class="flex-1 pb-20 overflow-y-auto">
      <slot />
    </main>
    <LayoutBottomNav />
  </div>
</template>
