import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { passwordChangeSchema, type PasswordChangeInput } from '@ueno/utils/validators'

export function SegurancaTab() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
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
                  {mutation.error instanceof Error ? mutation.error.message : 'Erro ao alterar senha'}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
