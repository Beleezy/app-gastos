<template>
  <div class="bg-theme-card border border-theme-border rounded-2xl p-4">
    <p class="text-sm font-semibold text-theme-text mb-1">Compartir mis gastos</p>
    <p class="text-xs text-theme-text-muted mb-3">
      Dejá que alguien vea en qué estás gastando para que te avise antes de pasarte. No ve tu cuenta
      ni puede editar nada.
    </p>

    <dl class="grid grid-cols-2 gap-2 mb-3">
      <div class="rounded-xl bg-theme-input px-3 py-2">
        <dt class="text-[0.6875rem] text-theme-text-muted">Comparto con</dt>
        <dd class="text-sm font-semibold text-theme-text">{{ compartoCon.length }}</dd>
      </div>
      <div class="rounded-xl bg-theme-input px-3 py-2">
        <dt class="text-[0.6875rem] text-theme-text-muted">Me comparten</dt>
        <dd class="text-sm font-semibold text-theme-text">{{ meComparten.length }}</dd>
      </div>
    </dl>

    <NuxtLink
      to="/compartido"
      class="tap-target flex items-center justify-center w-full py-2.5 rounded-xl bg-theme-input border border-theme-border text-sm font-medium text-theme-text-sec hover:border-theme-accent transition-colors"
    >
      Abrir Compartido
    </NuxtLink>
  </div>
</template>

<script setup>
const { compartoCon, meComparten, fetchConexiones } = useCompartido()
onMounted(() => fetchConexiones().catch(() => {}))
</script>
