<template>
  <header class="sticky top-0 z-40 bg-primary-800/95 backdrop-blur-sm border-b border-primary-700/50">
    <div class="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
      <h1 class="text-lg font-semibold text-white">
        <slot name="title">Mis Finanzas</slot>
      </h1>
      <div>
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
