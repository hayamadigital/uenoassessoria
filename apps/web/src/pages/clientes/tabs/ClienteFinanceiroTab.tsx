import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, ChevronDown, ChevronRight, X } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { db, auth } from '@/lib/firebase'
import {
  listPagamentos,
  createPagamento,
  updatePagamentoStatus,
  listParcelas,
  upsertParcelas,
  updateParcelaStatus,
  deleteParcela,
  listAdminProfiles,
} from '@ueno/firebase/queries/financeiro'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { z } from 'zod'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteWithProfile, StatusPagamento, MetodoPagamento, StatusParcela, Parcela } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

const registrarSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor_jpy: z.coerce.number().int().min(1, 'Valor deve ser maior que zero'),
  metodo: z.enum(['dinheiro', 'transferencia', 'pix', 'outro']),
  categoria: z.enum(['habilitacao', 'taxa', 'material', 'aula', 'outro']).optional(),
  servico_id: z.string().uuid().optional(),
  recebido_por: z.string().uuid().optional(),
  data_vencimento: z.string().optional(),
  notas: z.string().optional(),
})
type RegistrarInput = z.infer<typeof registrarSchema>

const gerarParcelasSchema = z.object({
  quantidade: z.coerce.number().int().min(2).max(24),
  valor_original_jpy: z.coerce.number().int().min(1),
  data_primeira: z.string().optional(),
})
type GerarParcelasInput = z.infer<typeof gerarParcelasSchema>

const statusLabel: Record<StatusPagamento, string> = {
  pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado', estornado: 'Estornado',
}
const statusVariant: Record<StatusPagamento, 'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'> = {
  pendente: 'warning', pago: 'success', cancelado: 'destructive', estornado: 'outline',
}
const parcelaStatusLabel: Record<StatusParcela, string> = {
  pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado', atrasado: 'Atrasado',
}
const parcelaStatusVariant: Record<StatusParcela, 'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'> = {
  pendente: 'warning', pago: 'success', cancelado: 'secondary', atrasado: 'destructive',
}
const metodoLabel: Record<MetodoPagamento, string> = {
  dinheiro: 'Dinheiro', transferencia: 'Transferência', pix: 'PIX', outro: 'Outro',
}

function formatJpy(valor: number) {
  return `¥${valor.toLocaleString('ja-JP')}`
}

interface ParcelasRowProps {
  pagamentoId: string
  clienteId: string
}

function ParcelasRow({ pagamentoId, clienteId }: ParcelasRowProps) {
  const queryClient = useQueryClient()
  const [gerarOpen, setGerarOpen] = useState(false)

  const { data: parcelas, isLoading } = useQuery({
    queryKey: ['parcelas', pagamentoId],
    queryFn: () => listParcelas(db, pagamentoId),
  })

  const {
    register,
    handleSubmit,
    reset: resetGerar,
    formState: { errors: errosGerar },
  } = useForm<GerarParcelasInput>({ resolver: zodResolver(gerarParcelasSchema) })

  const gerarMutation = useMutation({
    mutationFn: async (data: GerarParcelasInput) => {
      const novasParcelas = Array.from({ length: data.quantidade }, (_, i) => {
        let dataVenc: string | undefined
        if (data.data_primeira) {
          const d = new Date(data.data_primeira)
          d.setMonth(d.getMonth() + i)
          dataVenc = d.toISOString().slice(0, 10)
        }
        return {
          pagamento_id: pagamentoId,
          numero: i + 1,
          valor_original_jpy: data.valor_original_jpy,
          valor_pago_jpy: 0,
          status: 'pendente' as StatusParcela,
          data_vencimento: dataVenc ?? null,
          data_pagamento: null,
          notas: null,
        }
      })
      return upsertParcelas(db, pagamentoId, novasParcelas)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcelas', pagamentoId] })
      setGerarOpen(false)
      resetGerar()
    },
  })

  const pagarParcelaMutation = useMutation({
    mutationFn: (p: Parcela) =>
      updateParcelaStatus(
        db,
        pagamentoId,
        p.id,
        'pago',
        p.valor_original_jpy,
        new Date().toISOString().slice(0, 10),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parcelas', pagamentoId] }),
  })

  const cancelarParcelaMutation = useMutation({
    mutationFn: (id: string) => updateParcelaStatus(db, pagamentoId, id, 'cancelado'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parcelas', pagamentoId] }),
  })

  const atrasarParcelaMutation = useMutation({
    mutationFn: (id: string) => updateParcelaStatus(db, pagamentoId, id, 'atrasado'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parcelas', pagamentoId] }),
  })

  if (isLoading) {
    return (
      <tr>
        <td colSpan={8} className="px-8 py-3 bg-muted/10">
          <Spinner />
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={8} className="bg-muted/10 px-8 py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Parcelas ({parcelas?.length ?? 0})
            </p>
            <Dialog open={gerarOpen} onOpenChange={setGerarOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Gerar Parcelas
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Gerar Parcelas</DialogTitle>
                </DialogHeader>
                <form
                  id="parcelas-form"
                  onSubmit={handleSubmit((d) => gerarMutation.mutate(d))}
                  className="space-y-4 py-2"
                >
                  <div className="space-y-2">
                    <Label>Quantidade <span className="text-destructive">*</span></Label>
                    <Input type="number" {...register('quantidade')} placeholder="Ex: 3" min={2} max={24} />
                    {errosGerar.quantidade && (
                      <p className="text-xs text-destructive">{errosGerar.quantidade.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Valor por parcela (¥) <span className="text-destructive">*</span></Label>
                    <Input type="number" {...register('valor_original_jpy')} placeholder="0" />
                    {errosGerar.valor_original_jpy && (
                      <p className="text-xs text-destructive">{errosGerar.valor_original_jpy.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Data da 1ª parcela</Label>
                    <Input type="date" {...register('data_primeira')} />
                  </div>
                </form>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGerarOpen(false)}>Cancelar</Button>
                  <Button
                    type="submit"
                    form="parcelas-form"
                    isLoading={gerarMutation.isPending}
                  >
                    Gerar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {(parcelas?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma parcela. Clique em "Gerar Parcelas" para criar.</p>
          ) : (
            <div className="rounded-md border bg-background">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Valor Original</th>
                    <th className="px-3 py-2 text-left font-medium">Valor Pago</th>
                    <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                    <th className="px-3 py-2 text-left font-medium">Pago em</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parcelas?.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10">
                      <td className="px-3 py-2 font-medium">{p.numero}</td>
                      <td className="px-3 py-2">{formatJpy(p.valor_original_jpy)}</td>
                      <td className="px-3 py-2">{formatJpy(p.valor_pago_jpy)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.data_vencimento ? formatDateJST(p.data_vencimento) : '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.data_pagamento ? formatDateJST(p.data_pagamento) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={parcelaStatusVariant[p.status]}>
                          {parcelaStatusLabel[p.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {p.status === 'pendente' && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => pagarParcelaMutation.mutate(p)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Pago
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-amber-600"
                              onClick={() => atrasarParcelaMutation.mutate(p.id)}
                            >
                              Atrasar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-xs"
                              onClick={() => cancelarParcelaMutation.mutate(p.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {p.status === 'atrasado' && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => pagarParcelaMutation.mutate(p)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Pago
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-xs"
                              onClick={() => cancelarParcelaMutation.mutate(p.id)}
                            >
                              <X className="h-3 w-3" />
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
      </td>
    </tr>
  )
}

export function ClienteFinanceiroTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'pagamentos'],
    queryFn: () => listPagamentos(db, { cliente_id: cliente.id }),
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
    formState: { errors, isSubmitting },
  } = useForm<RegistrarInput>({
    resolver: zodResolver(registrarSchema),
    defaultValues: { metodo: 'pix' },
  })

  const addMutation = useMutation({
    mutationFn: async (data: RegistrarInput) => {
      const user = auth.currentUser
      if (!user) throw new Error('Não autenticado')
      return createPagamento(db, {
        cliente_id: cliente.id,
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
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'pagamentos'] })
      setAddOpen(false)
      reset()
    },
  })

  const pagarMutation = useMutation({
    mutationFn: (id: string) =>
      updatePagamentoStatus(db, id, 'pago', new Date().toISOString().slice(0, 10)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'pagamentos'] }),
  })

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => updatePagamentoStatus(db, id, 'cancelado'),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'pagamentos'] }),
  })

  const totalPago = pagamentos?.filter((p) => p.status === 'pago').reduce((s, p) => s + p.valor_jpy, 0) ?? 0
  const totalPendente = pagamentos?.filter((p) => p.status === 'pendente').reduce((s, p) => s + p.valor_jpy, 0) ?? 0

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      {!isLoading && (pagamentos?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total Pago</p>
            <p className="text-lg font-semibold text-green-600">{formatJpy(totalPago)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total Pendente</p>
            <p className="text-lg font-semibold text-amber-600">{formatJpy(totalPendente)}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {pagamentos?.length ?? 0} cobrança(s)
        </h2>
        <Dialog open={addOpen} onOpenChange={(o: boolean) => { if (!o) { setAddOpen(false); reset() } else setAddOpen(true) }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Cobrança
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Cobrança</DialogTitle>
            </DialogHeader>
            <form
              id="pag-form"
              onSubmit={handleSubmit((data) => addMutation.mutate(data))}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label>Descrição <span className="text-destructive">*</span></Label>
                <Input {...register('descricao')} placeholder="Ex: Serviço de habilitação" />
                {errors.descricao && (
                  <p className="text-xs text-destructive">{errors.descricao.message}</p>
                )}
              </div>

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

              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" {...register('data_vencimento')} />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <textarea
                  {...register('notas')}
                  className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddOpen(false); reset() }}>
                Cancelar
              </Button>
              <Button type="submit" form="pag-form" isLoading={isSubmitting || addMutation.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : pagamentos?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhuma cobrança registrada.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-8" />
                <th className="px-4 py-3 text-left font-medium">Descrição</th>
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
                <>
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(p.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedIds.has(p.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{p.descricao}</span>
                      {p.notas && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.notas}</p>
                      )}
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
                      <div className="flex gap-1 justify-end">
                        {p.status === 'pendente' && (
                          <>
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
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedIds.has(p.id) && (
                    <ParcelasRow key={`parcelas-${p.id}`} pagamentoId={p.id} clienteId={cliente.id} />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
