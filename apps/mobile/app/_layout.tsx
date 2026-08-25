import { useEffect } from 'react'
import { Alert } from 'react-native'
import { Stack, router, useRootNavigationState } from 'expo-router'
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
  const session = useAuthStore((state) => state.session)
  const rootNavigationState = useRootNavigationState()

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

  useEffect(() => {
    if (!rootNavigationState?.key || !session) return

    if (session.role === 'admin') router.replace('/(admin)/(tabs)/inicio')
    else if (session.role === 'instrutor') router.replace('/(instrutor)/hoje')
    else router.replace('/(cliente)/(tabs)/inicio')
  }, [rootNavigationState?.key, session])

  return null
}

function LanguageSync() {
  const preferredLang = useAuthStore((state) => state.session?.preferredLang)

  useEffect(() => {
    if (preferredLang && i18n.language !== preferredLang) {
      void i18n.changeLanguage(preferredLang)
    }
  }, [preferredLang])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthInit />
        <LanguageSync />
        <StatusBar style="auto" />
        <Stack key={i18n.language} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(instrutor)" />
          <Stack.Screen name="(cliente)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
