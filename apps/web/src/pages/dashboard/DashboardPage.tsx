import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardList, Layers3, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import {
  listEtapasPendentesAssessoria,
  updateEtapa,
  type EtapaPendenteItem,
} from '@ueno/firebase/queries/etapas'
import { listProcessosAtivos } from '@ueno/firebase/queries/processos'
import { formatDateJST, formatTimeJST } from '@ueno/utils/date'
import type {
  AgendamentoWithRelations,
  ClienteProcessoWithCliente,
  StatusAgendamento,
  StatusProcessoEtapa,
} from '@ueno/firebase'

type ProcessoServicoResumo = {
  servico_id: string
  servico_nome: string
  total: number
}

type DashboardOperacionalData = {
  etapasPendentesAssessoria: EtapaPendenteItem[]
  processosAtivos: ClienteProcessoWithCliente[]
  clientesAtivos: ClienteProcessoWithCliente[]
  resumoServicos: ProcessoServicoResumo[]
  proximosAgendamentos: AgendamentoWithRelations[]
}

const statusEtapaLabel: Record<StatusProcessoEtapa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
}

const statusEtapaClass: Record<StatusProcessoEtapa, string> = {
  pendente: 'bg-amber-50 text-amber-700',
  em_andamento: 'bg-blue-50 text-blue-700',
  concluido: 'bg-green-50 text-green-700',
  atrasado: 'bg-red-50 text-red-700',
}

const statusEtapaOptions: StatusProcessoEtapa[] = [
  'pendente',
  'em_andamento',
  'atrasado',
  'concluido',
]

const statusAgendamentoLabel: Record<StatusAgendamento, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
}

async function fetchDashboardOperacional(): Promise<DashboardOperacionalData> {
  const [etapasPendentesAssessoria, processos, agendamentos] = await Promise.all([
    listEtapasPendentesAssessoria(db),
    listProcessosAtivos(db),
    listAgendamentos(db, { data_inicio: new Date().toISOString() }),
  ])

  const processosAtivos = processos.filter((processo) => processo.status === 'ativo')
  const resumoMap = new Map<string, ProcessoServicoResumo>()

  processosAtivos.forEach((processo) => {
    const servicoId = processo.servico_id
    const current = resumoMap.get(servicoId)
    if (current) {
      current.total += 1
      return
    }

    resumoMap.set(servicoId, {
      servico_id: servicoId,
      servico_nome: processo.servico?.nome ?? 'Serviço sem nome',
      total: 1,
    })
  })

  const clientesPorId = new Map<string, ClienteProcessoWithCliente>()
  processosAtivos.forEach((processo) => {
    if (!clientesPorId.has(processo.cliente_id)) {
      clientesPorId.set(processo.cliente_id, processo)
    }
  })

  const proximosAgendamentos = agendamentos
    .filter((agendamento) => !['cancelado', 'faltou', 'concluido'].includes(agendamento.status))
    .sort((a, b) => a.data_hora_inicio.localeCompare(b.data_hora_inicio))
    .slice(0, 8)

  return {
    etapasPendentesAssessoria,
    processosAtivos,
    clientesAtivos: [...clientesPorId.values()].slice(0, 10),
    resumoServicos: [...resumoMap.values()]
      .sort((a, b) => b.total - a.total || a.servico_nome.localeCompare(b.servico_nome))
      .slice(0, 10),
    proximosAgendamentos,
  }
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  tone: 'blue' | 'amber' | 'green' | 'slate'
}) {
  const tones = {
    blue: { border: '#3b82f6', bg: '#eff6ff' },
    amber: { border: '#f59e0b', bg: '#fffbeb' },
    green: { border: '#16a34a', bg: '#f0fdf4' },
    slate: { border: '#475569', bg: '#f8fafc' },
  }[tone]

  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      style={{ borderLeftColor: tones.border, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="rounded-md p-1.5" style={{ background: tones.bg }}>
          <Icon className="h-3.5 w-3.5" style={{ color: tones.border }} />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function PendingAssessmentSteps({ etapas }: { etapas: EtapaPendenteItem[] }) {
  const queryClient = useQueryClient()

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProcessoEtapa }) =>
      updateEtapa(db, id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'operacional-v1'] })
    },
  })

  const visibleEtapas = etapas.slice(0, 10)

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <SectionHeader
        title="Etapas Pendentes da Assessoria"
        subtitle={`${etapas.length} etapa(s) aguardando ação interna`}
        action={
          <Link
            to="/processos"
            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Ver processos →
          </Link>
        }
      />

      {visibleEtapas.length === 0 ? (
        <EmptyState>Nenhuma etapa pendente para a assessoria.</EmptyState>
      ) : (
        <div className="divide-y rounded-md border">
          {visibleEtapas.map((etapa) => {
            const isUpdating =
              updateStatusMutation.isPending &&
              updateStatusMutation.variables?.id === etapa.id

            return (
              <div
                key={etapa.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <Link
                  to={`/processos/${etapa.processo_id}`}
                  className="min-w-0 flex-1 rounded-sm transition-colors hover:text-primary"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {etapa.nome}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {etapa.cliente_nome}
                    {etapa.data_agendada ? ` · ${formatDateJST(etapa.data_agendada)}` : ''}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusEtapaClass[etapa.status]}`}>
                    {statusEtapaLabel[etapa.status]}
                  </span>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    value={etapa.status}
                    disabled={isUpdating}
                    aria-label={`Atualizar status da etapa ${etapa.nome}`}
                    onChange={(event) => {
                      updateStatusMutation.mutate({
                        id: etapa.id,
                        status: event.target.value as StatusProcessoEtapa,
                      })
                    }}
                  >
                    {statusEtapaOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusEtapaLabel[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActiveClientsList({ processos }: { processos: ClienteProcessoWithCliente[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <SectionHeader
        title="Clientes Ativos"
        subtitle={`${processos.length} cliente(s) com processo ativo`}
        action={
          <Link
            to="/clientes"
            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Ver clientes →
          </Link>
        }
      />

      {processos.length === 0 ? (
        <EmptyState>Nenhum cliente com processo ativo.</EmptyState>
      ) : (
        <div className="divide-y rounded-md border">
          {processos.map((processo) => (
            <Link
              key={processo.cliente_id}
              to={`/clientes/${processo.cliente_id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {processo.cliente.profile.full_name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {processo.servico?.nome ?? 'Serviço sem nome'}
                  {processo.variacao ? ` · ${processo.variacao.nome}` : ''}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
                Ativo
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ProcessSummaryByService({ resumo }: { resumo: ProcessoServicoResumo[] }) {
  const total = resumo.reduce((acc, item) => acc + item.total, 0)

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <SectionHeader
        title="Processos Ativos por Serviço"
        subtitle={`${total} processo(s) ativo(s) distribuídos por serviço`}
      />

      {resumo.length === 0 ? (
        <EmptyState>Nenhum processo ativo por serviço.</EmptyState>
      ) : (
        <div className="space-y-3">
          {resumo.map((item) => {
            const percent = total > 0 ? Math.max(8, Math.round((item.total / total) * 100)) : 0

            return (
              <div key={item.servico_id}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.servico_nome}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {item.total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UpcomingAppointments({ agendamentos }: { agendamentos: AgendamentoWithRelations[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <SectionHeader
        title="Próximos Agendamentos"
        subtitle={`${agendamentos.length} compromisso(s) na fila`}
        action={
          <Link
            to="/agendamentos"
            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Ver agenda →
          </Link>
        }
      />

      {agendamentos.length === 0 ? (
        <EmptyState>Nenhum próximo agendamento.</EmptyState>
      ) : (
        <div className="divide-y rounded-md border">
          {agendamentos.map((agendamento) => (
            <Link
              key={agendamento.id}
              to={`/agendamentos/${agendamento.id}`}
              className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {agendamento.cliente?.profile.full_name ?? agendamento.cliente_nome ?? 'Agenda interna'}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatDateJST(agendamento.data_hora_inicio)} · {formatTimeJST(agendamento.data_hora_inicio)}
                  {agendamento.servico?.nome ? ` · ${agendamento.servico.nome}` : ''}
                </p>
                {agendamento.local ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {agendamento.local}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700">
                {statusAgendamentoLabel[agendamento.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'operacional-v1'],
    queryFn: fetchDashboardOperacional,
    refetchInterval: 60_000,
  })

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão operacional — ${formatDateJST(new Date().toISOString())}`}
      />

      <div className="space-y-5 p-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-sm text-destructive">
            Erro ao carregar dados. Tente recarregar a página.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4">
              <MetricCard
                label="Etapas da Assessoria"
                value={data?.etapasPendentesAssessoria.length ?? 0}
                icon={ClipboardList}
                tone="amber"
              />
              <MetricCard
                label="Clientes Ativos"
                value={data?.clientesAtivos.length ?? 0}
                icon={Users}
                tone="green"
              />
              <MetricCard
                label="Processos Ativos"
                value={data?.processosAtivos.length ?? 0}
                icon={Layers3}
                tone="blue"
              />
              <MetricCard
                label="Próximos Agendamentos"
                value={data?.proximosAgendamentos.length ?? 0}
                icon={CalendarDays}
                tone="slate"
              />
            </div>

            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 0.65fr)' }}
            >
              <PendingAssessmentSteps etapas={data?.etapasPendentesAssessoria ?? []} />
              <UpcomingAppointments agendamentos={data?.proximosAgendamentos ?? []} />
            </div>

            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
            >
              <ActiveClientsList processos={data?.clientesAtivos ?? []} />
              <ProcessSummaryByService resumo={data?.resumoServicos ?? []} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
