import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Calendar, Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import {
  listAgendamentos,
  updateAgendamentoStatus,
  type AgendamentoFilters,
} from '@ueno/firebase/queries/agendamentos'
import { listInstrutores } from '@ueno/firebase/queries/perfis'
import { formatDateJST, formatTimeJST, getJSTDayStartUTC, getJSTDayEndUTC } from '@ueno/utils/date'
import type { StatusAgendamento } from '@ueno/firebase'

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

export function AgendamentosPage() {
  const queryClient = useQueryClient()
  const [clienteSearch, setClienteSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusAgendamento | ''>('')
  const [instrutorFilter, setInstrutorFilter] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const filters: AgendamentoFilters = {}
  if (statusFilter) filters.status = statusFilter
  if (instrutorFilter) filters.instrutor_id = instrutorFilter
  if (dataInicio) filters.data_inicio = getJSTDayStartUTC(dataInicio)
  if (dataFim) filters.data_fim = getJSTDayEndUTC(dataFim)

  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['agendamentos', filters],
    queryFn: () => listAgendamentos(db, filters),
    staleTime: 0,
  })

  const { data: instrutores } = useQuery({
    queryKey: ['instrutores'],
    queryFn: () => listInstrutores(db),
    staleTime: 60_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAgendamento }) =>
      updateAgendamentoStatus(db, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendamentos'] }),
  })

  const filtered = agendamentos?.filter((ag) =>
    clienteSearch
      ? ag.cliente.profile.full_name.toLowerCase().includes(clienteSearch.toLowerCase())
      : true,
  )

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        subtitle={`${filtered?.length ?? 0} agendamento(s) encontrado(s)`}
        actions={
          <Link to="/agendamentos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </Link>
        }
      />

      <div className="p-8 space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              className="pl-9"
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusAgendamento | '')}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabel).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={instrutorFilter}
            onChange={(e) => setInstrutorFilter(e.target.value)}
          >
            <option value="">Todos os instrutores</option>
            {instrutores?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">De</label>
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Até</label>
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data / Hora</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Instrutor</th>
                  <th className="px-4 py-3 text-left font-medium">Serviço</th>
                  <th className="px-4 py-3 text-left font-medium">Local</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum agendamento encontrado
                    </td>
                  </tr>
                ) : null}
                {filtered?.map((ag) => {
                  const proximos = statusTransitions[ag.status]
                  return (
                    <tr key={ag.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{formatDateJST(ag.data_hora_inicio)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatTimeJST(ag.data_hora_inicio)}
                            {' — '}
                            {formatTimeJST(ag.data_hora_fim)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{ag.cliente.profile.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ag.instrutor.full_name}</td>
                      <td className="px-4 py-3">{ag.servico.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ag.local ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[ag.status]}>{statusLabel[ag.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            to={`/agendamentos/${ag.id}`}
                            className="text-primary underline-offset-4 hover:underline text-xs mr-1"
                          >
                            Ver
                          </Link>
                          {proximos?.map((s) => (
                            <Button
                              key={s}
                              variant="outline"
                              size="sm"
                              isLoading={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: ag.id, status: s })}
                            >
                              {statusLabel[s]}
                            </Button>
                          ))}
                        </div>
                      </td>
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
