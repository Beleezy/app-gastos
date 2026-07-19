<template>
  <div class="min-h-[60vh] flex items-center justify-center px-6 text-center">
    <div class="max-w-sm">
      <p class="text-2xl mb-3" aria-hidden="true">📥</p>
      <h1 class="text-base font-semibold text-theme-text mb-2">Recibimos tu compartido</h1>
      <p class="text-sm text-theme-text-sec">
        Te llevamos al registro para que confirmes el gasto.
      </p>
    </div>
  </div>
</template>

<script setup>
// Endpoint receptor del Share Target API (manifest.share_target).
// Ver §5.4 de planifica.md.
//
// El navegador entrega los datos como query params (GET) o multipart
// (POST). Aquí los normalizamos y guardamos un draft para que la
// página /registro los recoja al montarse.

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const params = new URLSearchParams(route.fullPath.split('?')[1] || '')
  const text = params.get('text') || ''
  const title = params.get('title') || ''
  const url = params.get('url') || ''
  const combinado = [title, text, url].filter(Boolean).join(' ').trim()

  if (combinado) {
    try {
      sessionStorage.setItem(
        'gastos.shareDraft',
        JSON.stringify({ texto: combinado, ts: Date.now() }),
      )
    } catch {
      // sin sessionStorage
    }
  }

  router.replace('/registro')
})
</script>
