import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, User, Send, X, Pencil, Search } from 'lucide-react'
import { z } from 'zod'
import DOMPurify from 'dompurify'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { SortableTh } from '@/components/ui/sortable-th'
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
import { listContratoTemplates } from '@ueno/firebase/queries/contrato_templates'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { listEtapaTemplatesByServico } from '@ueno/firebase/queries/etapa_templates'
import { listPagamentos, listParcelas } from '@ueno/firebase/queries/financeiro'
import { formatDateJST } from '@ueno/utils/date'
import { contratoSchema } from '@ueno/utils/validators'
import { renderSecoes, valoresDefaultDasSecoes, type ContextoContrato } from '@ueno/utils/contrato-render'
import { useAuthStore } from '@/stores/auth.store'
import { PreencherSecoesContrato } from '@/components/ui/PreencherSecoesContrato'
import type { StatusContrato, ContratoWithCliente } from '@ueno/firebase'
import { includesText, isWithinDateRange, nextSort, sortBy, type ActiveFilter, type SortState } from '@/utils/table'

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
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  const [busca, setBusca] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sort, setSort] = useState<SortState<'cliente' | 'titulo' | 'status' | 'created_at' | 'assinado_em'>>({
    key: 'created_at',
    direction: 'desc',
  })

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

  const { data: templates } = useQuery({
    queryKey: ['contrato-templates'],
    queryFn: () => listContratoTemplates(db),
    enabled: addOpen,
  })

  // Template + valores das seções para criação
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [valoresSecoes, setValoresSecoes] = useState<Record<string, string>>({})
  const [selectedProcessoId, setSelectedProcessoId] = useState('')

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId) ?? null
  const templateSecoes = selectedTemplate?.secoes ?? []

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

  const contratosFiltrados = useMemo(() => {
    const rows = (contratos ?? []).filter((c) => {
      const isActive = c.status !== 'cancelado'
      if (activeFilter === 'active' && !isActive) return false
      if (activeFilter === 'inactive' && isActive) return false
      if (!includesText(
        [c.cliente?.profile?.full_name, c.titulo, statusLabel[c.status]].join(' '),
        busca,
      )) return false
      return isWithinDateRange(c.created_at, createdFrom, createdTo)
    })

    return sortBy(rows, sort, {
      cliente: (c) => c.cliente?.profile?.full_name,
      titulo: (c) => c.titulo,
      status: (c) => statusLabel[c.status],
      created_at: (c) => c.created_at,
      assinado_em: (c) => c.assinado_em,
    })
  }, [activeFilter, busca, contratos, createdFrom, createdTo, sort])

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

  useEffect(() => {
    setSelectedProcessoId('')
  }, [selectedCreateClienteId])

  const { data: processos } = useQuery({
    queryKey: ['processos', 'by-cliente', selectedCreateClienteId],
    queryFn: () => listProcessosByCliente(db, selectedCreateClienteId),
    enabled: addOpen && !!selectedCreateClienteId,
  })

  const selectedProcesso = processos?.find((p) => p.id === selectedProcessoId) ?? null

  const { data: etapaTemplates } = useQuery({
    queryKey: ['etapa-templates', selectedProcesso?.servico_id, selectedProcesso?.variacao_id],
    queryFn: () => listEtapaTemplatesByServico(db, selectedProcesso!.servico_id, selectedProcesso!.variacao_id),
    enabled: !!selectedProcesso?.servico_id,
  })

  const { data: pagamentosCliente } = useQuery({
    queryKey: ['pagamentos', 'cliente', selectedCreateClienteId],
    queryFn: () => listPagamentos(db, { cliente_id: selectedCreateClienteId }),
    enabled: addOpen && !!selectedCreateClienteId && !!selectedProcessoId,
  })

  const pagamentoDoProcesso = pagamentosCliente?.find(
    (p) => p.servico_id === selectedProcesso?.servico_id,
  ) ?? null

  const { data: parcelasDoProcesso } = useQuery({
    queryKey: ['parcelas', pagamentoDoProcesso?.id],
    queryFn: () => listParcelas(db, pagamentoDoProcesso!.id),
    enabled: !!pagamentoDoProcesso?.id,
  })

  const contextoContrato: ContextoContrato | undefined = selectedProcesso
    ? {
        servico: selectedProcesso.servico,
        variacao: selectedProcesso.variacao,
        etapaTemplates: etapaTemplates ?? [],
        parcelas: parcelasDoProcesso ?? [],
      }
    : undefined

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
        processo_id: null,
        aditivo_de: null,
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
      setSelectedTemplateId('')
      setValoresSecoes({})
      setSelectedProcessoId('')
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
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou título..."
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Ativos e inativos</option>
          </select>
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
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            title="Criado de"
          />
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            title="Criado até"
          />
          {(statusFiltro || clienteFiltro || activeFilter !== 'active' || busca || createdFrom || createdTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFiltro('')
                setClienteFiltro('')
                setActiveFilter('active')
                setBusca('')
                setCreatedFrom('')
                setCreatedTo('')
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
        ) : contratosFiltrados.length === 0 ? (
          <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <SortableTh sort={sort} sortKey="cliente" onSort={(key) => setSort(nextSort(sort, key))}>Cliente</SortableTh>
                  <SortableTh sort={sort} sortKey="titulo" onSort={(key) => setSort(nextSort(sort, key))}>Título</SortableTh>
                  <SortableTh sort={sort} sortKey="status" onSort={(key) => setSort(nextSort(sort, key))}>Status</SortableTh>
                  <SortableTh sort={sort} sortKey="created_at" onSort={(key) => setSort(nextSort(sort, key))}>Criado em</SortableTh>
                  <SortableTh sort={sort} sortKey="assinado_em" onSort={(key) => setSort(nextSort(sort, key))}>Assinado em</SortableTh>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {contratosFiltrados.map((c) => (
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
        onOpenChange={(o: boolean) => {
          if (!o) {
            setAddOpen(false)
            createForm.reset()
            setSelectedTemplateId('')
            setValoresSecoes({})
            setSelectedProcessoId('')
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <form
            id="create-contrato-form"
            onSubmit={createForm.handleSubmit((data) => {
              const corpoHtml = templateSecoes.length
                ? renderSecoes(
                    templateSecoes,
                    { ...valoresSecoes, cliente_nome: selectedCreateCliente?.profile?.full_name ?? '' },
                    contextoContrato,
                  )
                : data.corpo_html
              createMutation.mutate({ ...data, corpo_html: corpoHtml })
            })}
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
                  <option value="" disabled>Selecione um cliente...</option>
                  {clientes?.map((c) => (
                    <option key={c.id} value={c.id}>{c.profile?.full_name ?? c.id}</option>
                  ))}
                </select>
              </div>
              {createForm.formState.errors.cliente_id && (
                <p className="text-xs text-destructive">{createForm.formState.errors.cliente_id.message}</p>
              )}
            </div>

            {/* Processo vinculado (opcional) */}
            {selectedCreateClienteId && (
              <div className="space-y-2">
                <Label>Processo vinculado <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedProcessoId}
                  onChange={(e) => {
                    setSelectedProcessoId(e.target.value)
                  }}
                >
                  <option value="">Sem processo (sem dados automáticos)</option>
                  {processos?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.servico.nome}{p.variacao ? ` — ${p.variacao.nome}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Vincula o contrato a um processo e preenche automaticamente as seções de serviço, etapas e parcelas.
                </p>
              </div>
            )}

            {/* Template */}
            <div className="space-y-2">
              <Label>Modelo de Contrato</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTemplateId}
                onChange={(e) => {
                  const tplId = e.target.value
                  setSelectedTemplateId(tplId)
                  const tpl = templates?.find((t) => t.id === tplId)
                  if (tpl) {
                    createForm.setValue('titulo', tpl.nome)
                    setValoresSecoes(valoresDefaultDasSecoes(tpl.secoes ?? []))
                  } else {
                    setValoresSecoes({})
                  }
                }}
              >
                <option value="">Sem modelo (conteúdo manual)</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label>Título <span className="text-destructive">*</span></Label>
              <Input {...createForm.register('titulo')} placeholder="Ex: Contrato de Prestação de Serviços" />
              {createForm.formState.errors.titulo && (
                <p className="text-xs text-destructive">{createForm.formState.errors.titulo.message}</p>
              )}
            </div>

            {/* Seções do template ou conteúdo manual */}
            {templateSecoes.length > 0 ? (
              <div className="space-y-2">
                <Label>Preencher dados do contrato</Label>
                <div className="rounded-md border p-4">
                  <PreencherSecoesContrato
                    secoes={templateSecoes}
                    clienteNome={selectedCreateCliente?.profile?.full_name ?? ''}
                    valores={valoresSecoes}
                    onChange={(variavel, val) =>
                      setValoresSecoes((prev) => ({ ...prev, [variavel]: val }))
                    }
                    contexto={contextoContrato}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Conteúdo do Contrato <span className="text-destructive">*</span></Label>
                <textarea
                  {...createForm.register('corpo_html')}
                  rows={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="Conteúdo do contrato (HTML ou texto)..."
                />
                {createForm.formState.errors.corpo_html && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.corpo_html.message}</p>
                )}
              </div>
            )}
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false)
                createForm.reset()
                setSelectedTemplateId('')
                setValoresSecoes({})
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
        onOpenChange={(o: boolean) => {
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
        onOpenChange={(o: boolean) => {
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
        onOpenChange={(o: boolean) => {
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
      <Dialog open={!!viewContrato} onOpenChange={(o: boolean) => { if (!o) handleCloseViewer() }}>
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
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(viewContrato?.corpo_html ?? ''),
            }}
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
