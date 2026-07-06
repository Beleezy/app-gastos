<template>
  <header class="sticky top-0 z-40 bg-theme-card backdrop-blur-sm border-b border-theme-border">
    <div class="flex items-center justify-between px-4 lg:px-6 min-h-[3.5rem] lg:min-h-[4rem] py-2 max-w-lg lg:max-w-none mx-auto gap-2">
      <!-- Mobile menu button (left side) -->
      <button
        class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
        @click="toggleDrawer"
        title="Menú"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <!-- Back button (optional) -->
      <slot name="back" />

      <!-- Title + subtitle -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <h1 class="min-w-0 truncate text-base lg:text-xl font-semibold text-theme-text leading-tight">
            <slot name="title">Mis Finanzas</slot>
          </h1>
          <!-- Badge (optional) -->
          <slot name="badge" />
        </div>
        <p v-if="$slots.subtitle" class="text-[0.6875rem] text-theme-text-muted leading-none mt-0.5 truncate">
          <slot name="subtitle" />
        </p>
      </div>

      <!-- Right-side actions -->
      <div class="shrink-0 flex items-center gap-1">
        <slot name="actions" />
      </div>
    </div>
    <!-- Optional extension below the main header row (sticky together) -->
    <slot name="below" />
  </header>
</template>

<script setup>
const { toggle: toggleDrawer } = useMobileDrawer()
</script>
