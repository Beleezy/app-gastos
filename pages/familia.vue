<template>
  <div class="min-h-screen pb-32">
    <!-- Header -->
    <div class="px-5 pt-8 pb-3 relative overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
      <div class="relative flex items-center gap-3 mb-1">
        <button
          class="w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          @click="$router.back()"
          aria-label="Volver"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center bg-fuchsia-500/15">
          <span class="text-xl">👥</span>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-theme-text">Familia</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Espacios compartidos</p>
        </div>
      </div>
    </div>

    <!-- Invitaciones pendientes -->
    <div v-if="invitacionesPendientes.length > 0" class="px-5 mb-4">
      <p class="text-[10px] text-fuchsia-300 uppercase tracking-wider font-medium mb-2">Invitaciones pendientes</p>
      <div class="space-y-2">
        <div
          v-for="inv in invitacionesPendientes"
          :key="inv.id"
          class="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-theme-text truncate">{{ inv.espacioIcono }} {{ inv.espacioNombre }}</p>
              <p class="text-[10px] text-theme-text-muted">Rol: {{ inv.rol === 'editor' ? 'Editor' : 'Lector' }}</p>
            </div>
            <button
              class="px-3 py-1.5 rounded-lg bg-fuchsia-500 text-white text-xs font-semibold"
              @click="aceptar(inv.id)"
            >Aceptar</button>
          </div>
          <p v-if="inv.mensaje" class="text-[11px] text-theme-text-sec italic">"{{ inv.mensaje }}"</p>
        </div>
      </div>
    </div>

    <!-- Nuevo espacio -->
    <div class="px-5 mb-4">
      <button
        class="w-full px-4 py-3 rounded-xl border-2 border-dashed border-fuchsia-500/30 text-fuchsia-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-fuchsia-500/5 transition-colors"
        @click="mostrarForm = !mostrarForm"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Crear espacio compartido
      </button>
    </div>

    <div v-if="mostrarForm" class="px-5 mb-4">
      <div class="bg-theme-card border border-theme-border rounded-2xl p-4 space-y-3">
        <input v-model="form.nombre" placeholder="Nombre (p. ej. Casa con Maria)" maxlength="100" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm" />
        <textarea v-model="form.descripcion" rows="2" placeholder="Descripción opcional" maxlength="500" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm"></textarea>
        <div class="flex gap-2">
          <button class="flex-1 px-4 py-2.5 rounded-xl bg-theme-input text-theme-text-sec text-sm" @click="mostrarForm = false">Cancelar</button>
          <button class="flex-1 px-4 py-2.5 rounded-xl bg-fuchsia-500 text-white text-sm font-semibold" @click="guardar" :disabled="!form.nombre">Crear</button>
        </div>
      </div>
    </div>

    <!-- Lista de espacios -->
    <div class="px-5 space-y-2">
      <div v-if="isLoading && espacios.length === 0" class="space-y-2">
        <div v-for="i in 2" :key="i" class="h-24 bg-theme-card rounded-xl shimmer"></div>
      </div>
      <div v-else-if="espacios.length === 0" class="text-center py-12">
        <div class="w-14 h-14 mx-auto rounded-full bg-fuchsia-500/10 flex items-center justify-center mb-3">
          <span class="text-2xl">👥</span>
        </div>
        <p class="text-sm text-theme-text-sec">Aún no tienes espacios compartidos</p>
        <p class="text-[11px] text-theme-text-muted mt-1">Crea uno para compartir gastos con tu pareja o familia</p>
      </div>

      <div
        v-for="e in espacios"
        :key="e.id"
        class="bg-theme-card border border-theme-border rounded-xl p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-fuchsia-500/15 flex items-center justify-center shrink-0">
              <span class="text-base">{{ e.icono || '👥' }}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm text-theme-text font-semibold truncate">{{ e.nombre }}</p>
              <p class="text-[10px] text-theme-text-muted">{{ e.totalMiembros }} miembro{{ e.totalMiembros !== 1 ? 's' : '' }} · {{ labelRol(e.rolUsuario) }}</p>
            </div>
          </div>
          <button
            v-if="e.rolUsuario === 'dueno'"
            class="px-2 py-1 rounded-lg bg-fuchsia-500/15 text-fuchsia-400 text-[10px] font-medium"
            @click="invitarA(e)"
          >+ Invitar</button>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-3">
          <div class="rounded-lg bg-theme-input px-2 py-1.5">
            <p class="text-[9px] text-theme-text-muted">Ingresos mes</p>
            <p class="text-xs font-semibold text-emerald-400">{{ currencySymbol }} {{ formatMonto(e.totalIngresosMes) }}</p>
          </div>
          <div class="rounded-lg bg-theme-input px-2 py-1.5">
            <p class="text-[9px] text-theme-text-muted">Gastos mes</p>
            <p class="text-xs font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(e.totalGastosMes) }}</p>
          </div>
          <div class="rounded-lg bg-theme-input px-2 py-1.5">
            <p class="text-[9px] text-theme-text-muted">Saldo</p>
            <p class="text-xs font-semibold" :class="e.saldoNetoMes >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ currencySymbol }} {{ formatMonto(e.saldoNetoMes) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({ title: 'Familia · Mis Finanzas' })

const ROL_LABEL = { dueno: 'Dueño', editor: 'Editor', lector: 'Lector' }

const { currencySymbol, formatMonto } = useCurrency()
const toast = useToast()
const {
  espacios, invitacionesPendientes, isLoading,
  fetchEspacios, fetchInvitaciones,
  crearEspacio, invitarMiembro, aceptarInvitacion,
} = useEspacios()

const mostrarForm = ref(false)
const form = ref({ nombre: '', descripcion: '' })

onMounted(() => {
  fetchEspacios()
  fetchInvitaciones()
})

function labelRol(r) { return ROL_LABEL[r] || r }

async function guardar() {
  try {
    await crearEspacio(form.value)
    toast.success('Espacio creado')
    form.value = { nombre: '', descripcion: '' }
    mostrarForm.value = false
    fetchEspacios()
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo crear')
  }
}

async function aceptar(id) {
  try {
    await aceptarInvitacion(id)
    toast.success('Invitación aceptada')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo aceptar')
  }
}

async function invitarA(espacio) {
  const email = prompt(`Email del miembro a invitar a "${espacio.nombre}":`)
  if (!email) return
  try {
    await invitarMiembro(espacio.id, { destinatarioEmail: email.trim().toLowerCase(), rol: 'editor' })
    toast.success(`Invitación enviada a ${email}`)
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo enviar la invitación')
  }
}
</script>
