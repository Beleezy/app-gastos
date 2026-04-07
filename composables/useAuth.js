export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  async function loginConGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    navigateTo('/login')
  }

  return { user, loginConGoogle, logout }
}
