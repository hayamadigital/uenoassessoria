import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Users, MapPin, ChevronRight, Car } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import {
  getDiasComEtapasRange,
  listRotasDiaRange,
  getProximosDiasJST,
} from '@ueno/firebase/queries/rotas'
import type { RotaDia, StatusRota } from '@ueno/firebase'

const statusRotaLabel: Record<StatusRota, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
}

const statusRotaVariant: Record<
  StatusRota,
  'default' | 'success' | 'warning' | 'secondary'
> = {
  planejado: 'secondary',
  em_andamento: 'warning',
  concluido: 'success',
}

function formatDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return dateStr
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = addDays(today, 1)
  tomorrow.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  if (date.getTime() === tomorrow.getTime()) return 'Amanhã'
  return format(date, "EEE, dd/MM", { locale: ptBR })
}

export function RotasPage() {
  const dias = getProximosDiasJST(7)
  const dataInicio = dias[0]!
  const dataFim = dias[dias.length - 1]!

  const { data: etapasPorDia, isLoading: loadingEtapas } = useQuery({
    queryKey: ['etapas-dias-range', dataInicio, dataFim],
    queryFn: () => getDiasComEtapasRange(db, dataInicio, dataFim),
    staleTime: 60_000,
  })

  const { data: rotasDia, isLoading: loadingRotas } = useQuery({
    queryKey: ['rotas-dia-range', dataInicio, dataFim],
    queryFn: () => listRotasDiaRange(db, dataInicio, dataFim),
    staleTime: 30_000,
  })

  const isLoading = loadingEtapas || loadingRotas

  // Mapa de data → todas as rotas daquele dia
  const rotasByData: Record<string, RotaDia[]> = {}
  if (rotasDia) {
    for (const rota of rotasDia) {
      if (!rotasByData[rota.data]) rotasByData[rota.data] = []
      rotasByData[rota.data]!.push(rota)
    }
  }

  const totalDiasComClientes = etapasPorDia?.filter((d) => d.total > 0).length ?? 0

  return (
    <div>
      <PageHeader
        title="Planejamento de Rotas"
        subtitle={`${totalDiasComClientes} dia(s) com clientes agendados nos próximos 7 dias`}
      />

      <div className="p-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dias.map((dia) => {
              const etapasDia = etapasPorDia?.find((d) => d.data === dia)
              const total = etapasDia?.total ?? 0
              const rotasDoDia = rotasByData[dia] ?? []
              const temRotas = rotasDoDia.length > 0

              // Summarize statuses for the day
              const statusCounts = rotasDoDia.reduce<Record<StatusRota, number>>(
                (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
                {} as Record<StatusRota, number>,
              )
              const dominantStatus: StatusRota | null =
                statusCounts.concluido > 0
                  ? 'concluido'
                  : statusCounts.em_andamento > 0
                  ? 'em_andamento'
                  : rotasDoDia.length > 0
                  ? 'planejado'
                  : null

              // Sum distances
              const totalKm = rotasDoDia.reduce(
                (sum, r) => sum + (r.distancia_total_km ?? 0),
                0,
              )
              const hasDistance = rotasDoDia.some((r) => r.distancia_total_km != null)

              return (
                <div
                  key={dia}
                  className="rounded-lg border bg-card p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow"
                >
                  {/* Cabeçalho do card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold capitalize">{formatDayLabel(dia)}</span>
                    </div>
                    {dominantStatus && (
                      <Badge variant={statusRotaVariant[dominantStatus]}>
                        {statusRotaLabel[dominantStatus]}
                      </Badge>
                    )}
                  </div>

                  {/* Contagem de clientes */}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {total > 0 ? (
                      <span className="text-foreground font-medium">{total} cliente(s)</span>
                    ) : (
                      <span className="text-muted-foreground">Nenhum cliente agendado</span>
                    )}
                  </div>

                  {/* Veículos planejados */}
                  {temRotas && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Car className="h-3 w-3" />
                      <span>{rotasDoDia.length} veículo(s) planejado(s)</span>
                    </div>
                  )}

                  {/* Distância total */}
                  {hasDistance && totalKm > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>~{totalKm.toFixed(1)} km total</span>
                    </div>
                  )}

                  {/* Ação */}
                  <Link to={`/rotas/${dia}`} className="mt-auto">
                    <Button
                      variant={total > 0 || temRotas ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      disabled={total === 0 && !temRotas}
                    >
                      {temRotas ? 'Gerenciar Rotas' : total > 0 ? 'Planejar Rota' : 'Sem Clientes'}
                      {(temRotas || total > 0) && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* Legenda */}
        {!isLoading && (
          <p className="mt-6 text-xs text-muted-foreground">
            Clientes identificados pelas etapas de serviço agendadas para cada dia.
            Acesse um dia para planejar ou gerenciar as rotas de coleta.
          </p>
        )}
      </div>
    </div>
  )
}
