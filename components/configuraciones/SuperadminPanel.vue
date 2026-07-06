<template>
  <NuxtLink
    v-if="esSuperadmin"
    to="/control-acceso"
    class="block bg-theme-card rounded-2xl p-5 border border-theme-accent/30 mt-4 active:bg-theme-border-md transition-colors"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-10 h-10 rounded-xl bg-theme-accent/15 flex items-center justify-center text-theme-accent shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-semibold text-theme-text whitespace-nowrap">Control de acceso</h3>
            <span class="px-2 py-0.5 rounded-full bg-theme-accent text-theme-on-accent text-[0.6875rem] font-bold uppercase tracking-wider shrink-0">Superadmin</span>
          </div>
          <p class="text-sm text-theme-text-sec leading-relaxed">Aprueba o limita quién puede usar el sistema.</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span v-if="pendientes.length" class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[0.6875rem] font-semibold">
          {{ pendientes.length }} pend.
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
const { esSuperadmin, pendientes, fetchMe, fetchAcceso } = useSuperadmin()

onMounted(async () => {
  await fetchMe()
  if (esSuperadmin.value) await fetchAcceso()
})
</script>
