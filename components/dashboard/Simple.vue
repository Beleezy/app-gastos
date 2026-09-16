<template>
  <section class="px-5 lg:px-0 mb-5 space-y-3" data-testid="dashboard-simple">
    <!-- Lo gastado este mes, en grande -->
    <div class="rounded-2xl bg-theme-card border border-theme-border p-5">
      <p class="text-sm text-theme-text-sec">Este mes gastaste</p>
      <div v-if="loading" class="h-10 w-40 rounded-md bg-theme-border-md shimmer mt-1"></div>
      <p v-else class="text-3xl font-bold text-theme-text mt-1" data-testid="simple-total-mes">
        {{ currencySymbol }} {{ formatMonto(totalMes) }}
      </p>
      <p
        v-if="!loading && presupuesto > 0"
        class="text-base mt-2"
        :class="restante >= 0 ? 'text-emerald-400' : 'text-red-400'"
      >
        {{
          restante >= 0
            ? `Te quedan ${currencySymbol} ${formatMonto(restante)} del presupuesto`
            : `Te pasaste por ${currencySymbol} ${formatMonto(-restante)}`
        }}
      </p>
    </div>

    <!-- Acciones grandes -->
    <NuxtLink
      to="/registro"
      class="flex items-center gap-3 rounded-2xl bg-theme-accent text-theme-on-accent p-5 text-lg font-semibold active:opacity-90 tap-target"
      data-testid="simple-anotar"
    >
      <span class="text-2xl" aria-hidden="true">✍️</span>
      Anotar un gasto
    </NuxtLink>
    <NuxtLink
      to="/deudas"
      class="flex items-center gap-3 rounded-2xl bg-theme-card border border-theme-border text-theme-text p-5 text-lg font-semibold active:bg-theme-border-md tap-target"
      data-testid="simple-deudas"
    >
      <span class="text-2xl" aria-hidden="true">🤝</span>
      <span class="flex-1 min-w-0">Mis deudas</span>
      <span v-if="!loading && countMeDeben > 0" class="text-sm text-theme-text-sec">
        te deben {{ currencySymbol }} {{ formatMonto(totalMeDeben) }}
      </span>
    </NuxtLink>
    <NuxtLink
      to="/ingresos"
      class="flex items-center gap-3 rounded-2xl bg-theme-card border border-theme-border text-theme-text p-5 text-lg font-semibold active:bg-theme-border-md tap-target"
      data-testid="simple-ingresos"
    >
      <span class="text-2xl" aria-hidden="true">💵</span>
      Mis ingresos
    </NuxtLink>
  </section>
</template>

<script setup>
// Portada del modo simple: tres números y tres botones. Recibe lo que el
// dashboard ya cargó de /api/dashboard; no hace peticiones propias.
const props = defineProps({
  totalMes: { type: Number, default: 0 },
  presupuesto: { type: Number, default: 0 },
  totalMeDeben: { type: Number, default: 0 },
  countMeDeben: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
const { currencySymbol, formatMonto } = useCurrency()
const restante = computed(() => props.presupuesto - props.totalMes)
</script>
