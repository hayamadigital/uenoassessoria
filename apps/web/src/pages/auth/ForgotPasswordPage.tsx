import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@ueno/utils/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await sendPasswordResetEmail(auth, data.email, {
        url: `${window.location.origin}/login`,
      })
      setSent(true)
    } catch {
      setError('root', {
        message: 'Não foi possível enviar o email de redefinição. Tente novamente.',
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">UENO ASSESSORIA</h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel Administrativo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('reset_password')}</CardTitle>
            <CardDescription>{t('forgot_password')}</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="rounded-md bg-green-500/10 p-3">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {t('reset_password_sent')}
                  </p>
                </div>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('back_to_login')}
                </Link>
              </div>
            ) : (
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

                {errors.root ? (
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{errors.root.message}</p>
                  </div>
                ) : null}

                <Button type="submit" className="w-full" isLoading={isSubmitting}>
                  {t('send_reset_email')}
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('back_to_login')}
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
