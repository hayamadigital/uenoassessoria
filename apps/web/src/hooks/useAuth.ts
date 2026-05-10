import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { getProfile } from '@ueno/firebase/queries/perfis'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthSession } from '@ueno/types'

export function useAuthListener() {
  const { setSession, setLoading, clear } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getProfile(db, user.uid)
          const authSession: AuthSession = {
            userId: user.uid,
            email: profile.email,
            role: profile.role,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            preferredLang: profile.preferred_lang,
          }
          setSession(authSession)
        } catch (err: unknown) {
          // Perfil não encontrado no Firestore → usuário não tem cadastro completo → logout
          const isProfileMissing =
            (err as { code?: string })?.code === 'not-found'
          if (isProfileMissing) {
            clear()
          } else {
            console.error('[useAuthListener] falha ao carregar perfil:', err)
          }
        }
      } else {
        clear()
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setSession, setLoading, clear])
}

export function useRequireAuth(allowedRoles?: string[]) {
  const { session, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        navigate('/login', { replace: true })
        return
      }
      if (allowedRoles && !allowedRoles.includes(session.role)) {
        navigate('/unauthorized', { replace: true })
      }
    }
  }, [session, isLoading, navigate, allowedRoles])

  return { session, isLoading }
}
