import { Clock, Route } from 'lucide-react'
import type { ParadaLocal } from './ParadaRow'

interface ResumoPlanejamentoCardProps {
  paradas: ParadaLocal[]
  totalKm: number | null
  totalMin: number | null
  pontoPartidaNome: string
  pontoDestinoNome: string
}

function formatMin(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function ResumoPlanejamentoCard({
  paradas,
  totalKm,
  totalMin,
  pontoPartidaNome,
  pontoDestinoNome,
}: ResumoPlanejamentoCardProps) {
  if (paradas.length === 0) return null

  const paradasComTrecho = paradas.filter((p) => p.distanciaKm != null)

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <Route className="h-4 w-4 text-muted-foreground" />
        Resumo da Rota
      </h3>

      {/* Totais */}
      {totalKm != null && totalMin != null && (
        <div className="flex gap-6 mb-5 p-3 rounded-md bg-muted/50">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Distância total</p>
            <p className="font-bold text-lg">{totalKm} km</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Tempo estimado</p>
            <p className="font-bold text-lg flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {formatMin(totalMin)}
            </p>
          </div>
        </div>
      )}

      {/* Tabela de trechos */}
      {paradasComTrecho.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-x-4 px-1 pb-1 border-b">
            <span>Trecho</span>
            <span className="text-right">Km</span>
            <span className="text-right">Tempo</span>
          </div>

          {/* Linha origem */}
          <div className="text-xs grid grid-cols-[1fr_auto_auto] gap-x-4 px-1">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{pontoPartidaNome}</span> → parada 1
            </span>
            <span className="text-right text-muted-foreground">—</span>
            <span className="text-right text-muted-foreground">—</span>
          </div>

          {paradas.map((p, i) => {
            if (p.distanciaKm == null) return null
            const destino =
              i < paradas.length - 1
                ? paradas[i + 1].clienteNome
                : pontoDestinoNome
            return (
              <div key={p.id} className="text-xs grid grid-cols-[1fr_auto_auto] gap-x-4 px-1">
                <span>
                  <span className="font-medium">{p.clienteNome}</span>
                  <span className="text-muted-foreground"> → {destino}</span>
                </span>
                <span className="text-right tabular-nums">{p.distanciaKm} km</span>
                <span className="text-right tabular-nums">{formatMin(p.duracaoMin ?? 0)}</span>
              </div>
            )
          })}
        </div>
      )}

      {paradasComTrecho.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Clique em "Otimizar Rota" para calcular distâncias e tempos.
        </p>
      )}
    </div>
  )
}
