<template>
  <Transition name="banner">
    <!-- En flujo (no fixed): empuja el contenido hacia abajo en vez de tapar
         los headers sticky de las páginas. Al hacer scroll se va con el
         documento; el usuario siempre puede descartarlo. -->
    <div
      v-if="visible"
      class="relative z-30 flex items-center gap-2 bg-amber-500/95 text-white text-xs font-medium py-1 pl-4 pr-1.5 shadow-md"
    >
      <svg
        class="w-3.5 h-3.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
      <!-- line-clamp-2 en vez de truncate: con dos recordatorios a 380px el
           segundo quedaba ilegible ("…7 deu…") (UX-1) -->
      <button
        type="button"
        class="flex-1 min-h-[2.5rem] py-1 text-left line-clamp-2 break-words"
        @click="irA"
      >
        {{ mensaje }}
      </button>
      <button
        type="button"
        class="shrink-0 w-10 h-10 rounded-md hover:bg-white/20 flex items-center justify-center"
        aria-label="Descartar recordatorios"
        @click="cerrar"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const { isOnline } = useOnlineStatus()
const router = useRouter()
// Módulo Compartido: las alertas ya vienen en el estado que carga el badge
// de navegación. Leerlas de ahí evita recalcular lo mismo en el servidor
// una segunda vez solo para este banner.
const { novedades: novedadesCompartido, fetchNovedades } = useCompartido()

const STORAGE_KEY = 'recordatorios.dismissed'
const data = ref(null)
const dismissed = ref(false)

const alertasCompartido = computed(() => novedadesCompartido.value?.totalAlertas || 0)

const visible = computed(
  () => !dismissed.value && ((data.value?.total || 0) > 0 || alertasCompartido.value > 0),
)

const mensaje = computed(() => {
  const p = data.value?.planificados?.length || 0
  const d = data.value?.deudas?.length || 0
  const partes = []
  if (p) partes.push(`${p} gasto${p > 1 ? 's' : ''} planificado${p > 1 ? 's' : ''} para mañana`)
  if (d) partes.push(`${d} deuda${d > 1 ? 's' : ''} vencida${d > 1 ? 's' : ''}`)

  // La alerta más urgente con nombre y cifras: "Ana va 450 de 600 en Comida"
  // dice más que "1 alerta" y es justo el aviso que el módulo existe para dar.
  const alerta = alertaDestacada.value
  if (alerta) {
    partes.push(
      `${alerta.emisorNombre} va en ${alerta.categoriaNombre} al ${Math.round(alerta.porcentaje)}%`,
    )
    const otras = alertasCompartido.value - 1
    if (otras > 0) partes.push(`+${otras} alerta${otras > 1 ? 's' : ''} más`)
  }
  return partes.join(' · ')
})

const alertaDestacada = computed(() => {
  for (const c of novedadesCompartido.value?.conexiones || []) {
    const critica = c.alertas.find((a) => a.estado === 'critico') || c.alertas[0]
    if (critica) return { ...critica, emisorNombre: c.emisorNombre }
  }
  return null
})

function irA() {
  let ruta = '/deudas'
  if (data.value?.planificados?.length) ruta = '/planificador'
  else if (!data.value?.deudas?.length && alertasCompartido.value > 0) ruta = '/compartido'
  cerrar()
  router.push(ruta)
}

function cerrar() {
  dismissed.value = true
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {}
}

onMounted(async () => {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      dismissed.value = true
      return
    }
  } catch {}
  if (!isOnline.value) return
  try {
    data.value = await apiFetch('/api/recordatorios')
  } catch {}
  // Si el prefetch en idle aún no corrió, pedirlas acá.
  if (!novedadesCompartido.value) await fetchNovedades()
})
</script>

<style scoped>
.banner-enter-active {
  transition:
    opacity 0.3s ease-out,
    transform 0.3s ease-out;
}
.banner-leave-active {
  transition: opacity 0.2s ease-in;
}
.banner-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.banner-leave-to {
  opacity: 0;
}
</style>
