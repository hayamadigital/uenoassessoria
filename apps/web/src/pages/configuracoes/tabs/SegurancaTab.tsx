import { safeErrorMessage } from '@/lib/error-message'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { passwordChangeSchema, type PasswordChangeInput } from '@ueno/utils/validators'

export function SegurancaTab() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  // Estado por campo: revelar a nova senha não deve revelar a confirmação junto.
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
  })

  const mutation = useMutation({
    mutationFn: async (data: PasswordChangeInput) => {
      const user = auth.currentUser
      if (!user) throw new Error('Não autenticado')
      await updatePassword(user, data.password)
    },
    onSuccess: () => {
      reset()
      setSuccessMsg('Senha alterada com sucesso.')
      setTimeout(() => setSuccessMsg(null), 3000)
    },
  })

  return (
    <div className="max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar Senha</CardTitle>
          <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
                Alterar Senha
              </Button>
              {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
              {mutation.isError && (
                <p className="text-sm text-destructive">
                  {safeErrorMessage(mutation.error, 'Erro ao alterar senha')}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
