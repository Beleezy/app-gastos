<template>
  <section class="rounded-2xl bg-theme-card border border-theme-border p-5">
    <h2 class="text-base font-semibold text-theme-text mb-1">Cómo funciona</h2>
    <p class="text-xs text-theme-text-muted mb-4">
      Sirve para que alguien de confianza sepa cómo va tu mes y pueda avisarte antes de que te
      pases. No es dividir gastos ni prestar plata — eso es Deudas.
    </p>

    <ol class="space-y-3.5">
      <li v-for="(paso, i) in PASOS" :key="paso.titulo" class="flex gap-3">
        <span
          class="w-6 h-6 rounded-full bg-theme-accent-bg text-theme-accent text-xs font-bold flex items-center justify-center shrink-0"
          aria-hidden="true"
          >{{ i + 1 }}</span
        >
        <div class="min-w-0">
          <p class="text-sm font-medium text-theme-text">{{ paso.titulo }}</p>
          <p class="text-[0.6875rem] text-theme-text-muted mt-0.5">{{ paso.detalle }}</p>
        </div>
      </li>
    </ol>

    <button
      type="button"
      class="tap-target w-full mt-5 py-3 rounded-xl bg-theme-accent text-theme-on-accent font-semibold text-sm"
      data-testid="compartido-guia-empezar"
      @click="$emit('empezar')"
    >
      Invitar a alguien
    </button>

    <p class="text-[0.6875rem] text-theme-text-muted text-center mt-3">
      Podés pausar o cortar cuando quieras, y marcar gastos como privados uno por uno.
    </p>
  </section>
</template>

<script setup>
defineEmits(['empezar'])

const PASOS = [
  {
    titulo: 'Invitá por email',
    detalle: 'La persona recibe la invitación en su cuenta y decide si acepta.',
  },
  {
    titulo: 'Elegí qué rubros ve',
    detalle: 'Solo los que marques. Por defecto ve totales, no cada gasto uno por uno.',
  },
  {
    titulo: 'Te avisa a tiempo',
    detalle: 'Ve cómo va tu presupuesto y la proyección del mes, y puede mandarte un aviso.',
  },
]
</script>
