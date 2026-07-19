<template>
  <div class="min-h-screen bg-theme-bg px-6 py-10 text-theme-text">
    <div class="max-w-md mx-auto space-y-4">
      <h1 class="text-2xl font-bold">Acceso temporal de pruebas</h1>
      <p class="text-sm text-theme-text-sec">
        Selecciona un usuario temporal para entrar sin Google (solo en entorno de pruebas).
      </p>

      <button
        v-for="u in usuarios"
        :key="u.id"
        class="w-full rounded-xl border border-theme-border bg-theme-card p-4 text-left"
        @click="entrar(u)"
      >
        <p class="font-semibold">{{ u.nombre }}</p>
        <p class="text-xs text-theme-text-sec">{{ u.email }}</p>
      </button>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const usuarios = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    nombre: 'Usuario Demo 1',
    email: 'demo1@test.local',
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    nombre: 'Usuario Demo 2',
    email: 'demo2@test.local',
  },
]

if (!config.public.devAuthBypass) {
  await navigateTo('/login', { replace: true })
}

function entrar(u) {
  localStorage.setItem('dev_auth_user_id', u.id)
  localStorage.setItem('dev_auth_user_email', u.email)
  navigateTo('/', { replace: true })
}
</script>
