<template>
  <header class="sticky top-0 z-40 bg-theme-card backdrop-blur-sm border-b border-theme-border">
    <div class="flex items-center justify-between px-4 h-14 max-w-lg mx-auto gap-2">
      <!-- Back button (optional) -->
      <slot name="back" />

      <!-- Title + subtitle -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-semibold text-theme-text truncate">
            <slot name="title">Mis Finanzas</slot>
          </h1>
          <!-- Badge (optional) -->
          <slot name="badge" />
        </div>
        <p v-if="$slots.subtitle" class="text-[11px] text-theme-text-muted leading-none mt-0.5 truncate">
          <slot name="subtitle" />
        </p>
      </div>

      <!-- Right-side actions -->
      <div class="shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
