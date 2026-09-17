import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { db, functions } from '@/lib/firebase'
import { getAcessoCliente, getAppConfigAcessos, listAcessoClienteHistorico } from '@ueno/firebase/queries/acessos'
import { safeErrorMessage } from '@/lib/error-message'
import { formatDateJST } from '@ueno/utils/date'
import type { AcessoModulo, ClienteWithProfile, ModuloAcesso } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

type SetAcessoRequest = {
  cliente_id: string
  modulo: ModuloAcesso
  habilitado: boolean
  expira_em: string | null
  motivo: string
  expected_revision: number
  operation_id: string
}
type SetAcessoResponse = { success: boolean; revision: number }

function estadoEfetivo(
  acesso: AcessoModulo | undefined,
  globalDisponivel: boolean,
): { label: string; variant: 'secondary' | 'success' | 'warning' | 'destructive' } {
  if (!acesso?.habilitado) return { label: 'Não liberado', variant: 'secondary' }
  if (acesso.expira_em && new Date(acesso.expira_em).getTime() <= Date.now()) {
    return { label: 'Vencido', variant: 'destructive' }
  }
  if (!globalDisponivel) return { label: 'Liberado (indisponível globalmente)', variant: 'warning' }
  return { label: 'Liberado', variant: 'success' }
}

function ModuloAcessoCard({
  modulo,
  titulo,
  clienteId,
  acesso,
  revision,
  globalDisponivel,
  onSaved,
}: {
  modulo: ModuloAcesso
  titulo: string
  clienteId: string
  acesso: AcessoModulo | undefined
  revision: number
  globalDisponivel: boolean
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [habilitado, setHabilitado] = useState(acesso?.habilitado ?? false)
  const [expiraEm, setExpiraEm] = useState(acesso?.expira_em ? acesso.expira_em.slice(0, 10) : '')
  const [motivo, setMotivo] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const setClienteModuleAccess = httpsCallable<SetAcessoRequest, SetAcessoResponse>(
        functions,
        'setClienteModuleAccess',
      )
      await setClienteModuleAccess({
        cliente_id: clienteId,
        modulo,
        habilitado,
        expira_em: habilitado && expiraEm ? new Date(`${expiraEm}T23:59:59`).toISOString() : null,
        motivo,
        expected_revision: revision,
        operation_id: crypto.randomUUID(),
      })
    },
    onSuccess: () => {
      setOpen(false)
      setMotivo('')
      onSaved()
    },
  })

  const estado = estadoEfetivo(acesso, globalDisponivel)

  function abrir() {
    setHabilitado(acesso?.habilitado ?? false)
    setExpiraEm(acesso?.expira_em ? acesso.expira_em.slice(0, 10) : '')
    setMotivo('')
    mutation.reset()
    setOpen(true)
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{titulo}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={estado.variant}>{estado.label}</Badge>
            {!globalDisponivel && (
              <span className="text-xs text-muted-foreground">Módulo indisponível globalmente</span>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={abrir}>
          {acesso?.habilitado ? 'Editar' : 'Liberar'}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={habilitado ? 'default' : 'outline'}
                onClick={() => setHabilitado(true)}
              >
                Liberar
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!habilitado ? 'default' : 'outline'}
                onClick={() => setHabilitado(false)}
              >
                Revogar
              </Button>
            </div>
            {!globalDisponivel && (
              <p className="text-xs text-muted-foreground">
                O módulo está desligado globalmente. A concessão pode ser preparada agora, mas só dá acesso
                quando o módulo for habilitado em Configurações → Preferências.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`expira-${modulo}`}>Vencimento (opcional)</Label>
              <Input
                id={`expira-${modulo}`}
                type="date"
                value={expiraEm}
                onChange={(e) => setExpiraEm(e.target.value)}
                disabled={!habilitado}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`motivo-${modulo}`}>
                Motivo <span className="text-destructive">*</span>
              </Label>
              <textarea
                id={`motivo-${modulo}`}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ex: liberado a pedido do atendimento após confirmação do pagamento"
              />
            </div>
            {!habilitado && (
              <p className="text-xs text-muted-foreground">
                Resultados e progresso já registrados são preservados na revogação.
              </p>
            )}
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {safeErrorMessage(mutation.error, 'Erro ao salvar acesso')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              isLoading={mutation.isPending}
              disabled={motivo.trim().length < 5}
              onClick={() => mutation.mutate()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ClienteAcessosTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()

  const { data: acessoCliente, isLoading: loadingAcesso } = useQuery({
    queryKey: ['acessos_clientes', cliente.profile_id],
    queryFn: () => getAcessoCliente(db, cliente.profile_id),
  })
  const { data: appConfigAcessos, isLoading: loadingConfig } = useQuery({
    queryKey: ['app-config-acessos'],
    queryFn: () => getAppConfigAcessos(db),
  })
  const { data: historico, isLoading: loadingHistorico } = useQuery({
    queryKey: ['acessos_clientes', cliente.profile_id, 'historico'],
    queryFn: () => listAcessoClienteHistorico(db, cliente.profile_id),
  })

  function refetchAll() {
    queryClient.invalidateQueries({ queryKey: ['acessos_clientes', cliente.profile_id] })
  }

  if (loadingAcesso || loadingConfig) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  const revision = acessoCliente?.revision ?? 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ModuloAcessoCard
          modulo="estudos"
          titulo="Estudos — simulados e materiais"
          clienteId={cliente.id}
          acesso={acessoCliente?.estudos}
          revision={revision}
          globalDisponivel={appConfigAcessos?.estudos_disponivel ?? false}
          onSaved={refetchAll}
        />
        <ModuloAcessoCard
          modulo="catalogo"
          titulo="Catálogo de serviços"
          clienteId={cliente.id}
          acesso={acessoCliente?.catalogo}
          revision={revision}
          globalDisponivel={appConfigAcessos?.catalogo_disponivel ?? false}
          onSaved={refetchAll}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Histórico de alterações</h2>
        {loadingHistorico ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : historico?.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            Nenhuma alteração registrada.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Módulo</th>
                  <th className="px-4 py-3 text-left font-medium">Alteração</th>
                  <th className="px-4 py-3 text-left font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historico?.map((evento) => {
                  const novoHabilitado = (evento.valores_novos as { habilitado?: unknown }).habilitado === true
                  return (
                    <tr key={evento.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {evento.created_at ? formatDateJST(evento.created_at) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium capitalize">{evento.modulo}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {novoHabilitado ? 'Liberado' : 'Revogado'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{evento.motivo}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
