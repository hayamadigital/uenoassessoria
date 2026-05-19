import { useOutletContext, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import {
  listAgendamentos,
  updateAgendamentoStatus,
} from '@ueno/firebase/queries/agendamentos'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteWithProfile, StatusAgendamento } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

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

export function ClienteAgendamentosTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()

  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'agendamentos'],
    queryFn: () => listAgendamentos(db, { cliente_id: cliente.id }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAgendamento }) =>
      updateAgendamentoStatus(db, id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'agendamentos'] }),
  })

  const novoAgendamentoUrl =
    `/agendamentos/novo?cliente_id=${cliente.id}&volta=/clientes/${cliente.id}/agendamentos`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {agendamentos?.length ?? 0} agendamento(s)
        </h2>
        <Link to={novoAgendamentoUrl}>
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo Agendamento
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : agendamentos?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum agendamento encontrado.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data / Hora</th>
                <th className="px-4 py-3 text-left font-medium">Serviço</th>
                <th className="px-4 py-3 text-left font-medium">Instrutor</th>
                <th className="px-4 py-3 text-left font-medium">Local</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {agendamentos?.map((ag) => {
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
                          {new Date(ag.data_hora_inicio).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Tokyo',
                          })}
                          {' — '}
                          {new Date(ag.data_hora_fim).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Tokyo',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{ag.servico?.nome ?? '—'}</td>
                    <td className="px-4 py-3">{ag.instrutor?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ag.local ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[ag.status]}>
                        {statusLabel[ag.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {proximos && (
                        <div className="flex gap-1 justify-end">
                          {proximos.map((s) => (
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
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
