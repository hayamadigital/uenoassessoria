import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ClipboardList,
  Users,
  Trophy,
  AlertCircle,
  Check,
  X,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Globe,
  Lock,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import {
  getMaterial,
  updateMaterial,
  getSimuladoConfig,
  upsertSimuladoConfig,
  listSimuladoQuestoes,
  setSimuladoQuestoes,
  listSimuladoResultados,
  listCategoriasMaterial,
} from '@ueno/firebase/queries/materiais'
import {
  listQuestoes,
  listErroReports,
  updateErroReport,
  createErroReport,
} from '@ueno/firebase/queries/questoes'
import {
  novoSimuladoSchema,
  questaoErroReportSchema,
  type NovoSimuladoInput,
  type QuestaoErroReportInput,
} from '@ueno/utils/validators'
import type {
  Material,
  SimuladoConfig,
  QuestaoWithDetails,
  ClienteSimuladoResultadoWithProfile,
  QuestaoErroReportWithDetails,
  CategoriaMaterial,
  Questao,
} from '@ueno/firebase'

// ── Helpers ───────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = a[i] as T
    a[i] = a[j] as T
    a[j] = temp
  }
  return a
}

// ── Tab: Configuração ─────────────────────────────────────────
function ConfiguracaoTab({
  material,
  config,
  categorias,
}: {
  material: Material
  config: SimuladoConfig | null
  categorias: CategoriaMaterial[]
}) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<NovoSimuladoInput>({
    resolver: zodResolver(novoSimuladoSchema),
    defaultValues: {
      titulo: material.titulo,
      descricao: material.descricao ?? '',
      categoria_id: material.categoria_id ?? undefined,
      is_public: material.is_public,
      total_questoes: config?.total_questoes ?? 10,
      modo_selecao: config?.modo_selecao ?? 'aleatorio',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: NovoSimuladoInput) => {
      await updateMaterial(db, material.id, {
        titulo: data.titulo,
        descricao: data.descricao || null,
        categoria_id: data.categoria_id || null,
        is_public: data.is_public,
      })
      await upsertSimuladoConfig(db, {
        material_id: material.id,
        total_questoes: data.total_questoes,
        modo_selecao: data.modo_selecao,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material', material.id] })
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      queryClient.invalidateQueries({ queryKey: ['simulado-config', material.id] })
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 max-w-lg">
      <div className="space-y-2">
        <Label>
          Título <span className="text-destructive">*</span>
        </Label>
        <Input {...register('titulo')} />
        {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <textarea
          {...register('descricao')}
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <select
          {...register('categoria_id')}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nº de questões</Label>
          <Input
            type="number"
            min={1}
            max={100}
            {...register('total_questoes', { valueAsNumber: true })}
          />
          {errors.total_questoes && (
            <p className="text-xs text-destructive">{errors.total_questoes.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Modo de seleção</Label>
          <select
            {...register('modo_selecao')}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="aleatorio">Aleatória</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('is_public')} id="cfg-public" />
        <label htmlFor="cfg-public" className="text-sm">
          Público (visível no app)
        </label>
      </div>
      <Button type="submit" isLoading={mutation.isPending} disabled={!isDirty}>
        Salvar alterações
      </Button>
    </form>
  )
}

// ── Dialog: Alterar seleção de questões ──────────────────────
function AlterarQuestoesDialog({
  material,
  config,
  onClose,
}: {
  material: Material
  config: SimuladoConfig
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [randomPreview, setRandomPreview] = useState<Questao[]>([])
  const [searchQuestao, setSearchQuestao] = useState('')
  const [initialized, setInitialized] = useState(false)

  const totalNecessario = config.total_questoes

  const { data: questoesDisponiveis = [], isLoading: loadingQuestoes } = useQuery({
    queryKey: ['questoes-selecao-alterar', material.categoria_id, searchQuestao],
    queryFn: async () => {
      const questoes = await listQuestoes(db, {
        ...(material.categoria_id && { categoriaId: material.categoria_id }),
        ...(searchQuestao && { search: searchQuestao }),
      })
      if (!initialized && config.modo_selecao === 'aleatorio') {
        const sorteadas = shuffleArray(questoes).slice(0, totalNecessario)
        setRandomPreview(sorteadas)
        setSelectedIds(sorteadas.map((q) => q.id))
        setInitialized(true)
      }
      return questoes
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: () => setSimuladoQuestoes(db, material.id, selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulado-questoes', material.id] })
      onClose()
    },
  })

  const handleResortear = () => {
    const sorteadas = shuffleArray(questoesDisponiveis).slice(0, totalNecessario)
    setRandomPreview(sorteadas)
    setSelectedIds(sorteadas.map((q) => q.id))
  }

  const toggleQuestao = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle>
            {config.modo_selecao === 'aleatorio'
              ? 'Ressortear questões'
              : 'Alterar seleção de questões'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm pb-3 border-b">
          <span className="text-muted-foreground">
            {selectedIds.length} de {totalNecessario}
          </span>
          {selectedIds.length === totalNecessario ? (
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" />
              Pronto
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-400">
              Selecione mais {totalNecessario - selectedIds.length}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-0">
          {config.modo_selecao === 'aleatorio' ? (
            <>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleResortear}>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Ressortear
                </Button>
              </div>
              {randomPreview.map((q, i) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 rounded-md border p-3 bg-muted/20"
                >
                  <span className="text-xs text-muted-foreground w-5 shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <span className="text-sm line-clamp-2 flex-1">{q.enunciado}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pelo enunciado..."
                  value={searchQuestao}
                  onChange={(e) => setSearchQuestao(e.target.value)}
                  className="pl-9"
                />
              </div>
              {loadingQuestoes ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                questoesDisponiveis.map((q) => {
                  const isSelected = selectedIds.includes(q.id)
                  const atLimit = selectedIds.length >= totalNecessario
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        if (!isSelected && atLimit) return
                        toggleQuestao(q.id)
                      }}
                      className={`w-full flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : atLimit
                          ? 'opacity-40 cursor-not-allowed bg-background'
                          : 'hover:bg-muted/30 bg-background'
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="text-sm line-clamp-2 flex-1">{q.enunciado}</span>
                    </button>
                  )
                })
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => finalizeMutation.mutate()}
            disabled={
              config.modo_selecao === 'aleatorio'
                ? randomPreview.length === 0
                : selectedIds.length !== totalNecessario
            }
            isLoading={finalizeMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Tab: Questões do Simulado ─────────────────────────────────
function QuestoesTab({
  material,
  config,
}: {
  material: Material
  config: SimuladoConfig | null
}) {
  const [showAlterar, setShowAlterar] = useState(false)

  const { data: questoes = [], isLoading } = useQuery({
    queryKey: ['simulado-questoes', material.id],
    queryFn: () => listSimuladoQuestoes(db, material.id),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {questoes.length} questão(ões) neste simulado
          {config && ` · total configurado: ${config.total_questoes}`}
        </p>
        {config && (
          <Button variant="outline" size="sm" onClick={() => setShowAlterar(true)}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Alterar seleção
          </Button>
        )}
      </div>

      {questoes.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhuma questão vinculada a este simulado.
        </div>
      ) : (
        <div className="space-y-2">
          {questoes.map((q, i) => (
            <div key={q.id} className="rounded-md border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-6 shrink-0 mt-0.5 font-mono">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">{q.enunciado}</p>

                  {/* Imagens */}
                  {q.imagens.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.imagens.map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt=""
                          className="h-24 rounded-md border object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Opções */}
                  <div className="space-y-1">
                    {q.opcoes.map((op) => (
                      <div
                        key={op.id}
                        className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md ${
                          op.is_correta
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {op.is_correta && <Check className="h-3 w-3 text-green-600 shrink-0" />}
                        <span>{op.texto}</span>
                      </div>
                    ))}
                  </div>

                  {/* Explicação */}
                  {q.explicacao && (
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                      <span className="font-medium">Explicação:</span> {q.explicacao}
                    </div>
                  )}
                </div>

                <Link to={`/materiais/questoes?edit=${q.id}`}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Editar questão">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAlterar && config && (
        <AlterarQuestoesDialog
          material={material}
          config={config}
          onClose={() => setShowAlterar(false)}
        />
      )}
    </div>
  )
}

// ── Dialog: Reportar erro ─────────────────────────────────────
function ReportarErroDialog({
  questaoId,
  onClose,
}: {
  questaoId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuestaoErroReportInput>({
    resolver: zodResolver(questaoErroReportSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: QuestaoErroReportInput) =>
      createErroReport(db, {
        questao_id: questaoId,
        reportado_por: null,
        descricao: data.descricao,
        status: 'pendente',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulado-erro-reports'] })
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reportar erro na questão</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Descrição do erro <span className="text-destructive">*</span>
            </Label>
            <textarea
              {...register('descricao')}
              placeholder="Descreva o que está incorreto..."
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Enviar report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Tab: Resultados ───────────────────────────────────────────
function ResultadosTab({ material }: { material: Material }) {
  const queryClient = useQueryClient()
  const [reportTarget, setReportTarget] = useState<string | null>(null)

  const { data: resultados = [], isLoading: loadingResultados } = useQuery({
    queryKey: ['simulado-resultados', material.id],
    queryFn: () => listSimuladoResultados(db, material.id),
  })

  const { data: erroReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['simulado-erro-reports', material.id],
    queryFn: () => listErroReports(db),
  })

  // Filtra reports das questões deste simulado
  const { data: questoesSimulado = [] } = useQuery({
    queryKey: ['simulado-questoes', material.id],
    queryFn: () => listSimuladoQuestoes(db, material.id),
  })

  const questaoIdsSimulado = new Set(questoesSimulado.map((q) => q.id))
  const reportsDoSimulado = erroReports.filter((r) => questaoIdsSimulado.has(r.questao_id))
  const pendingReports = reportsDoSimulado.filter((r) => r.status === 'pendente')

  const updateReportMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: 'corrigido' | 'descartado'
    }) => updateErroReport(db, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulado-erro-reports', material.id] })
    },
  })

  const totalTentativas = resultados.length
  const avgScore =
    totalTentativas > 0
      ? Math.round(
          (resultados.reduce((acc, r) => acc + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) /
            totalTentativas) *
            10,
        ) / 10
      : 0

  if (loadingResultados || loadingReports) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Tentativas
          </div>
          <p className="text-2xl font-bold">{totalTentativas}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            Média de acertos
          </div>
          <p className="text-2xl font-bold">{avgScore}%</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Erros pendentes
          </div>
          <p className={`text-2xl font-bold ${pendingReports.length > 0 ? 'text-destructive' : ''}`}>
            {pendingReports.length}
          </p>
        </div>
      </div>

      {/* Tabela de resultados */}
      {resultados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Resultados por cliente</h3>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Acertos</th>
                  <th className="px-4 py-3 text-left font-medium">%</th>
                  <th className="px-4 py-3 text-left font-medium">Tentativa</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {resultados.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      {(r as ClienteSimuladoResultadoWithProfile).cliente?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.score} / {r.total}
                    </td>
                    <td className="px-4 py-3">
                      {r.total > 0 ? Math.round((r.score / r.total) * 100) : 0}%
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">#{r.tentativa}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Erros reportados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">
            Erros reportados
            {pendingReports.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingReports.length} pendente(s)
              </Badge>
            )}
          </h3>
          {questoesSimulado.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportTarget(questoesSimulado[0]?.id ?? null)}
            >
              <AlertCircle className="mr-2 h-3 w-3" />
              Reportar erro
            </Button>
          )}
        </div>

        {reportsDoSimulado.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            Nenhum erro reportado neste simulado.
          </div>
        ) : (
          <div className="space-y-2">
            {reportsDoSimulado.map((r) => (
              <div key={r.id} className="rounded-md border p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      Questão: "{(r as QuestaoErroReportWithDetails).questao?.enunciado}"
                    </p>
                    <p className="text-sm">{r.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        r.status === 'pendente'
                          ? 'destructive'
                          : r.status === 'corrigido'
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {r.status === 'pendente'
                        ? 'Pendente'
                        : r.status === 'corrigido'
                        ? 'Corrigido'
                        : 'Descartado'}
                    </Badge>
                    {r.status === 'pendente' && (
                      <>
                        <Link to={`/materiais/questoes?edit=${r.questao_id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            <Pencil className="mr-1 h-3 w-3" />
                            Corrigir questão
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() =>
                            updateReportMutation.mutate({ id: r.id, status: 'corrigido' })
                          }
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Corrigido
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() =>
                            updateReportMutation.mutate({ id: r.id, status: 'descartado' })
                          }
                        >
                          <X className="mr-1 h-3 w-3" />
                          Descartar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reportTarget && (
        <ReportarErroDialog questaoId={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
type TabKey = 'configuracao' | 'questoes' | 'resultados'

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('configuracao')

  const { data: material, isLoading: loadingMaterial } = useQuery({
    queryKey: ['material', id],
    queryFn: () => getMaterial(db, id!),
    enabled: !!id,
  })

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['simulado-config', id],
    queryFn: () => getSimuladoConfig(db, id!),
    enabled: !!id,
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-material'],
    queryFn: () => listCategoriasMaterial(db),
  })

  if (loadingMaterial || loadingConfig) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    )
  }

  if (!material) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Material não encontrado.{' '}
        <button onClick={() => navigate('/materiais')} className="text-primary hover:underline">
          Voltar
        </button>
      </div>
    )
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'configuracao', label: 'Configuração' },
    { key: 'questoes', label: 'Questões' },
    { key: 'resultados', label: 'Resultados' },
  ]

  return (
    <div>
      <PageHeader
        title={material.titulo}
        subtitle={
          <div className="flex items-center gap-2">
            <Badge>Simulado</Badge>
            {material.is_public ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Globe className="h-3 w-3" />
                Público
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Privado
              </span>
            )}
          </div>
        }
        actions={
          <Link to="/materiais">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Materiais
            </Button>
          </Link>
        }
      />

      <div className="p-8">
        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'configuracao' && (
          <ConfiguracaoTab material={material} config={config ?? null} categorias={categorias} />
        )}
        {tab === 'questoes' && (
          <QuestoesTab material={material} config={config ?? null} />
        )}
        {tab === 'resultados' && <ResultadosTab material={material} />}
      </div>
    </div>
  )
}
