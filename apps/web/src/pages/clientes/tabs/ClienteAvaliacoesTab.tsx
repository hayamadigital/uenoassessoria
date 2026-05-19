import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import { listAvaliacoesByCliente, createAvaliacao } from '@ueno/firebase/queries/avaliacoes'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteWithProfile, AvaliacaoTipo, AvaliacaoComDetalhes } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

const tipoLabel: Record<AvaliacaoTipo, string> = {
  servico: 'Serviço',
  material: 'Material',
  simulado: 'Simulado',
}

const tipoVariant: Record<
  AvaliacaoTipo,
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'
> = {
  servico: 'default',
  material: 'success',
  simulado: 'warning',
}

function getNomeObjeto(av: AvaliacaoComDetalhes): string | null {
  if (av.tipo === 'servico') return av.servico_nome
  return av.material_titulo
}

function StarRating({ nota, onChange }: { nota: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`h-5 w-5 ${n <= nota ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function ClienteAvaliacoesTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [tipo, setTipo] = useState<AvaliacaoTipo>('servico')
  const [nota, setNota] = useState(5)
  const [comentario, setComentario] = useState('')

  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'avaliacoes'],
    queryFn: () => listAvaliacoesByCliente(db, cliente.id),
  })

  const addMutation = useMutation({
    mutationFn: () =>
      createAvaliacao(db, {
        cliente_id: cliente.id,
        agendamento_id: null,
        instrutor_id: null,
        tipo,
        material_id: null,
        nota,
        comentario: comentario || null,
        is_public: false,
        respondido_em: null,
        resposta_admin: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'avaliacoes'] })
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] })
      handleClose()
    },
  })

  function handleClose() {
    setAddOpen(false)
    setTipo('servico')
    setNota(5)
    setComentario('')
  }

  const media =
    (avaliacoes?.length ?? 0) > 0
      ? (avaliacoes!.reduce((s, a) => s + a.nota, 0) / avaliacoes!.length).toFixed(1)
      : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {avaliacoes?.length ?? 0} avaliação(ões)
          </h2>
          {media && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{media}</span>
            </div>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={(o: boolean) => { if (!o) handleClose(); else setAddOpen(true) }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Avaliação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as AvaliacaoTipo)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="servico">Serviço</option>
                  <option value="material">Material de estudo</option>
                  <option value="simulado">Simulado</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nota <span className="text-destructive">*</span></Label>
                <StarRating nota={nota} onChange={setNota} />
              </div>
              <div className="space-y-2">
                <Label>Comentário</Label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Opcional..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button isLoading={addMutation.isPending} onClick={() => addMutation.mutate()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : avaliacoes?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhuma avaliação registrada.
        </div>
      ) : (
        <div className="space-y-3">
          {avaliacoes?.map((av) => {
            const objeto = getNomeObjeto(av)
            return (
              <div key={av.id} className="rounded-md border px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarRating nota={av.nota} />
                    <Badge variant={tipoVariant[av.tipo]} className="text-xs">
                      {tipoLabel[av.tipo]}
                    </Badge>
                    {objeto && (
                      <span className="text-xs text-muted-foreground">{objeto}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDateJST(av.created_at)}
                  </span>
                </div>
                {av.comentario && (
                  <p className="text-sm text-muted-foreground">{av.comentario}</p>
                )}
                {av.resposta_admin && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-sm border-l-2 border-primary">
                    <p className="text-xs font-medium mb-1">Resposta da assessoria</p>
                    <p className="text-muted-foreground">{av.resposta_admin}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
