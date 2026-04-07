export function useApiFetch() {
  const { $apiFetch } = useNuxtApp()
  return { apiFetch: $apiFetch }
}
