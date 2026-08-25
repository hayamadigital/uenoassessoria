import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { getProfile } from '@ueno/firebase/queries/perfis'
import { useAuthStore } from '@/stores/auth.store'
import { loginSchema, type LoginInput } from '@ueno/utils/validators'
import type { AuthSession } from '@ueno/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const { session, setSession } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, navigate])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    let userCredential
    try {
      userCredential = await signInWithEmailAndPassword(auth, data.email, data.password)
    } catch {
      setError('root', { message: t('invalid_credentials') })
      return
    }

    try {
      const profile = await getProfile(db, userCredential.user.uid)
      const authSession: AuthSession = {
        userId: userCredential.user.uid,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        preferredLang: profile.preferred_lang,
      }
      setSession(authSession)
    } catch {
      await signOut(auth)
      setError('root', { message: 'Perfil não encontrado. Contate o administrador.' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">UENO ASSESSORIA</h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel Administrativo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('welcome_back')}</CardTitle>
            <CardDescription>{t('sign_in_subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ueno.com.br"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-xs text-primary hover:underline"
                  >
                    {t('forgot_password')}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                ) : null}
              </div>

              {errors.root ? (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                </div>
              ) : null}

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                {t('login')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
