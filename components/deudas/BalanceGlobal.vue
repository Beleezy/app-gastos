<template>
  <section
    class="bg-theme-card rounded-2xl border border-theme-border overflow-hidden"
    aria-labelledby="balance-global-title"
  >
    <!-- Header colapsado: una sola línea con balance neto -->
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 px-4 py-3 md:px-5 hover:bg-theme-input/40 transition-colors"
      :aria-expanded="expanded"
      aria-controls="balance-global-body"
      @click="toggleExpand"
    >
      <div class="flex items-center gap-2 min-w-0">
        <h2 id="balance-global-title" class="text-sm font-semibold text-theme-text">
          Balance global
        </h2>
        <span
          v-if="!cargando && !error"
          class="text-sm font-semibold tabular-nums truncate"
          :class="balance.balanceNeto >= 0 ? 'text-emerald-400' : 'text-red-400'"
        >
          {{ balance.balanceNeto >= 0 ? '+' : '' }}{{ formatCurrency(balance.balanceNeto || 0) }}
        </span>
        <span v-else-if="cargando" class="text-xs text-theme-text-sec">Cargando…</span>
        <span v-else-if="error" class="text-xs text-red-400">Error</span>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4 text-theme-text-sec shrink-0 transition-transform"
        :class="expanded ? 'rotate-180' : ''"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Cuerpo expandido -->
    <div v-if="expanded" id="balance-global-body" class="px-4 pb-4 md:px-5 md:pb-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs text-theme-text-sec">Suma de saldos pendientes en ambos sentidos</p>
        <button
          type="button"
          class="tap-target h-8 w-8 rounded-full flex items-center justify-center text-theme-text-sec hover:text-theme-text transition-colors"
          :disabled="cargando"
          aria-label="Actualizar balance"
          @click.stop="recargar"
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
      </div>

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
    </div>
  </section>
</template>

<script setup>
const { formatCurrency } = useFormatters()

// Estado compartido en useDeudas: las mutaciones (crear deuda, pagar,
// saldar, eliminar) lo invalidan vía invalidarResumenes(), así el balance
// nunca queda stale tras escribir (F4).
const { balance, balanceCargando: cargando, balanceError: error, fetchBalance } = useDeudas()

const expanded = ref(false)

const topPersonas = computed(() => (balance.value.personas || []).slice(0, 5))

function toggleExpand() {
  expanded.value = !expanded.value
}

function recargar() {
  return fetchBalance({ noCache: true })
}

onMounted(() => fetchBalance())
</script>
