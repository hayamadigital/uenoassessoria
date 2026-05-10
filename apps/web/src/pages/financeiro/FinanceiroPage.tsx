import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, X, User } from 'lucide-react'
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
import { db, auth } from '@/lib/firebase'
import {
  getDashboardFinanceiro,
  listPagamentosWithClientes,
  createPagamento,
  updatePagamentoStatus,
  listAdminProfiles,
} from '@ueno/firebase/queries/financeiro'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { formatDateJST } from '@ueno/utils/date'
import { z } from 'zod'
import type { StatusPagamento, MetodoPagamento, CategoriaPagamento } from '@ueno/firebase'

const registrarSchema = z.object({
  cliente_id: z.string().uuid('Selecione um cliente'),
  servico_id: z.string().uuid().optional(),
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor_jpy: z.coerce.number().int().min(1, 'Valor deve ser maior que zero'),
  metodo: z.enum(['dinheiro', 'transferencia', 'pix', 'outro']),
  categoria: z.enum(['habilitacao', 'taxa', 'material', 'aula', 'outro']).optional(),
  recebido_por: z.string().uuid().optional(),
  data_vencimento: z.string().optional(),
  notas: z.string().optional(),
})
type RegistrarInput = z.infer<typeof registrarSchema>

const statusLabel: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}

const statusVariant: Record<StatusPagamento, 'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'> = {
  pendente: 'warning',
  pago: 'success',
  cancelado: 'destructive',
  estornado: 'outline',
}

const metodoLabel: Record<MetodoPagamento, string> = {
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  pix: 'PIX',
  outro: 'Outro',
}

const categoriaLabel: Record<CategoriaPagamento, string> = {
  habilitacao: 'Habilitação',
  taxa: 'Taxa',
  material: 'Material',
  aula: 'Aula',
  outro: 'Outro',
}

function formatJpy(valor: number) {
  return `¥${valor.toLocaleString('ja-JP')}`
}

function getMesAtual() {
  return new Date().toISOString().slice(0, 7)
}

export function FinanceiroPage() {
  const queryClient = useQueryClient()
  const [mes, setMes] = useState(getMesAtual())
  const [statusFiltro, setStatusFiltro] = useState<StatusPagamento | ''>('')
  const [addOpen, setAddOpen] = useState(false)

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['financeiro', 'dashboard', mes],
    queryFn: () => getDashboardFinanceiro(db, mes),
  })

  const { data: pagamentos, isLoading: loadingPags } = useQuery({
    queryKey: ['financeiro', 'pagamentos', mes, statusFiltro],
    queryFn: () =>
      listPagamentosWithClientes(db, {
        ...(statusFiltro && { status: statusFiltro }),
        data_inicio: `${mes}-01`,
        data_fim: new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1))
          .toISOString()
          .slice(0, 10),
      }),
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes', 'list'],
    queryFn: () => listClientes(db),
    enabled: addOpen,
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos', 'list'],
    queryFn: () => listServicos(db),
    enabled: addOpen,
  })

  const { data: admins } = useQuery({
    queryKey: ['financeiro', 'admins'],
    queryFn: () => listAdminProfiles(db),
    enabled: addOpen,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarInput>({
    resolver: zodResolver(registrarSchema),
    defaultValues: { metodo: 'pix' },
  })

  const selectedClienteId = useWatch({ control, name: 'cliente_id' })
  const selectedCliente = clientes?.find((c) => c.id === selectedClienteId)

  const addMutation = useMutation({
    mutationFn: async (data: RegistrarInput) => {
      const user = auth.currentUser
      if (!user) throw new Error('Não autenticado')
      return createPagamento(db, {
        cliente_id: data.cliente_id,
        servico_id: data.servico_id || null,
        agendamento_id: null,
        descricao: data.descricao,
        valor_jpy: data.valor_jpy,
        metodo: data.metodo,
        categoria: data.categoria || null,
        recebido_por: data.recebido_por || null,
        status: 'pendente',
        data_vencimento: data.data_vencimento || null,
        data_pagamento: null,
        comprovante_url: null,
        notas: data.notas || null,
        registrado_por: user.uid,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
      setAddOpen(false)
      reset()
    },
  })

  const pagarMutation = useMutation({
    mutationFn: (id: string) =>
      updatePagamentoStatus(db, id, 'pago', new Date().toISOString().slice(0, 10)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financeiro'] }),
  })

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => updatePagamentoStatus(db, id, 'cancelado'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financeiro'] }),
  })

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Gestão de cobranças e pagamentos"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Cobrança
          </Button>
        }
      />

      <div className="space-y-6 p-8">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-40"
          />
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as StatusPagamento | '')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
            <option value="estornado">Estornado</option>
          </select>
        </div>

        {/* KPI cards */}
        {loadingDash ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Pago no mês</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{formatJpy(dashboard?.total_pago_mes ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{formatJpy(dashboard?.total_pendente ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Cancelado</p>
              <p className="mt-1 text-2xl font-bold text-muted-foreground">{formatJpy(dashboard?.total_cancelado ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Cobranças</p>
              <p className="mt-1 text-2xl font-bold">{dashboard?.quantidade_pagamentos ?? 0}</p>
            </div>
          </div>
        )}

        {/* Tabela */}
        {loadingPags ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : pagamentos?.length === 0 ? (
          <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
            Nenhuma cobrança encontrada para este período.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium">Valor</th>
                  <th className="px-4 py-3 text-left font-medium">Método</th>
                  <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                  <th className="px-4 py-3 text-left font-medium">Pago em</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagamentos?.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.cliente?.profile?.avatar_url ? (
                          <img
                            src={p.cliente.profile.avatar_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{p.cliente?.profile?.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span>{p.descricao}</span>
                      {p.notas && <p className="text-xs text-muted-foreground mt-0.5">{p.notas}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.categoria ? categoriaLabel[p.categoria] : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatJpy(p.valor_jpy)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{metodoLabel[p.metodo]}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.data_vencimento ? formatDateJST(p.data_vencimento) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.data_pagamento ? formatDateJST(p.data_pagamento) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'pendente' && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            isLoading={pagarMutation.isPending}
                            onClick={() => pagarMutation.mutate(p.id)}
                          >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Pago
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={cancelarMutation.isPending}
                            onClick={() => cancelarMutation.mutate(p.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); reset() } else setAddOpen(true) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Cobrança</DialogTitle>
          </DialogHeader>
          <form
            id="fin-form"
            onSubmit={handleSubmit((data) => addMutation.mutate(data))}
            className="space-y-4 py-2"
          >
            {/* Cliente selector + avatar preview */}
            <div className="space-y-2">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
                  {selectedCliente?.profile?.avatar_url ? (
                    <img src={selectedCliente.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <select
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  {...register('cliente_id')}
                  defaultValue=""
                >
                  <option value="" disabled>Selecione um cliente...</option>
                  {clientes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.profile?.full_name ?? c.id}
                    </option>
                  ))}
                </select>
              </div>
              {errors.cliente_id && (
                <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição <span className="text-destructive">*</span></Label>
              <Input {...register('descricao')} placeholder="Ex: Serviço de habilitação" />
              {errors.descricao && (
                <p className="text-xs text-destructive">{errors.descricao.message}</p>
              )}
            </div>

            {/* Categoria + Serviço */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('categoria')}
                  defaultValue=""
                >
                  <option value="">Sem categoria</option>
                  <option value="habilitacao">Habilitação</option>
                  <option value="taxa">Taxa</option>
                  <option value="material">Material</option>
                  <option value="aula">Aula</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('servico_id')}
                  defaultValue=""
                >
                  <option value="">Nenhum</option>
                  {servicos?.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Valor + Método */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor (¥) <span className="text-destructive">*</span></Label>
                <Input type="number" {...register('valor_jpy')} placeholder="0" />
                {errors.valor_jpy && (
                  <p className="text-xs text-destructive">{errors.valor_jpy.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('metodo')}
                >
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {/* Admin recebedor */}
            <div className="space-y-2">
              <Label>Recebido por</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...register('recebido_por')}
                defaultValue=""
              >
                <option value="">Não informado</option>
                {admins?.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            </div>

            {/* Data vencimento */}
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input type="date" {...register('data_vencimento')} />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <textarea
                {...register('notas')}
                className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); reset() }}>Cancelar</Button>
            <Button type="submit" form="fin-form" isLoading={isSubmitting || addMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
