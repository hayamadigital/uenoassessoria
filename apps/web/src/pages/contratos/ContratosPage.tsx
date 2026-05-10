import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, User, Send, X, Pencil } from 'lucide-react'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import {
  listContratosWithClientes,
  createContrato,
  updateContrato,
  updateContratoStatus,
  enviarContrato,
} from '@ueno/firebase/queries/contratos'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { formatDateJST } from '@ueno/utils/date'
import { contratoSchema } from '@ueno/utils/validators'
import { useAuthStore } from '@/stores/auth.store'
import type { StatusContrato, ContratoWithCliente } from '@ueno/firebase'

type ContratoInput = z.infer<typeof contratoSchema>

const editSchema = z.object({
  titulo: z.string().min(2, 'Título obrigatório'),
  corpo_html: z.string().min(10, 'Conteúdo obrigatório'),
})
type EditInput = z.infer<typeof editSchema>

const statusLabel: Record<StatusContrato, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
}

const statusVariant: Record<
  StatusContrato,
  'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'
> = {
  rascunho: 'secondary',
  enviado: 'warning',
  assinado: 'success',
  cancelado: 'destructive',
}

export function ContratosPage() {
  const queryClient = useQueryClient()
  const { id: paramId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.session?.userId)

  // Filters
  const [statusFiltro, setStatusFiltro] = useState<StatusContrato | ''>('')
  const [clienteFiltro, setClienteFiltro] = useState('')

  // Dialog state
  const [viewContrato, setViewContrato] = useState<ContratoWithCliente | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ContratoWithCliente | null>(null)
  const [enviarTarget, setEnviarTarget] = useState<ContratoWithCliente | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ContratoWithCliente | null>(null)

  const dialogFormOpen = addOpen || !!editTarget

  // Queries
  const { data: contratos, isLoading } = useQuery({
    queryKey: ['contratos', 'list', statusFiltro, clienteFiltro],
    queryFn: () =>
      listContratosWithClientes(db, {
        ...(statusFiltro && { status: statusFiltro }),
        ...(clienteFiltro && { cliente_id: clienteFiltro }),
      }),
  })

  const { data: todos } = useQuery({
    queryKey: ['contratos', 'all'],
    queryFn: () => listContratosWithClientes(db),
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes', 'list'],
    queryFn: () => listClientes(db),
    enabled: dialogFormOpen,
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos', 'list'],
    queryFn: () => listServicos(db),
    enabled: addOpen,
  })

  // Summary counts
  const counts = useMemo(
    () => ({
      rascunho: todos?.filter((c) => c.status === 'rascunho').length ?? 0,
      enviado: todos?.filter((c) => c.status === 'enviado').length ?? 0,
      assinado: todos?.filter((c) => c.status === 'assinado').length ?? 0,
      cancelado: todos?.filter((c) => c.status === 'cancelado').length ?? 0,
    }),
    [todos],
  )

  // Unique clients for filter dropdown
  const clientesUnicos = useMemo(() => {
    const seen = new Set<string>()
    return (todos ?? [])
      .filter((c) => {
        if (!c.cliente || seen.has(c.cliente.id)) return false
        seen.add(c.cliente.id)
        return true
      })
      .map((c) => ({ id: c.cliente!.id, nome: c.cliente!.profile?.full_name ?? c.cliente!.id }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [todos])

  // Auto-open viewer when navigating to /contratos/:id
  useEffect(() => {
    if (paramId && contratos) {
      const found = contratos.find((c) => c.id === paramId) ?? null
      if (found) setViewContrato(found)
    }
  }, [paramId, contratos])

  // Forms
  const createForm = useForm<ContratoInput>({
    resolver: zodResolver(contratoSchema),
    defaultValues: { titulo: '', corpo_html: '', cliente_id: '', servico_id: '' },
  })
  const selectedCreateClienteId = useWatch({ control: createForm.control, name: 'cliente_id' })
  const selectedCreateCliente = clientes?.find((c) => c.id === selectedCreateClienteId)

  const editForm = useForm<EditInput>({
    resolver: zodResolver(editSchema),
  })
  useEffect(() => {
    if (editTarget) {
      editForm.reset({ titulo: editTarget.titulo, corpo_html: editTarget.corpo_html })
    }
  }, [editTarget, editForm])

  // Mutations
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contratos'] })

  const createMutation = useMutation({
    mutationFn: (data: ContratoInput) =>
      createContrato(db, {
        cliente_id: data.cliente_id,
        servico_id: data.servico_id || null,
        titulo: data.titulo,
        corpo_html: data.corpo_html,
        status: 'rascunho',
        assinado_em: null,
        assinatura_url: null,
        ip_assinatura: null,
        pdf_url: null,
        enviado_por: null,
      }),
    onSuccess: () => {
      invalidate()
      setAddOpen(false)
      createForm.reset()
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditInput }) =>
      updateContrato(db, id, data),
    onSuccess: () => {
      invalidate()
      setEditTarget(null)
    },
  })

  const enviarMutation = useMutation({
    mutationFn: (id: string) => enviarContrato(db, id, userId!),
    onSuccess: () => {
      invalidate()
      setEnviarTarget(null)
    },
  })

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => updateContratoStatus(db, id, 'cancelado'),
    onSuccess: () => {
      invalidate()
      setCancelTarget(null)
    },
  })

  function handleCloseViewer() {
    setViewContrato(null)
    if (paramId) navigate('/contratos', { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Gestão de contratos com clientes"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        }
      />

      <div className="space-y-6 p-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              { key: 'rascunho', color: 'text-muted-foreground' },
              { key: 'enviado', color: 'text-amber-600' },
              { key: 'assinado', color: 'text-green-600' },
              { key: 'cancelado', color: 'text-destructive' },
            ] as const
          ).map(({ key, color }) => (
            <div key={key} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{statusLabel[key]}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{counts[key]}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as StatusContrato | '')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="enviado">Enviado</option>
            <option value="assinado">Assinado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos os clientes</option>
            {clientesUnicos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {(statusFiltro || clienteFiltro) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFiltro('')
                setClienteFiltro('')
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : contratos?.length === 0 ? (
          <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Título</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Criado em</th>
                  <th className="px-4 py-3 text-left font-medium">Assinado em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {contratos?.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.cliente?.profile?.avatar_url ? (
                          <img
                            src={c.cliente.profile.avatar_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">
                          {c.cliente?.profile?.full_name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => setViewContrato(c)}
                      >
                        <FileText className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                        {c.titulo}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateJST(c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.assinado_em ? formatDateJST(c.assinado_em) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'rascunho' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditTarget(c)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!userId}
                              onClick={() => setEnviarTarget(c)}
                            >
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              Enviar
                            </Button>
                          </>
                        )}
                        {(c.status === 'rascunho' || c.status === 'enviado') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setCancelTarget(c)}
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog 1 — Criar */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false)
            createForm.reset()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <form
            id="create-contrato-form"
            onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4 py-2"
          >
            {/* Cliente */}
            <div className="space-y-2">
              <Label>
                Cliente <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
                  {selectedCreateCliente?.profile?.avatar_url ? (
                    <img
                      src={selectedCreateCliente.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <select
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  {...createForm.register('cliente_id')}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecione um cliente...
                  </option>
                  {clientes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.profile?.full_name ?? c.id}
                    </option>
                  ))}
                </select>
              </div>
              {createForm.formState.errors.cliente_id && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.cliente_id.message}
                </p>
              )}
            </div>

            {/* Serviço */}
            <div className="space-y-2">
              <Label>Serviço</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...createForm.register('servico_id')}
                defaultValue=""
              >
                <option value="">Nenhum</option>
                {servicos?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label>
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                {...createForm.register('titulo')}
                placeholder="Ex: Contrato de Prestação de Serviços"
              />
              {createForm.formState.errors.titulo && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.titulo.message}
                </p>
              )}
            </div>

            {/* Conteúdo */}
            <div className="space-y-2">
              <Label>
                Conteúdo do Contrato <span className="text-destructive">*</span>
              </Label>
              <textarea
                {...createForm.register('corpo_html')}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="Conteúdo do contrato (HTML ou texto)..."
              />
              {createForm.formState.errors.corpo_html && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.corpo_html.message}
                </p>
              )}
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false)
                createForm.reset()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-contrato-form"
              isLoading={createForm.formState.isSubmitting || createMutation.isPending}
            >
              Criar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2 — Editar */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Contrato</DialogTitle>
          </DialogHeader>
          <form
            id="edit-contrato-form"
            onSubmit={editForm.handleSubmit((data) =>
              editTarget && editMutation.mutate({ id: editTarget.id, data }),
            )}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label>
                Título <span className="text-destructive">*</span>
              </Label>
              <Input {...editForm.register('titulo')} />
              {editForm.formState.errors.titulo && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.titulo.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Conteúdo <span className="text-destructive">*</span>
              </Label>
              <textarea
                {...editForm.register('corpo_html')}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
              {editForm.formState.errors.corpo_html && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.corpo_html.message}
                </p>
              )}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-contrato-form"
              isLoading={editMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 3 — Enviar confirmação */}
      <Dialog
        open={!!enviarTarget}
        onOpenChange={(o) => {
          if (!o) setEnviarTarget(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja enviar o contrato{' '}
            <strong className="text-foreground">"{enviarTarget?.titulo}"</strong> para o cliente?
            Após o envio, não será possível editar o conteúdo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnviarTarget(null)}>
              Cancelar
            </Button>
            <Button
              isLoading={enviarMutation.isPending}
              onClick={() => enviarTarget && enviarMutation.mutate(enviarTarget.id)}
            >
              <Send className="mr-2 h-4 w-4" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 4 — Cancelar confirmação */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja cancelar o contrato{' '}
            <strong className="text-foreground">"{cancelTarget?.titulo}"</strong>? Esta ação não
            pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              isLoading={cancelarMutation.isPending}
              onClick={() => cancelTarget && cancelarMutation.mutate(cancelTarget.id)}
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 5 — Ver conteúdo */}
      <Dialog open={!!viewContrato} onOpenChange={(o) => { if (!o) handleCloseViewer() }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {viewContrato?.titulo}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {viewContrato && (
              <Badge variant={statusVariant[viewContrato.status]}>
                {statusLabel[viewContrato.status]}
              </Badge>
            )}
            {viewContrato?.assinado_em && (
              <span>Assinado em {formatDateJST(viewContrato.assinado_em)}</span>
            )}
            <span>
              Cliente:{' '}
              <strong className="text-foreground">
                {viewContrato?.cliente?.profile?.full_name ?? '—'}
              </strong>
            </span>
          </div>
          <div
            className="max-h-[55vh] overflow-y-auto rounded-md border bg-background p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: viewContrato?.corpo_html ?? '' }}
          />
          {viewContrato?.pdf_url && (
            <a
              href={viewContrato.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              Ver PDF
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
