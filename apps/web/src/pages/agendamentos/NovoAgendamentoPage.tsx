import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db } from '@/lib/firebase'
import { createAgendamento } from '@ueno/firebase/queries/agendamentos'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { listInstrutores } from '@ueno/firebase/queries/perfis'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { jstToUTC } from '@ueno/utils/date'
import { agendamentoSchema } from '@ueno/utils/validators'
import type { AgendamentoInsert } from '@ueno/firebase'

// O form usa strings locais para o datetime-local; convertemos para UTC no submit
interface FormValues {
  cliente_id: string
  instrutor_id: string
  servico_id: string
  data_hora_inicio_local: string
  data_hora_fim_local: string
  local: string
  notas_admin: string
}

export function NovoAgendamentoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)

  // Quando chamado a partir do detalhe de um cliente, estes params chegam preenchidos
  const clienteIdFixo = searchParams.get('cliente_id') ?? ''
  const voltaUrl = searchParams.get('volta') ?? '/agendamentos'

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => listClientes(db),
    staleTime: 30_000,
    // Quando cliente está fixado, busca só para mostrar o nome; sem fixação, para o select
    enabled: true,
  })

  const { data: instrutores } = useQuery({
    queryKey: ['instrutores'],
    queryFn: () => listInstrutores(db),
    staleTime: 60_000,
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => listServicos(db),
    staleTime: 60_000,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      cliente_id: clienteIdFixo,
      instrutor_id: '',
      servico_id: '',
      data_hora_inicio_local: '',
      data_hora_fim_local: '',
      local: '',
      notas_admin: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (input: AgendamentoInsert) => createAgendamento(db, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      if (clienteIdFixo) {
        queryClient.invalidateQueries({ queryKey: ['clientes', clienteIdFixo, 'agendamentos'] })
      }
      navigate(clienteIdFixo ? voltaUrl : `/agendamentos/${data.id}`)
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)

    // Converter datetime-local (interpretado como JST) para UTC ISO string
    const data_hora_inicio = jstToUTC(new Date(values.data_hora_inicio_local))
    const data_hora_fim = jstToUTC(new Date(values.data_hora_fim_local))

    // Validar com o schema oficial antes de enviar
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
      const msg = parsed.error.errors[0]?.message ?? 'Dados inválidos'
      setServerError(msg)
      return
    }

    try {
      await mutation.mutateAsync({
        ...parsed.data,
        tipo_evento: 'ueno',
        data_hora_inicio,
        data_hora_fim,
        local: parsed.data.local ?? null,
        notas_admin: parsed.data.notas_admin ?? null,
        notas_instrutor: null,
        created_by: null,
        status: 'agendado',
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar agendamento')
    }
  }

  return (
    <div>
      <PageHeader
        title="Novo Agendamento"
        subtitle="Preencha os dados para criar um novo agendamento"
      />

      <div className="px-8 pt-4">
        <Link
          to={voltaUrl}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
      </div>

      <div className="p-8 max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente */}
              <div className="space-y-2">
                <Label>
                  Cliente <span className="text-destructive">*</span>
                </Label>
                {clienteIdFixo ? (
                  <>
                    <input type="hidden" {...register('cliente_id')} />
                    <p className="h-10 flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                      {clientes?.find((c) => c.id === clienteIdFixo)?.profile.full_name ?? clienteIdFixo}
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      {...register('cliente_id', { required: 'Selecione um cliente' })}
                    >
                      <option value="">Selecionar cliente</option>
                      {clientes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.profile.full_name}
                        </option>
                      ))}
                    </select>
                    {errors.cliente_id && (
                      <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
                    )}
                  </>
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
                    <option key={i.id} value={i.id}>
                      {i.full_name}
                    </option>
                  ))}
                </select>
                {errors.instrutor_id && (
                  <p className="text-xs text-destructive">{errors.instrutor_id.message}</p>
                )}
              </div>

              {/* Serviço */}
              <div className="space-y-2">
                <Label>
                  Serviço <span className="text-destructive">*</span>
                </Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('servico_id', { required: 'Selecione um serviço' })}
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

              {/* Data/Hora Início (JST) */}
              <div className="space-y-2">
                <Label>
                  Data e Hora de Início (JST) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  {...register('data_hora_inicio_local', { required: 'Informe o horário de início' })}
                />
                {errors.data_hora_inicio_local && (
                  <p className="text-xs text-destructive">{errors.data_hora_inicio_local.message}</p>
                )}
              </div>

              {/* Data/Hora Fim (JST) */}
              <div className="space-y-2">
                <Label>
                  Data e Hora de Término (JST) <span className="text-destructive">*</span>
                </Label>
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
            <Link to={voltaUrl}>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>
              Criar Agendamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
