<template>
  <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
    <h3 class="font-semibold text-theme-text mb-1">Familia: cómo cambiar de perfil</h3>
    <p class="text-sm text-theme-text-sec mb-3">
      Elige cómo alternar entre tus finanzas y las de un familiar.
    </p>
    <div class="space-y-2">
      <label
        class="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
        :class="modo === 'selector' ? 'border-theme-accent bg-theme-accent-bg' : 'border-theme-border bg-theme-input'"
      >
        <input type="radio" class="mt-0.5" :checked="modo === 'selector'" @change="setModo('selector')" />
        <div>
          <p class="text-sm font-medium text-theme-text">Selector siempre visible</p>
          <p class="text-[11px] text-theme-text-muted">Una barra arriba para cambiar de perfil en cualquier momento.</p>
        </div>
      </label>
      <label
        class="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
        :class="modo === 'familia' ? 'border-theme-accent bg-theme-accent-bg' : 'border-theme-border bg-theme-input'"
      >
        <input type="radio" class="mt-0.5" :checked="modo === 'familia'" @change="setModo('familia')" />
        <div>
          <p class="text-sm font-medium text-theme-text">Solo desde Familia</p>
          <p class="text-[11px] text-theme-text-muted">Cambias de perfil entrando desde la página Familia. Menos riesgo de equivocarte de perfil.</p>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup>
const { modo, setModo } = usePerfilModo()
</script>
