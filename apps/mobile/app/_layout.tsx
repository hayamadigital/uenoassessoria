import { useEffect } from 'react'
import { Alert } from 'react-native'
import { Stack, router } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import i18n from '../src/i18n'
import { auth, db } from '@/lib/firebase'
import { onAuthChange } from '@ueno/firebase'
import { getProfile } from '@ueno/firebase/queries/perfis'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthSession } from '@ueno/types'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function AuthInit() {
  const { setSession, setLoading, clear } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthChange(auth, async (user) => {
      if (user) {
        try {
          let profile = null
          for (let attempt = 0; attempt < 6; attempt++) {
            try {
              profile = await getProfile(db, user.uid)
              break
            } catch (e: any) {
              const retryable =
                e?.message === 'Profile not found' ||
                (e?.message ?? '').includes('Missing or insufficient permissions')
              if (retryable && attempt < 5) {
                await new Promise((r) => setTimeout(r, 1500))
                continue
              }
              throw e
            }
          }
          if (!profile) throw new Error('Profile not found')
          const session: AuthSession = {
            userId: user.uid,
            email: profile.email ?? user.email ?? '',
            role: profile.role,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            preferredLang: profile.preferred_lang,
          }
          setSession(session)
          await i18n.changeLanguage(session.preferredLang)
          if (session.role === 'admin') router.replace('/(admin)/inicio')
          else if (session.role === 'instrutor') router.replace('/(instrutor)/hoje')
          else router.replace('/(cliente)/inicio')
        } catch (e: any) {
          console.error('[Auth] getProfile error:', e?.message)
          Alert.alert(
            'Erro ao carregar perfil',
            e?.message === 'Profile not found'
              ? 'Perfil não encontrado. Contate o administrador.'
              : `Erro: ${e?.message ?? 'desconhecido'}`
          )
          clear()
        }
      } else {
        clear()
      }
      setLoading(false)
    })
    return unsub
  }, [setSession, setLoading, clear])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthInit />
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(instrutor)" />
          <Stack.Screen name="(cliente)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
