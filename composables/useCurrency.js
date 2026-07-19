const CURRENCY_MAP = {
  PEN: { symbol: 'S/', locale: 'es-PE' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'es-ES' },
}

export function useCurrency() {
  const { config } = useConfiguraciones()

  const currencyCode = computed(() => config.value?.monedaPreferida || 'PEN')
  const currencySymbol = computed(() => CURRENCY_MAP[currencyCode.value]?.symbol || 'S/')
  const currencyLocale = computed(() => config.value?.locale || CURRENCY_MAP[currencyCode.value]?.locale || 'es-PE')

  function formatMonto(valor) {
    return Number(valor).toLocaleString(currencyLocale.value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function formatMontoConSimbolo(valor) {
    // Espacio duro (\u00A0): evita que el símbolo y el monto se separen en
    // dos líneas dentro de contenedores estrechos (ej. "S/ \n 1,234.00").
    return `${currencySymbol.value}\u00A0${formatMonto(valor)}`
  }

  return { currencyCode, currencySymbol, currencyLocale, formatMonto, formatMontoConSimbolo }
}
