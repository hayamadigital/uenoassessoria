import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, User, MessageSquare, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import {
  listAvaliacoes,
  getEstatisticasAvaliacoes,
  responderAvaliacao,
} from '@ueno/firebase/queries/avaliacoes'
import { formatDateJST } from '@ueno/utils/date'
import type { AvaliacaoComDetalhes, AvaliacaoTipo } from '@ueno/firebase'

// ─── helpers ────────────────────────────────────────────────────────────────

function StarRow({ nota, small }: { nota: number; small?: boolean }) {
  const cls = small ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${n <= nota ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'}`}
        />
      ))}
    </div>
  )
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

function getNomeObjeto(av: AvaliacaoComDetalhes): string {
  if (av.tipo === 'servico') return av.agendamentos?.servicos?.nome ?? 'Agendamento'
  return av.materiais?.titulo ?? (av.tipo === 'simulado' ? 'Simulado' : 'Material')
}

function truncate(text: string, max = 70): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ─── component ──────────────────────────────────────────────────────────────

export function AvaliacoesPage() {
  const queryClient = useQueryClient()

  // filters
  const [tipoFiltro, setTipoFiltro] = useState<AvaliacaoTipo | ''>('')
  const [statusFiltro, setStatusFiltro] = useState<'respondido' | 'pendente' | ''>('')
  const [notaFiltro, setNotaFiltro] = useState<number | ''>('')
  const [busca, setBusca] = useState('')

  // dialog responder
  const [responderTarget, setResponderTarget] = useState<AvaliacaoComDetalhes | null>(null)
  const [respostaText, setRespostaText] = useState('')

  // queries
  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: [
      'avaliacoes',
      'list',
      tipoFiltro,
      statusFiltro,
      notaFiltro,
    ],
    queryFn: () =>
      listAvaliacoes(db, {
        ...(tipoFiltro && { tipo: tipoFiltro }),
        ...(statusFiltro === 'respondido' && { respondido: true }),
        ...(statusFiltro === 'pendente' && { respondido: false }),
        ...(notaFiltro && { nota: notaFiltro }),
      }),
  })

  const { data: stats } = useQuery({
    queryKey: ['avaliacoes', 'stats'],
    queryFn: () => getEstatisticasAvaliacoes(db),
  })

  // client-side text search on top of server filters
  const filtered = useMemo(() => {
    if (!busca.trim()) return avaliacoes ?? []
    const term = busca.toLowerCase()
    return (avaliacoes ?? []).filter((av) =>
      av.clientes?.profiles?.full_name?.toLowerCase().includes(term),
    )
  }, [avaliacoes, busca])

  const hasFilters = !!(tipoFiltro || statusFiltro || notaFiltro || busca)

  // mutations
  const responderMutation = useMutation({
    mutationFn: () => responderAvaliacao(db, responderTarget!.id, respostaText.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] })
      setResponderTarget(null)
      setRespostaText('')
    },
  })

  function openResponder(av: AvaliacaoComDetalhes) {
    setResponderTarget(av)
    setRespostaText(av.resposta_admin ?? '')
  }

  function clearFilters() {
    setTipoFiltro('')
    setStatusFiltro('')
    setNotaFiltro('')
    setBusca('')
  }

  return (
    <div>
      <PageHeader
        title="Avaliações"
        subtitle="Avaliações enviadas pelos clientes via app"
      />

      <div className="space-y-6 p-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-bold">{stats?.total ?? '—'}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Média geral</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="text-2xl font-bold">{stats?.media ?? '—'}</span>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Pendentes resposta</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats?.pendentes ?? '—'}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Por tipo</p>
            <div className="mt-1 space-y-0.5">
              {(['servico', 'material', 'simulado'] as AvaliacaoTipo[]).map((t) => (
                <div key={t} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{tipoLabel[t]}</span>
                  <span className="font-medium">
                    {stats?.por_tipo[t].total ?? 0}
                    {stats && stats.por_tipo[t].media > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        ★{stats.por_tipo[t].media}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as AvaliacaoTipo | '')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="servico">Serviço</option>
            <option value="material">Material</option>
            <option value="simulado">Simulado</option>
          </select>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'respondido' | 'pendente' | '')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="respondido">Respondida</option>
          </select>

          <select
            value={notaFiltro}
            onChange={(e) => setNotaFiltro(e.target.value ? Number(e.target.value) : '')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Qualquer nota</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)} ({n})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
            Nenhuma avaliação encontrada.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Objeto avaliado</th>
                  <th className="px-4 py-3 text-left font-medium">Nota</th>
                  <th className="px-4 py-3 text-left font-medium">Comentário</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((av) => {
                  const nome = av.clientes?.profiles?.full_name ?? '—'
                  const avatar = av.clientes?.profiles?.avatar_url
                  const clienteId = av.clientes?.id
                  const isPendente = !av.respondido_em

                  return (
                    <tr key={av.id} className="hover:bg-muted/20">
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          {clienteId ? (
                            <Link
                              to={`/clientes/${clienteId}`}
                              className="font-medium hover:underline"
                            >
                              {nome}
                            </Link>
                          ) : (
                            <span className="font-medium">{nome}</span>
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <Badge variant={tipoVariant[av.tipo]}>{tipoLabel[av.tipo]}</Badge>
                      </td>

                      {/* Objeto */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {getNomeObjeto(av)}
                      </td>

                      {/* Nota */}
                      <td className="px-4 py-3">
                        <StarRow nota={av.nota} small />
                      </td>

                      {/* Comentário */}
                      <td className="px-4 py-3 max-w-[220px]">
                        {av.comentario ? (
                          <span
                            className="text-muted-foreground"
                            title={av.comentario}
                          >
                            {truncate(av.comentario)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateJST(av.created_at)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isPendente ? (
                          <Badge variant="warning">Pendente</Badge>
                        ) : (
                          <Badge variant="success">Respondida</Badge>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResponder(av)}
                        >
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          {isPendente ? 'Responder' : 'Ver resposta'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog — Responder avaliação */}
      <Dialog
        open={!!responderTarget}
        onOpenChange={(o) => {
          if (!o) {
            setResponderTarget(null)
            setRespostaText('')
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {responderTarget && !responderTarget.respondido_em ? 'Responder avaliação' : 'Resposta da assessoria'}
            </DialogTitle>
          </DialogHeader>

          {responderTarget && (
            <div className="space-y-4 py-1">
              {/* Avaliação */}
              <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {responderTarget.clientes?.profiles?.full_name ?? '—'}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateJST(responderTarget.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tipoVariant[responderTarget.tipo]}>
                    {tipoLabel[responderTarget.tipo]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getNomeObjeto(responderTarget)}
                  </span>
                </div>
                <StarRow nota={responderTarget.nota} />
                {responderTarget.comentario && (
                  <p className="text-sm text-muted-foreground">{responderTarget.comentario}</p>
                )}
              </div>

              {/* Textarea resposta */}
              <div className="space-y-2">
                <Label>Resposta da assessoria</Label>
                <textarea
                  value={respostaText}
                  onChange={(e) => setRespostaText(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Escreva uma resposta para o cliente..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResponderTarget(null)
                setRespostaText('')
              }}
            >
              Cancelar
            </Button>
            <Button
              isLoading={responderMutation.isPending}
              disabled={!respostaText.trim()}
              onClick={() => responderMutation.mutate()}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {responderTarget?.respondido_em ? 'Atualizar resposta' : 'Enviar resposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
