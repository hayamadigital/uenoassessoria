import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import {
  listProfiles,
  activateProfile,
  deactivateProfile,
} from '@ueno/firebase/queries/perfis'
import { inviteUserSchema, type InviteUserInput } from '@ueno/utils/validators'
import { cn } from '@/lib/cn'
import type { UserRole } from '@ueno/firebase'

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  instrutor: 'Instrutor',
  cliente: 'Cliente',
}

const roleFilters: { label: string; value: UserRole | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Instrutor', value: 'instrutor' },
  { label: 'Cliente', value: 'cliente' },
]

export function UsuariosTab() {
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', roleFilter],
    queryFn: () => listProfiles(db, roleFilter || undefined),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? deactivateProfile(db, id) : activateProfile(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { role: 'cliente' },
  })

  const selectedRole = watch('role')

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteUserInput) => {
      const { error } = await db.functions.invoke('invite-user', {
        body: { email: data.email, full_name: data.full_name, role: data.role },
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setInviteSuccess(true)
      resetForm()
      setTimeout(() => {
        setDialogOpen(false)
        setInviteSuccess(false)
      }, 1500)
    },
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Usuários do Sistema</CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Usuário
          </Button>
        </CardHeader>
        <CardContent>
          {/* Role filter */}
          <div className="flex gap-2 mb-4">
            {roleFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRoleFilter(f.value)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                  roleFilter === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:bg-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Perfil</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{profile.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{roleLabels[profile.role]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={profile.is_active ? 'success' : 'secondary'}>
                          {profile.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={
                            toggleMutation.isPending &&
                            toggleMutation.variables?.id === profile.id
                          }
                          onClick={() =>
                            toggleMutation.mutate({
                              id: profile.id,
                              isActive: profile.is_active,
                            })
                          }
                        >
                          {profile.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá um email com o link para definir sua senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => inviteMutation.mutate(data))}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite_email">Email</Label>
                <Input id="invite_email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite_name">Nome Completo</Label>
                <Input id="invite_name" {...register('full_name')} />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(val) =>
                    setValue('role', val as 'admin' | 'instrutor' | 'cliente')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="instrutor">Instrutor</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteSuccess && (
                <p className="text-sm text-green-600">Convite enviado com sucesso!</p>
              )}
              {inviteMutation.isError && (
                <p className="text-sm text-destructive">
                  {inviteMutation.error instanceof Error
                    ? inviteMutation.error.message
                    : 'Erro ao enviar convite'}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                  setInviteSuccess(false)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting || inviteMutation.isPending}>
                Enviar Convite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
