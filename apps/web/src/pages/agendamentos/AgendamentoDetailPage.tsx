import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Pencil, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import {
  getAgendamento,
  updateAgendamento,
  updateAgendamentoStatus,
} from '@ueno/firebase/queries/agendamentos'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { listInstrutores } from '@ueno/firebase/queries/perfis'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { formatJST, formatDateJST, formatTimeJST, jstToUTC, toJST } from '@ueno/utils/date'
import { agendamentoSchema } from '@ueno/utils/validators'
import { format } from 'date-fns'
import type { StatusAgendamento, AgendamentoInsert } from '@ueno/firebase'

const statusLabel: Record<StatusAgendamento, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
}

const statusVariant: Record<
  StatusAgendamento,
  'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'
> = {
  agendado: 'secondary',
  confirmado: 'default',
  em_andamento: 'warning',
  concluido: 'success',
  cancelado: 'destructive',
  faltou: 'outline',
}

const statusTransitions: Partial<Record<StatusAgendamento, StatusAgendamento[]>> = {
  agendado: ['confirmado', 'cancelado'],
  confirmado: ['em_andamento', 'cancelado'],
  em_andamento: ['concluido', 'faltou'],
}

interface FormValues {
  cliente_id: string
  instrutor_id: string
  servico_id: string
  data_hora_inicio_local: string
  data_hora_fim_local: string
  local: string
  notas_admin: string
}

// Converte UTC ISO string para valor de input datetime-local (JST)
function toDatetimeLocalJST(utcStr: string): string {
  if (!utcStr) return ''
  const jst = toJST(utcStr)
  return format(jst, "yyyy-MM-dd'T'HH:mm")
}

export function AgendamentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: agendamento, isLoading } = useQuery({
    queryKey: ['agendamento', id],
    queryFn: () => getAgendamento(db, id!),
    enabled: !!id,
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => listClientes(db),
    staleTime: 30_000,
    enabled: isEditing,
  })

  const { data: instrutores } = useQuery({
    queryKey: ['instrutores'],
    queryFn: () => listInstrutores(db),
    staleTime: 60_000,
    enabled: isEditing,
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => listServicos(db),
    staleTime: 60_000,
    enabled: isEditing,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  // Pré-popula o form quando os dados carregam ou o modo edição é ativado
  useEffect(() => {
    if (agendamento && isEditing) {
      reset({
        cliente_id: agendamento.cliente_id ?? '',
        instrutor_id: agendamento.instrutor_id ?? '',
        servico_id: agendamento.servico_id ?? '',
        data_hora_inicio_local: toDatetimeLocalJST(agendamento.data_hora_inicio),
        data_hora_fim_local: toDatetimeLocalJST(agendamento.data_hora_fim),
        local: agendamento.local ?? '',
        notas_admin: agendamento.notas_admin ?? '',
      })
    }
  }, [agendamento, isEditing, reset])

  const updateMutation = useMutation({
    mutationFn: (input: Partial<AgendamentoInsert>) =>
      updateAgendamento(db, id!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento', id] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      setIsEditing(false)
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: StatusAgendamento) =>
      updateAgendamentoStatus(db, id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento', id] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const data_hora_inicio = jstToUTC(new Date(values.data_hora_inicio_local))
    const data_hora_fim = jstToUTC(new Date(values.data_hora_fim_local))

    const parsed = agendamentoSchema.safeParse({
      cliente_id: values.cliente_id,
      instrutor_id: values.instrutor_id,
      servico_id: values.servico_id,
      data_hora_inicio,
      data_hora_fim,
      local: values.local || undefined,
      notas_admin: values.notas_admin || undefined,
    })

    if (!parsed.success) {
      setServerError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      await updateMutation.mutateAsync({
        cliente_id: parsed.data.cliente_id,
        instrutor_id: parsed.data.instrutor_id,
        servico_id: parsed.data.servico_id,
        data_hora_inicio,
        data_hora_fim,
        local: parsed.data.local ?? null,
        notas_admin: parsed.data.notas_admin ?? null,
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao salvar agendamento')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  }

  if (!agendamento) {
    return (
      <div className="p-8 text-muted-foreground">Agendamento não encontrado.</div>
    )
  }

  const proximosStatus = statusTransitions[agendamento.status]
  const isPessoal = agendamento.tipo_evento === 'pessoal'
  const tituloPessoa = agendamento.cliente?.profile.full_name ?? 'Evento pessoal'

  return (
    <div>
      <PageHeader
        title="Agendamento"
        subtitle={`${formatDateJST(agendamento.data_hora_inicio)} · ${tituloPessoa}`}
        actions={
          !isEditing && !isPessoal ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          ) : isEditing ? (
            <Button variant="ghost" onClick={() => { setIsEditing(false); setServerError(null) }}>
              <X className="mr-2 h-4 w-4" />
              Cancelar edição
            </Button>
          ) : null
        }
      />

      <div className="px-8 pt-4">
        <Link
          to="/agendamentos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar para Agendamentos
        </Link>
      </div>

      <div className="p-8 space-y-6 max-w-2xl">
        {/* Card principal */}
        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Editar Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cliente */}
                <div className="space-y-2">
                  <Label>Cliente <span className="text-destructive">*</span></Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...register('cliente_id', { required: 'Selecione um cliente' })}
                  >
                    <option value="">Selecionar cliente</option>
                    {clientes?.map((c) => (
                      <option key={c.id} value={c.id}>{c.profile.full_name}</option>
                    ))}
                  </select>
                  {errors.cliente_id && (
                    <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
                  )}
                </div>

                {/* Instrutor */}
                <div className="space-y-2">
                  <Label>Instrutor</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...register('instrutor_id')}
                  >
                    <option value="">Sem instrutor</option>
                    {instrutores?.map((i) => (
                      <option key={i.id} value={i.id}>{i.full_name}</option>
                    ))}
                  </select>
                  {errors.instrutor_id && (
                    <p className="text-xs text-destructive">{errors.instrutor_id.message}</p>
                  )}
                </div>

                {/* Serviço */}
                <div className="space-y-2">
                  <Label>Serviço <span className="text-destructive">*</span></Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...register('servico_id', { required: 'Selecione um serviço' })}
                  >
                    <option value="">Selecionar serviço</option>
                    {servicos?.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  {errors.servico_id && (
                    <p className="text-xs text-destructive">{errors.servico_id.message}</p>
                  )}
                </div>

                {/* Início */}
                <div className="space-y-2">
                  <Label>Data e Hora de Início (JST) <span className="text-destructive">*</span></Label>
                  <Input
                    type="datetime-local"
                    {...register('data_hora_inicio_local', { required: 'Informe o horário de início' })}
                  />
                  {errors.data_hora_inicio_local && (
                    <p className="text-xs text-destructive">{errors.data_hora_inicio_local.message}</p>
                  )}
                </div>

                {/* Fim */}
                <div className="space-y-2">
                  <Label>Data e Hora de Término (JST) <span className="text-destructive">*</span></Label>
                  <Input
                    type="datetime-local"
                    {...register('data_hora_fim_local', { required: 'Informe o horário de término' })}
                  />
                  {errors.data_hora_fim_local && (
                    <p className="text-xs text-destructive">{errors.data_hora_fim_local.message}</p>
                  )}
                </div>

                {/* Local */}
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input {...register('local')} placeholder="Ex: Centro de Exame de Saitama" />
                </div>

                {/* Notas Admin */}
                <div className="space-y-2">
                  <Label>Observações (admin)</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Observações internas..."
                    {...register('notas_admin')}
                  />
                </div>

                {serverError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {serverError}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setServerError(null) }}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="font-medium mt-0.5">
                    {agendamento.cliente_id && agendamento.cliente ? (
                      <Link
                        to={`/clientes/${agendamento.cliente_id}/agendamentos`}
                        className="text-primary hover:underline"
                      >
                        {agendamento.cliente.profile.full_name}
                      </Link>
                    ) : (
                      'Evento pessoal'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Instrutor</dt>
                  <dd className="font-medium mt-0.5">{agendamento.instrutor?.full_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Serviço</dt>
                  <dd className="font-medium mt-0.5">{agendamento.servico?.nome ?? 'Pessoal'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="mt-0.5">
                    <Badge variant={statusVariant[agendamento.status]}>
                      {statusLabel[agendamento.status]}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Início</dt>
                  <dd className="font-medium mt-0.5">
                    {formatJST(agendamento.data_hora_inicio, 'dd/MM/yyyy HH:mm')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Término</dt>
                  <dd className="font-medium mt-0.5">
                    {formatJST(agendamento.data_hora_fim, 'dd/MM/yyyy HH:mm')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Local</dt>
                  <dd className="font-medium mt-0.5">{agendamento.local ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Criado em</dt>
                  <dd className="font-medium mt-0.5">{formatDateJST(agendamento.created_at)}</dd>
                </div>
                {agendamento.notas_admin && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Observações (admin)</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{agendamento.notas_admin}</dd>
                  </div>
                )}
                {agendamento.notas_instrutor && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Observações (instrutor)</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{agendamento.notas_instrutor}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Transições de Status */}
        {proximosStatus && proximosStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atualizar Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status atual:</span>
                <Badge variant={statusVariant[agendamento.status]}>
                  {statusLabel[agendamento.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">→</span>
                {proximosStatus.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    isLoading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(s)}
                  >
                    {statusLabel[s]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
