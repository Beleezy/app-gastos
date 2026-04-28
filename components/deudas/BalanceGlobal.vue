<template>
  <section
    class="bg-theme-card rounded-2xl border border-theme-border p-4 md:p-5"
    aria-labelledby="balance-global-title"
  >
    <header class="flex items-center justify-between mb-4">
      <div>
        <h2 id="balance-global-title" class="text-base md:text-lg font-semibold text-theme-text">
          Balance global
        </h2>
        <p class="text-xs text-theme-text-sec">Suma de saldos pendientes en ambos sentidos</p>
      </div>
      <button
        type="button"
        class="tap-target h-9 w-9 rounded-full flex items-center justify-center text-theme-text-sec hover:text-theme-text transition-colors"
        :disabled="cargando"
        aria-label="Actualizar balance"
        @click="recargar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          :class="cargando ? 'animate-spin' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m0 0a8.003 8.003 0 01-15.357-2" />
        </svg>
      </button>
    </header>

    <div v-if="cargando" class="grid grid-cols-3 gap-3">
      <SharedSkeletonLoader variant="line" count="3" />
    </div>

    <SharedEmptyState
      v-else-if="error"
      variant="error"
      title="No pudimos cargar el balance"
      :message="error"
      action-label="Reintentar"
      compact
      @action="recargar"
    />

    <div v-else class="space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-xl bg-theme-input p-3 text-center">
          <p class="text-[0.65rem] uppercase tracking-wide text-theme-text-sec">Te deben</p>
          <p class="text-base md:text-lg font-semibold text-emerald-400">
            {{ formatCurrency(balance.totalMeDeben || 0) }}
          </p>
        </div>
        <div class="rounded-xl bg-theme-input p-3 text-center">
          <p class="text-[0.65rem] uppercase tracking-wide text-theme-text-sec">Debes</p>
          <p class="text-base md:text-lg font-semibold text-red-400">
            {{ formatCurrency(balance.totalYoDebo || 0) }}
          </p>
        </div>
        <div
          class="rounded-xl p-3 text-center border"
          :class="balance.balanceNeto >= 0
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-red-500/30 bg-red-500/5'"
        >
          <p class="text-[0.65rem] uppercase tracking-wide text-theme-text-sec">Neto</p>
          <p
            class="text-base md:text-lg font-semibold"
            :class="balance.balanceNeto >= 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ formatCurrency(balance.balanceNeto || 0) }}
          </p>
        </div>
      </div>

      <div v-if="topPersonas.length > 0">
        <h3 class="text-xs font-semibold text-theme-text-sec mb-2">
          Top {{ topPersonas.length }} por impacto
        </h3>
        <ul class="space-y-2">
          <li
            v-for="p in topPersonas"
            :key="p.personaId"
            class="flex items-center gap-3 px-3 py-2 rounded-xl bg-theme-input"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-theme-text truncate">{{ p.persona }}</p>
              <p class="text-[0.7rem] text-theme-text-sec">
                te debe {{ formatCurrency(p.meDeben) }} · debes {{ formatCurrency(p.yoDebo) }}
              </p>
            </div>
            <span
              class="text-sm font-semibold tabular-nums"
              :class="p.balance >= 0 ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ p.balance >= 0 ? '+' : '' }}{{ formatCurrency(p.balance) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const { formatCurrency } = useFormatters()

const balance = ref({ totalMeDeben: 0, totalYoDebo: 0, balanceNeto: 0, personas: [] })
const cargando = ref(false)
const error = ref(null)

const topPersonas = computed(() => (balance.value.personas || []).slice(0, 5))

async function recargar() {
  cargando.value = true
  error.value = null
  try {
    balance.value = await apiFetch('/api/deudas/balance')
  } catch (e) {
    error.value = e?.data?.message || e?.message || 'Error desconocido'
  } finally {
    cargando.value = false
  }
}

onMounted(recargar)
</script>
