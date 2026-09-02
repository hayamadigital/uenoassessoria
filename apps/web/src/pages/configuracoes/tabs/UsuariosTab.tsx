import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCw, UserPlus } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
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
  listStaffProfiles,
} from '@ueno/firebase/queries/perfis'
import { inviteUserSchema, type InviteUserInput } from '@ueno/utils/validators'
import { cn } from '@/lib/cn'
const roleLabels = {
  admin: 'Admin',
  instrutor: 'Instrutor',
} as const
const roleFilters: { label: string; value: 'admin' | 'instrutor' | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Instrutor', value: 'instrutor' },
]

type InviteLinkResponse = {
  user_id: string
  email?: string
  reset_link?: string
}

export function UsuariosTab() {
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<'admin' | 'instrutor' | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [inviteLinkEmail, setInviteLinkEmail] = useState<string | null>(null)
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null)

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', roleFilter],
    queryFn: () =>
      roleFilter ? listProfiles(db, roleFilter) : listStaffProfiles(db),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const setUserActive = httpsCallable<
        { uid: string; is_active: boolean },
        { success: boolean }
      >(getFunctions(), 'setUserActive')
      await setUserActive({ uid: id, is_active: !isActive })
    },
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
    defaultValues: { role: 'instrutor' },
  })

  const selectedRole = watch('role')

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteUserInput) => {
      const inviteUser = httpsCallable<
        { email: string; full_name: string; role: 'admin' | 'instrutor' },
        InviteLinkResponse
      >(getFunctions(), 'inviteUser')

      const { data: response } = await inviteUser({
        email: data.email,
        full_name: data.full_name,
        role: data.role,
      })
      return response
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setInviteSuccess(true)
      setInviteLink(response.reset_link ?? null)
      setLastInviteLink(response.reset_link ?? null)
      setInviteLinkEmail(variables.email)
      setLastInviteEmail(variables.email)
      resetForm({ role: 'instrutor' })
    },
  })

  const regenerateLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const regenerateInviteLink = httpsCallable<
        { email: string },
        InviteLinkResponse
      >(getFunctions(), 'regenerateInviteLink')

      const { data: response } = await regenerateInviteLink({ email })
      return response
    },
    onSuccess: (response, email) => {
      setInviteSuccess(true)
      setLastInviteLink(response.reset_link ?? null)
      setLastInviteEmail(response.email ?? email)

      if (dialogOpen && inviteLinkEmail === email) {
        setInviteLink(response.reset_link ?? null)
        setInviteLinkEmail(response.email ?? email)
      }
    },
  })

  const isRegeneratingLink = (email?: string | null) =>
    regenerateLinkMutation.isPending && regenerateLinkMutation.variables === email

  return (
    <div className="space-y-6">
      {lastInviteLink && (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-900">Link de acesso criado</p>
              <p className="text-sm text-emerald-900/80">
                Use esse link para a pessoa definir a senha. Ele fica visível abaixo e pode ser
                aberto ou copiado.
              </p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-white p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Link de convite
              </p>
              <p className="break-all text-sm text-foreground">{lastInviteLink}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(lastInviteLink)}
              >
                Copiar link
              </Button>
              <Button
                type="button"
                onClick={() => window.open(lastInviteLink, '_blank', 'noopener,noreferrer')}
              >
                Abrir link
              </Button>
              {lastInviteEmail && (
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={isRegeneratingLink(lastInviteEmail)}
                  onClick={() => regenerateLinkMutation.mutate(lastInviteEmail)}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Regerar link
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setLastInviteLink(null)}>
                Ocultar
              </Button>
            </div>
            {regenerateLinkMutation.isError && (
              <p className="text-sm text-destructive">
                {regenerateLinkMutation.error instanceof Error
                  ? regenerateLinkMutation.error.message
                  : 'Erro ao regerar link'}
              </p>
            )}
          </CardContent>
        </Card>
      )}
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
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{profile.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {roleLabels[profile.role as keyof typeof roleLabels] ?? profile.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={profile.is_active ? 'success' : 'secondary'}>
                          {profile.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={isRegeneratingLink(profile.email)}
                            onClick={() => regenerateLinkMutation.mutate(profile.email)}
                          >
                            Regerar link
                          </Button>
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
                        </div>
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
              O usuário receberá um link de acesso para definir sua senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => inviteMutation.mutate(data))}>
            <div className="space-y-4 py-2">
              {inviteLink ? (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Convite gerado com sucesso</p>
                    <p className="text-xs text-muted-foreground">
                      Como o e-mail automático ainda não está ativo, copie ou abra o link abaixo.
                    </p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Link de acesso
                    </p>
                    <p className="break-all text-sm text-foreground">{inviteLink}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                    >
                      Copiar link
                    </Button>
                    <Button
                      type="button"
                      onClick={() => window.open(inviteLink, '_blank', 'noopener,noreferrer')}
                    >
                      Abrir link
                    </Button>
                    {inviteLinkEmail && (
                      <Button
                        type="button"
                        variant="secondary"
                        isLoading={isRegeneratingLink(inviteLinkEmail)}
                        onClick={() => regenerateLinkMutation.mutate(inviteLinkEmail)}
                      >
                        <RotateCw className="mr-2 h-4 w-4" />
                        Regerar link
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setDialogOpen(false)
                        setInviteSuccess(false)
                        setInviteLink(null)
                        setInviteLinkEmail(null)
                        resetForm({ role: 'instrutor' })
                      }}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
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
                      onValueChange={(val: 'admin' | 'instrutor') =>
                        setValue('role', val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="instrutor">Instrutor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteSuccess && (
                    <p className="text-sm text-green-600">Convite gerado com sucesso!</p>
                  )}
                  {inviteMutation.isError && (
                    <p className="text-sm text-destructive">
                      {inviteMutation.error instanceof Error
                        ? inviteMutation.error.message
                        : 'Erro ao enviar convite'}
                    </p>
                  )}
                  {regenerateLinkMutation.isError && (
                    <p className="text-sm text-destructive">
                      {regenerateLinkMutation.error instanceof Error
                        ? regenerateLinkMutation.error.message
                        : 'Erro ao regerar link'}
                    </p>
                  )}
                </>
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
                  setInviteLink(null)
                  setInviteLinkEmail(null)
                }}
              >
                Cancelar
              </Button>
              {!inviteLink && (
                <Button type="submit" isLoading={isSubmitting || inviteMutation.isPending}>
                  Gerar Convite
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
