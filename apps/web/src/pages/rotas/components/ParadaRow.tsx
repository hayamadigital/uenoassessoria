import { GripVertical, MapPin, Pencil, Train, Home, MapPinOff } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import type { TipoPonto } from '@ueno/firebase'

export interface ParadaLocal {
  id: string
  ordem: number
  clienteNome: string
  etapaNome: string
  servicoNome: string
  endereco: string
  enderecoOriginal: string | null
  tipo: TipoPonto
  pontoNome: string
  distanciaKm: number | null
  duracaoMin: number | null
  processo_etapa_id: string | null
  cliente_id: string | null
}

interface ParadaRowProps {
  parada: ParadaLocal
  onEdit: (paradaId: string) => void
}

const tipoIcon: Record<TipoPonto, React.ReactNode> = {
  residencia: <Home className="h-3.5 w-3.5" />,
  estacao_trem: <Train className="h-3.5 w-3.5" />,
  outro: <MapPin className="h-3.5 w-3.5" />,
}

const tipoLabel: Record<TipoPonto, string> = {
  residencia: 'Residência',
  estacao_trem: 'Estação de Trem',
  outro: 'Outro',
}

export function ParadaRow({ parada, onEdit }: ParadaRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: parada.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
    >
      {/* Drag handle */}
      <button
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Número */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {parada.ordem}
      </div>

      {/* Dados */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{parada.clienteNome}</span>
          <span className="text-xs text-muted-foreground">· {parada.etapaNome}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          {tipoIcon[parada.tipo]}
          <span className="font-medium text-foreground">{parada.pontoNome}</span>
          <span className="text-muted-foreground">({tipoLabel[parada.tipo]})</span>
        </div>
        {parada.endereco ? (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{parada.endereco}</p>
        ) : (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-destructive">
            <MapPinOff className="h-3 w-3" />
            <span>Sem endereço cadastrado</span>
          </div>
        )}

        {/* Trecho para próxima parada */}
        {parada.distanciaKm != null && (
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-0 h-5">
              ↓ {parada.distanciaKm} km · {parada.duracaoMin} min
            </Badge>
          </div>
        )}
      </div>

      {/* Botão editar endereço */}
      <button
        type="button"
        onClick={() => onEdit(parada.id)}
        className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
        title="Alterar ponto de coleta"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
