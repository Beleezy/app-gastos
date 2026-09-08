<template>
  <div class="rounded-xl bg-theme-card border border-theme-border p-3.5">
    <div class="flex items-center gap-2.5 mb-2">
      <span class="text-lg leading-none">{{ categoria.categoriaIcono || '📊' }}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-theme-text truncate">
          {{ categoria.categoriaNombre }}
        </p>
        <p class="text-[0.6875rem] text-theme-text-muted">{{ subtitulo }}</p>
      </div>
      <SharedChip :variant="chipVariant" size="sm">{{ etiquetaEstado }}</SharedChip>
    </div>

    <!-- Barra de presupuesto: solo cuando el rubro está compartido entero y
         tiene límite definido. Con gastos sueltos una barra mentiría. -->
    <div v-if="p && p.tienePresupuesto" class="space-y-1.5">
      <div class="flex items-baseline justify-between text-sm">
        <SharedMoney :value="categoria.consumido" class="font-semibold text-theme-text" />
        <span class="text-theme-text-muted text-xs">
          de <SharedMoney :value="p.presupuesto" /> · {{ Math.round(p.porcentaje) }}%
        </span>
      </div>

      <div
        class="h-2 rounded-full bg-theme-border-md overflow-hidden"
        role="progressbar"
        :aria-valuenow="Math.round(p.porcentaje)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`${categoria.categoriaNombre}: ${Math.round(p.porcentaje)}% del presupuesto`"
      >
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="barraClass"
          :style="{ width: Math.min(100, p.porcentaje) + '%' }"
        />
      </div>

      <p class="text-[0.6875rem]" :class="textoProyeccionClass">{{ textoProyeccion }}</p>
      <p v-if="textoRitmo" class="text-[0.6875rem] text-theme-text-muted">{{ textoRitmo }}</p>
    </div>

    <!-- Sin presupuesto o alcance parcial: montos sin porcentajes inventados -->
    <div v-else class="space-y-1">
      <SharedMoney :value="categoria.consumido" class="text-sm font-semibold text-theme-text" />
      <p class="text-[0.6875rem] text-theme-text-muted">{{ textoSinPresupuesto }}</p>
    </div>

    <p v-if="textoComparativa" class="text-[0.6875rem] text-theme-text-muted mt-1.5">
      {{ textoComparativa }}
    </p>

    <button
      v-if="puedeAvisar"
      type="button"
      class="tap-target mt-2 text-xs font-medium text-theme-accent hover:underline"
      @click="$emit('avisar', categoria)"
    >
      Enviar aviso sobre {{ categoria.categoriaNombre }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  categoria: { type: Object, required: true },
  puedeAvisar: { type: Boolean, default: true },
})

defineEmits(['avisar'])

const p = computed(() => props.categoria.proyeccion)

const ETIQUETAS = {
  critico: 'Pasado',
  alerta: 'Ojo',
  ok: 'En orden',
  sin_presupuesto: 'Sin límite',
  parcial: 'Parcial',
}
const VARIANTES = {
  critico: 'danger',
  alerta: 'warning',
  ok: 'success',
  sin_presupuesto: 'neutral',
  parcial: 'neutral',
}

// Texto además del color: con modo daltónico activo un semáforo que solo
// cambia de color no comunica nada.
const etiquetaEstado = computed(() => ETIQUETAS[props.categoria.estado] || 'Sin datos')
const chipVariant = computed(() => VARIANTES[props.categoria.estado] || 'neutral')

const barraClass = computed(
  () =>
    ({
      critico: 'bg-red-500',
      alerta: 'bg-amber-500',
      ok: 'bg-emerald-500',
    })[props.categoria.estado] || 'bg-theme-accent',
)

const subtitulo = computed(() => {
  const n = props.categoria.cantidad
  const movimientos = n === 1 ? '1 gasto' : `${n} gastos`
  return props.categoria.alcance === 'solo_marcados'
    ? `${movimientos} · solo los que compartió a mano`
    : movimientos
})

const textoSinPresupuesto = computed(() =>
  props.categoria.alcance === 'solo_marcados'
    ? 'Son gastos sueltos: no es el total del rubro'
    : 'No definió un límite mensual para este rubro',
)

const textoProyeccion = computed(() => {
  if (!p.value?.tienePresupuesto) return ''
  const { proyectado, presupuesto, seAgotaAntesDeFin, diaAgotamiento, excedido } = p.value
  if (excedido) return `Ya se pasó por ${fmt(Math.abs(p.value.disponible))}`
  if (seAgotaAntesDeFin) {
    return `A este ritmo cierra en ${fmt(proyectado)} de ${fmt(presupuesto)} — se agota el día ${diaAgotamiento}`
  }
  return `A este ritmo cierra en ${fmt(proyectado)} de ${fmt(presupuesto)}`
})

const textoProyeccionClass = computed(() =>
  p.value?.estadoProyectado === 'critico' ? 'text-red-400 font-medium' : 'text-theme-text-muted',
)

const textoRitmo = computed(() => {
  if (!p.value?.tienePresupuesto || p.value.excedido) return ''
  const { disponible, diasRestantes, disponiblePorDia } = p.value
  if (!diasRestantes || disponiblePorDia === null) return ''
  return `Le quedan ${fmt(disponible)} → ${fmt(disponiblePorDia)} por día durante ${diasRestantes} días`
})

const textoComparativa = computed(() => {
  const v = props.categoria.variacionMesAnterior
  if (v === null || v === undefined) return ''
  if (Math.abs(v) < 1) return 'Igual que el mes pasado'
  return v > 0
    ? `${Math.round(v)}% más que el mes pasado`
    : `${Math.abs(Math.round(v))}% menos que el mes pasado`
})

// formatMontoConSimbolo ya respeta locale y moneda_preferida del usuario.
const { formatMontoConSimbolo: fmt } = useCurrency()
</script>
