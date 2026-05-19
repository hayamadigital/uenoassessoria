import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ExternalLink } from 'lucide-react'
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
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { listProcessosByCliente, createProcesso } from '@ueno/firebase/queries/processos'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { listVariacoesByServico } from '@ueno/firebase/queries/servico_variacoes'
import { listEtapaTemplatesByServico } from '@ueno/firebase/queries/etapa_templates'
import { getContratoTemplateForServico } from '@ueno/firebase/queries/contrato_templates'
import { createContrato } from '@ueno/firebase/queries/contratos'
import { processoSchema, type ProcessoInput } from '@ueno/utils/validators'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteWithProfile, StatusClienteProcesso } from '@ueno/firebase'

function applyTemplateVars(
  html: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val),
    html,
  )
}

interface Context {
  cliente: ClienteWithProfile
}

const statusLabel: Record<StatusClienteProcesso, string> = {
  ativo: 'Ativo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const statusVariant: Record<
  StatusClienteProcesso,
  'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'
> = {
  ativo: 'default',
  concluido: 'success',
  cancelado: 'destructive',
}

function formatPreco(item: {
  preco_variavel?: boolean
  preco_jpy?: number | null
  preco_min_jpy?: number | null
  preco_max_jpy?: number | null
}) {
  if (item.preco_variavel && item.preco_min_jpy != null && item.preco_max_jpy != null) {
    return `¥${item.preco_min_jpy.toLocaleString('ja-JP')} - ¥${item.preco_max_jpy.toLocaleString('ja-JP')}`
  }
  return item.preco_jpy != null ? `¥${item.preco_jpy.toLocaleString('ja-JP')}` : '—'
}

export function ClienteProcessoTab() {
  const { id } = useParams<{ id: string }>()
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: processos, isLoading } = useQuery({
    queryKey: ['clientes', id, 'processos'],
    queryFn: () => listProcessosByCliente(db, cliente.id),
    enabled: !!cliente.id,
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => listServicos(db, true),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProcessoInput>({
    resolver: zodResolver(processoSchema),
  })

  const selectedServicoId = watch('servico_id')
  const selectedVariacaoId = watch('variacao_id')
  const selectedServico = servicos?.find((s) => s.id === selectedServicoId)

  const { data: variacoes = [] } = useQuery({
    queryKey: ['servico-variacoes', selectedServicoId, 'active'],
    queryFn: () => listVariacoesByServico(db, selectedServicoId!, true),
    enabled: !!selectedServicoId && !!selectedServico?.usa_variacoes,
  })

  useEffect(() => {
    if (!selectedServicoId || !servicos) return
    const servico = servicos.find((s) => s.id === selectedServicoId)
    if (servico) {
      if (servico.usa_variacoes) {
        setValue('variacao_id', '')
        setValue('valor_acordado_jpy', undefined)
      } else {
        setValue('variacao_id', '')
        setValue('valor_acordado_jpy', servico.preco_variavel ? undefined : servico.preco_jpy ?? undefined)
      }
    }
  }, [selectedServicoId, servicos, setValue])

  useEffect(() => {
    if (!selectedVariacaoId) return
    const variacao = variacoes.find((v) => v.id === selectedVariacaoId)
    if (variacao) setValue('valor_acordado_jpy', variacao.preco_variavel ? undefined : variacao.preco_jpy ?? undefined)
  }, [selectedVariacaoId, variacoes, setValue])

  const mutation = useMutation({
    mutationFn: async (data: ProcessoInput) => {
      const processo = await createProcesso(db, {
        cliente_id: cliente.id,
        servico_id: data.servico_id,
        variacao_id: data.variacao_id || null,
        data_inicio: data.data_inicio || null,
        valor_acordado_jpy: data.valor_acordado_jpy ?? null,
        notas: data.notas || null,
        status: 'ativo',
      })

      // Auto-criar etapas a partir dos templates do serviço
      const etapaTemplates = await listEtapaTemplatesByServico(db, data.servico_id, data.variacao_id || null)
      if (etapaTemplates.length > 0) {
        await Promise.all(
          etapaTemplates.map((t) =>
            addDoc(collection(db, 'processo_etapas'), {
              processo_id: processo.id,
              nome: t.nome,
              descricao: t.descricao,
              responsavel: t.responsavel_padrao,
              ordem: t.ordem,
              status: 'pendente',
              agendamento_modo: 'nao_aplica',
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            }),
          ),
        )
      }

      // Auto-criar contrato a partir do template configurado
      const contratoTemplate = await getContratoTemplateForServico(db, data.servico_id)
      if (contratoTemplate) {
        const servicoSelecionado = servicos?.find((s) => s.id === data.servico_id)
        const variacaoSelecionada = variacoes.find((v) => v.id === data.variacao_id)
        const servicoNomeContrato = variacaoSelecionada
          ? `${servicoSelecionado?.nome ?? ''} — ${variacaoSelecionada.nome}`
          : servicoSelecionado?.nome ?? ''
        const corpoHtml = applyTemplateVars(contratoTemplate.corpo_html, {
          cliente_nome: cliente.profile.full_name,
          servico_nome: servicoNomeContrato,
          valor_jpy: data.valor_acordado_jpy?.toString() ?? '0',
          data_inicio: data.data_inicio ?? '',
          data_hoje: new Date().toLocaleDateString('pt-BR'),
        })
        await createContrato(db, {
          cliente_id: cliente.id,
          servico_id: data.servico_id,
          processo_id: processo.id,
          aditivo_de: null,
          titulo: `Contrato — ${servicoNomeContrato || 'Serviço'}`,
          corpo_html: corpoHtml,
          status: 'rascunho',
          assinado_em: null,
          assinatura_url: null,
          ip_assinatura: null,
          pdf_url: null,
          enviado_por: null,
        })
      }

      return processo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', id, 'processos'] })
      setOpen(false)
      reset()
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {processos?.length ?? 0} processo(s)
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Processo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Processo</DialogTitle>
            </DialogHeader>
            <form
              id="processo-form"
              onSubmit={handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label>
                  Tipo de Serviço <span className="text-destructive">*</span>
                </Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('servico_id')}
                >
                  <option value="">Selecionar serviço</option>
                  {servicos?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
                {errors.servico_id && (
                  <p className="text-xs text-destructive">{errors.servico_id.message}</p>
                )}
              </div>
              {selectedServico?.usa_variacoes && (
                <div className="space-y-2">
                  <Label>
                    Variação <span className="text-destructive">*</span>
                  </Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...register('variacao_id')}
                  >
                    <option value="">Selecionar variação</option>
                    {variacoes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome} · {formatPreco(v)}
                        {v.duracao_texto ? ` · ${v.duracao_texto}` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.variacao_id && (
                    <p className="text-xs text-destructive">{errors.variacao_id.message}</p>
                  )}
                  {variacoes.length === 0 && (
                    <p className="text-xs text-destructive">
                      Este serviço ainda não possui variações ativas.
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" {...register('data_inicio')} />
              </div>
              <div className="space-y-2">
                <Label>Valor Acordado (¥)</Label>
                <Input
                  type="number"
                  min={0}
                  {...register('valor_acordado_jpy', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <textarea
                  {...register('notas')}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </form>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="processo-form"
                isLoading={isSubmitting || mutation.isPending}
                disabled={!!selectedServico?.usa_variacoes && !selectedVariacaoId}
              >
                Criar Processo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : processos?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum processo cadastrado. Clique em "Adicionar Processo" para começar.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Serviço</th>
                <th className="px-4 py-3 text-left font-medium">Data Início</th>
                <th className="px-4 py-3 text-left font-medium">Valor (¥)</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Criado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {processos?.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    {p.variacao ? `${p.servico.nome} — ${p.variacao.nome}` : p.servico.nome}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.data_inicio ? formatDateJST(p.data_inicio) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.valor_acordado_jpy != null
                      ? `¥${p.valor_acordado_jpy.toLocaleString('ja-JP')}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateJST(p.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/clientes/${id}/processos/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver detalhes
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
