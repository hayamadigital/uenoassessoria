import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  ImageIcon,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  Download,
  FileSpreadsheet,
  CircleCheck,
  CircleX,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { SortableTh } from '@/components/ui/sortable-th'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import {
  listQuestoes,
  createQuestao,
  updateQuestao,
  deleteQuestao,
  listPendingErroReportCounts,
  listErroReports,
  updateErroReport,
  listSimuladosByQuestao,
  listSimuladoUsageCounts,
} from '@ueno/firebase/queries/questoes'
import { listCategoriasMaterial } from '@ueno/firebase/queries/materiais'
import { questaoSchema, type QuestaoInput } from '@ueno/utils/validators'
import type { QuestaoWithDetails, CategoriaMaterial, TipoOpcaoQuestao } from '@ueno/firebase'
import { includesText, isWithinDateRange, nextSort, sortBy, type SortState } from '@/utils/table'

// ── Opções padrão booleano ────────────────────────────────────
const OPCOES_BOOLEANO = [
  { texto: 'Verdadeiro', is_correta: true, ordem: 0 },
  { texto: 'Falso', is_correta: false, ordem: 1 },
]

function questaoIdentifier(id: string) {
  return id.slice(0, 8).toUpperCase()
}

// ── Dialog de criação/edição de questão ──────────────────────
function QuestaoDialog({
  questao,
  onClose,
}: {
  questao?: QuestaoWithDetails
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!questao

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<QuestaoInput>({
    resolver: zodResolver(questaoSchema),
    defaultValues: isEdit
      ? {
          enunciado: questao.enunciado,
          explicacao: questao.explicacao ?? '',
          tipo_opcao: questao.tipo_opcao,
          categoria_id: '',
          opcoes: questao.opcoes.map((op) => ({
            id: op.id,
            texto: op.texto,
            is_correta: op.is_correta,
            ordem: op.ordem,
          })),
          imagens: questao.imagens.map((img) => ({
            id: img.id,
            url: img.url,
            ordem: img.ordem,
          })),
          explicacao_imagens: questao.explicacao_imagens.map((img) => ({
            id: img.id,
            url: img.url,
            ordem: img.ordem,
          })),
        }
      : {
          enunciado: '',
          explicacao: '',
          tipo_opcao: 'booleano',
          categoria_id: '',
          opcoes: OPCOES_BOOLEANO,
          imagens: [],
          explicacao_imagens: [],
        },
  })

  const {
    fields: opcoesFields,
    replace: replaceOpcoes,
    append: appendOpcao,
    remove: removeOpcao,
  } = useFieldArray({ control, name: 'opcoes' })

  const {
    fields: imagensFields,
    append: appendImagem,
    remove: removeImagem,
  } = useFieldArray({ control, name: 'imagens' })

  const {
    fields: explicacaoImagensFields,
    append: appendExplicacaoImagem,
    remove: removeExplicacaoImagem,
  } = useFieldArray({ control, name: 'explicacao_imagens' })

  const tipoOpcao = watch('tipo_opcao')
  const opcoes = watch('opcoes')
  const prevTipoRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevTipoRef.current === null) {
      prevTipoRef.current = tipoOpcao
      return
    }
    if (prevTipoRef.current !== tipoOpcao) {
      prevTipoRef.current = tipoOpcao
      if (tipoOpcao === 'booleano') {
        replaceOpcoes(OPCOES_BOOLEANO)
      } else {
        replaceOpcoes([
          { texto: '', is_correta: false, ordem: 0 },
          { texto: '', is_correta: false, ordem: 1 },
        ])
      }
    }
  }, [tipoOpcao, replaceOpcoes])

  const handleSetCorreta = (selectedIndex: number) => {
    if (tipoOpcao === 'multipla') {
      // toggle individual — allow multiple correct
      setValue(`opcoes.${selectedIndex}.is_correta`, !opcoes[selectedIndex]?.is_correta, { shouldDirty: true })
    } else {
      // radio — only one correct
      opcoesFields.forEach((_, i) => {
        setValue(`opcoes.${i}.is_correta`, i === selectedIndex, { shouldDirty: true })
      })
    }
    trigger('opcoes')
  }

  // Error reports (edit mode only)
  const { data: erroReports } = useQuery({
    queryKey: ['erro-reports', questao?.id],
    queryFn: () => listErroReports(db, { questaoId: questao!.id }),
    enabled: isEdit,
  })

  const { data: simuladosDaQuestao = [], isLoading: loadingSimuladosDaQuestao } = useQuery({
    queryKey: ['questao-simulados', questao?.id],
    queryFn: () => listSimuladosByQuestao(db, questao!.id),
    enabled: isEdit,
  })

  const updateReportMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'corrigido' | 'descartado' }) =>
      updateErroReport(db, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erro-reports', questao?.id] })
      queryClient.invalidateQueries({ queryKey: ['questoes-pending-errors'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: QuestaoInput) =>
      createQuestao(
        db,
        {
          enunciado: data.enunciado,
          explicacao: data.explicacao || null,
          tipo_opcao: data.tipo_opcao,
          categoria_id: null,
          criado_por: null,
        },
        data.opcoes,
        data.imagens,
        data.explicacao_imagens,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: QuestaoInput) =>
      updateQuestao(
        db,
        questao!.id,
        {
          enunciado: data.enunciado,
          explicacao: data.explicacao || null,
          tipo_opcao: data.tipo_opcao,
          categoria_id: null,
        },
        data.opcoes,
        data.imagens,
        data.explicacao_imagens,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] })
      queryClient.invalidateQueries({ queryKey: ['questoes-pending-errors'] })
      onClose()
    },
  })

  const onSubmit = (data: QuestaoInput) => {
    if (isEdit) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const pendingReports = erroReports?.filter((r) => r.status === 'pendente') ?? []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Questão' : 'Nova Questão'}</DialogTitle>
        </DialogHeader>

        {/* Error reports banner (edit mode) */}
        {isEdit && pendingReports.length > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              {pendingReports.length} erro(s) reportado(s) pendente(s)
            </div>
            <div className="space-y-1">
              {pendingReports.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-muted-foreground flex-1">"{r.descricao}"</span>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-green-600 hover:text-green-700"
                      onClick={() => updateReportMutation.mutate({ id: r.id, status: 'corrigido' })}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Corrigido
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-muted-foreground"
                      onClick={() => updateReportMutation.mutate({ id: r.id, status: 'descartado' })}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Descartar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEdit && (
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="text-sm font-medium">Simulados que usam esta questão</div>
            {loadingSimuladosDaQuestao ? (
              <div className="py-2">
                <Spinner />
              </div>
            ) : simuladosDaQuestao.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Esta questão ainda não está vinculada a nenhum simulado.
              </p>
            ) : (
              <div className="space-y-1">
                {simuladosDaQuestao.map((simulado) => (
                  <Link
                    key={simulado.simulado_id}
                    to={`/materiais/${simulado.simulado_id}`}
                    className="flex items-center justify-between gap-3 rounded border bg-background px-3 py-2 text-sm hover:bg-muted/30"
                  >
                    <span className="font-medium line-clamp-1">{simulado.titulo}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {simulado.ordem !== null && (
                        <span className="text-xs text-muted-foreground">#{simulado.ordem + 1}</span>
                      )}
                      <Badge variant={simulado.is_public ? 'success' : 'outline'}>
                        {simulado.is_public ? 'Público' : 'Privado'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* Enunciado */}
          <div className="space-y-2">
            <Label>
              Enunciado <span className="text-destructive">*</span>
            </Label>
            <textarea
              {...register('enunciado')}
              placeholder="Digite a pergunta..."
              className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
            {errors.enunciado && (
              <p className="text-xs text-destructive">{errors.enunciado.message}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>
                Tipo de opção <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-3 pt-2">
                {(['booleano', 'multipla'] as const).map((tipo) => (
                  <label key={tipo} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      value={tipo}
                      {...register('tipo_opcao')}
                      className="accent-primary"
                    />
                    {tipo === 'booleano' ? 'Verdadeiro/Falso' : 'Múltipla escolha'}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-2">
            <Label>
              Opções <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-2">
                {tipoOpcao === 'multipla'
                  ? '(marque todas as respostas corretas)'
                  : '(clique no círculo para marcar a correta)'}
              </span>
            </Label>
            {errors.opcoes && (
              <p className="text-xs text-destructive">
                {typeof errors.opcoes?.message === 'string'
                  ? errors.opcoes.message
                  : (errors.opcoes as any)?.root?.message}
              </p>
            )}
            <div className="space-y-2">
              {opcoesFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  {/* Indicador correta: círculo (booleano) ou quadrado (múltipla) */}
                  <button
                    type="button"
                    onClick={() => handleSetCorreta(index)}
                    className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors border-2 ${
                      tipoOpcao === 'multipla' ? 'rounded' : 'rounded-full'
                    } ${
                      opcoes[index]?.is_correta
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground hover:border-primary'
                    }`}
                    title={tipoOpcao === 'multipla' ? 'Marcar/desmarcar como correta' : 'Marcar como correta'}
                  >
                    {opcoes[index]?.is_correta && (
                      tipoOpcao === 'multipla'
                        ? <Check className="w-3 h-3 text-white" />
                        : <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>

                  {/* Texto da opção */}
                  {tipoOpcao === 'booleano' ? (
                    <span className="text-sm flex-1 px-3 py-2 rounded-md border border-input bg-muted/30">
                      {field.texto}
                    </span>
                  ) : (
                    <Input
                      {...register(`opcoes.${index}.texto`)}
                      placeholder={`Opção ${index + 1}`}
                      className="flex-1"
                    />
                  )}

                  {/* Remover (múltipla escolha, mínimo 2) */}
                  {tipoOpcao === 'multipla' && opcoesFields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOpcao(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {tipoOpcao === 'multipla' && opcoesFields.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendOpcao({ texto: '', is_correta: false, ordem: opcoesFields.length })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar opção
                </Button>
              )}
            </div>
          </div>

          {/* Imagens (URLs) */}
          <div className="space-y-2">
            <Label>
              Imagens
              <span className="text-xs text-muted-foreground ml-2">(opcional, múltiplas)</span>
            </Label>
            <div className="space-y-2">
              {imagensFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    {...register(`imagens.${index}.url`)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeImagem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendImagem({ url: '', ordem: imagensFields.length })}
              >
                <Plus className="mr-1 h-3 w-3" />
                Adicionar imagem
              </Button>
            </div>
            {errors.imagens && (
              <p className="text-xs text-destructive">{errors.imagens.message}</p>
            )}
          </div>

          {/* Explicação */}
          <div className="space-y-2">
            <Label>
              Explicação da resposta correta
              <span className="text-xs text-muted-foreground ml-2">(opcional)</span>
            </Label>
            <textarea
              {...register('explicacao')}
              placeholder="Explique por que esta resposta é correta..."
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Imagens da explicação */}
          <div className="space-y-2">
            <Label>
              Imagens da explicação
              <span className="text-xs text-muted-foreground ml-2">
                (opcional, aparecem junto da resposta correta no app)
              </span>
            </Label>
            <div className="space-y-2">
              {explicacaoImagensFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    {...register(`explicacao_imagens.${index}.url`)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeExplicacaoImagem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendExplicacaoImagem({ url: '', ordem: explicacaoImagensFields.length })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Adicionar imagem da explicação
              </Button>
            </div>
            {errors.explicacao_imagens && (
              <p className="text-xs text-destructive">
                {errors.explicacao_imagens.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {isEdit ? 'Salvar alterações' : 'Criar questão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Confirm delete ────────────────────────────────────────────
function ConfirmDeleteDialog({
  questao,
  onConfirm,
  onClose,
  isLoading,
}: {
  questao: QuestaoWithDetails
  onConfirm: () => void
  onClose: () => void
  isLoading: boolean
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir questão?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          A questão será removida de todos os simulados vinculados. Esta ação não pode ser desfeita.
        </p>
        <p className="text-sm font-medium border rounded-md p-2 bg-muted/30 line-clamp-2">
          "{questao.enunciado}"
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} isLoading={isLoading}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QuestaoFlyout({
  questao,
  pendingErrors,
  usageCount,
  onClose,
  onEdit,
}: {
  questao: QuestaoWithDetails
  pendingErrors: number
  usageCount: number
  onClose: () => void
  onEdit: () => void
}) {
  const { data: simulados = [], isLoading } = useQuery({
    queryKey: ['questao-simulados', questao.id],
    queryFn: () => listSimuladosByQuestao(db, questao.id),
  })
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLoadedImages({})
    setFailedImages({})
  }, [questao.id])

  const imageUrls = useMemo(
    () => questao.imagens.map((img) => ({ id: img.id, url: img.url.trim() })).filter((img) => img.url.length > 0),
    [questao.imagens],
  )
  const explicacaoImageUrls = useMemo(
    () =>
      questao.explicacao_imagens
        .map((img) => ({ id: img.id, url: img.url.trim() }))
        .filter((img) => img.url.length > 0),
    [questao.explicacao_imagens],
  )
  const failedCount = Object.values(failedImages).filter(Boolean).length
  const loadedCount = Object.values(loadedImages).filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        aria-label="Fechar detalhes"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs rounded bg-muted px-2 py-1 text-muted-foreground">
                {questaoIdentifier(questao.id)}
              </span>
              {pendingErrors > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {pendingErrors}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <CircleCheck className="h-3 w-3" />
                  Sem alertas
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-semibold leading-tight">Detalhes da questão</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section className="space-y-2">
            <Label>Enunciado</Label>
            <p className="rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
              {questao.enunciado}
            </p>
          </section>

          {imageUrls.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Imagens</Label>
                <Badge variant={failedCount > 0 ? 'destructive' : 'success'}>
                  {failedCount > 0
                    ? `${failedCount} com erro`
                    : loadedCount === imageUrls.length
                      ? 'Todas ok'
                      : `${loadedCount}/${imageUrls.length} carregadas`}
                </Badge>
              </div>
              <div className="space-y-3">
                {imageUrls.map((img, index) => {
                  const isLoaded = !!loadedImages[img.id]
                  const isFailed = !!failedImages[img.id]
                  return (
                    <div key={img.id} className="overflow-hidden rounded-md border bg-muted/10">
                      <img
                        src={img.url}
                        alt={`Imagem da questão ${index + 1}`}
                        className={`block w-full max-h-80 object-contain bg-background transition-opacity ${isLoaded ? 'opacity-100' : 'opacity-80'}`}
                        loading="lazy"
                        onLoad={() =>
                          setLoadedImages((prev) => ({
                            ...prev,
                            [img.id]: true,
                          }))
                        }
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [img.id]: true,
                          }))
                        }
                      />
                      {isFailed && (
                        <div className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
                          Não foi possível carregar esta imagem.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <Label>Opções</Label>
            <div className="space-y-2">
              {questao.opcoes.map((opcao, index) => (
                <div
                  key={opcao.id}
                  className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${
                    opcao.is_correta ? 'border-green-300 bg-green-50 text-green-900' : 'bg-background'
                  }`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1 leading-relaxed">{opcao.texto}</span>
                  {opcao.is_correta && (
                    <Badge variant="success" className="shrink-0">
                      Correta
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </section>

          {questao.explicacao && (
            <section className="space-y-2">
              <Label>Explicação</Label>
              <p className="rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
                {questao.explicacao}
              </p>
            </section>
          )}

          {explicacaoImageUrls.length > 0 && (
            <section className="space-y-2">
              <Label>Imagens da explicação</Label>
              <div className="space-y-3">
                {explicacaoImageUrls.map((img, index) => (
                  <div key={img.id} className="overflow-hidden rounded-md border bg-muted/10">
                    <img
                      src={img.url}
                      alt={`Imagem da explicação ${index + 1}`}
                      className="block w-full max-h-80 object-contain bg-background"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Simulados que usam esta questão</Label>
              <Badge variant="outline">{usageCount}</Badge>
            </div>
            {simulados.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Esta questão está vinculada a {simulados.length} simulado(s).
              </p>
            )}
            {isLoading ? (
              <div className="py-3">
                <Spinner />
              </div>
            ) : simulados.length === 0 ? (
              <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                Esta questão ainda não está vinculada a nenhum simulado.
              </p>
            ) : (
              <div className="space-y-2">
                {simulados.map((simulado) => (
                  <Link
                    key={simulado.simulado_id}
                    to={`/materiais/${simulado.simulado_id}`}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/30"
                  >
                    <span className="font-medium line-clamp-1">{simulado.titulo}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {simulado.ordem !== null && (
                        <span className="text-xs text-muted-foreground">#{simulado.ordem + 1}</span>
                      )}
                      <Badge variant={simulado.is_public ? 'success' : 'outline'}>
                        {simulado.is_public ? 'Público' : 'Privado'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </aside>
    </div>
  )
}

// ── Helpers: CSV ──────────────────────────────────────────────
function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

const CSV_COLUMNS = [
  'enunciado',
  'tipo_opcao',
  'resposta_correta',
  'opcao_1',
  'opcao_2',
  'opcao_3',
  'opcao_4',
  'opcao_5',
  'explicacao',
  'categoria',
  'imagem_1',
  'imagem_2',
] as const

const COLUMN_DESCRIPTIONS: Record<string, { obrigatorio: boolean; descricao: string; exemplo: string }> = {
  enunciado:       { obrigatorio: true,  descricao: 'Texto da pergunta',                                                                                              exemplo: 'O semáforo vermelho indica parada obrigatória?' },
  tipo_opcao:      { obrigatorio: true,  descricao: 'Tipo da questão: booleano ou multipla',                                                                          exemplo: 'booleano' },
  resposta_correta:{ obrigatorio: true,  descricao: 'Para booleano: Verdadeiro ou Falso. Para múltipla: texto exato de uma ou mais opções separadas por | (pipe)',     exemplo: '60 km/h|80 km/h' },
  opcao_1:         { obrigatorio: false, descricao: 'Opção 1 (obrigatório para tipo multipla)',                                                                        exemplo: '40 km/h' },
  opcao_2:         { obrigatorio: false, descricao: 'Opção 2 (obrigatório para tipo multipla)',                                                                        exemplo: '60 km/h' },
  opcao_3:         { obrigatorio: false, descricao: 'Opção 3 (opcional)',                                                                                              exemplo: '80 km/h' },
  opcao_4:         { obrigatorio: false, descricao: 'Opção 4 (opcional)',                                                                                              exemplo: '100 km/h' },
  opcao_5:         { obrigatorio: false, descricao: 'Opção 5 (opcional)',                                                                                              exemplo: '' },
  explicacao:      { obrigatorio: false, descricao: 'Explicação da(s) resposta(s) correta(s)',                                                                         exemplo: 'A cor vermelha exige parada completa do veículo.' },
  categoria:       { obrigatorio: false, descricao: 'Nome exato da categoria (deve existir no sistema)',                                                               exemplo: 'Regras de Trânsito' },
  imagem_1:        { obrigatorio: false, descricao: 'URL de imagem (opcional)',                                                                                        exemplo: 'https://exemplo.com/imagem.jpg' },
  imagem_2:        { obrigatorio: false, descricao: 'URL de segunda imagem (opcional)',                                                                                exemplo: '' },
}

function downloadTemplate() {
  const header = CSV_COLUMNS.join(',')
  const row1 = [
    '"O semáforo vermelho indica parada obrigatória?"',
    'booleano',
    'Verdadeiro',
    '', '', '', '', '',
    '"A cor vermelha exige parada completa do veículo."',
    'Regras de Trânsito',
    '', '',
  ].join(',')
  const row2 = [
    '"Em quais situações é obrigatório acionar as luzes de emergência?"',
    'multipla',
    '"Veículo parado em local indevido|Reboque de veículo"',
    'Excesso de velocidade', 'Veículo parado em local indevido', 'Reboque de veículo', 'Chuva leve', '',
    '"As luzes de emergência devem ser acionadas quando o veículo está parado irregularmente ou sendo rebocado."',
    'Regras de Trânsito',
    '', '',
  ].join(',')
  const csv = [header, row1, row2].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-questoes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

type ParsedRow = {
  linha: number
  enunciado: string
  tipo_opcao: 'booleano' | 'multipla'
  resposta_correta: string
  opcoes: string[]
  explicacao: string
  categoria_nome: string
  imagens: string[]
  errors: string[]
}

function parseQuestoesCSV(text: string): ParsedRow[] {
  const linhas = text.split(/\r?\n/).filter((l) => l.trim())
  if (linhas.length < 2) return []

  const header = parseCSVRow(linhas[0]!).map((h) => h.toLowerCase().trim())

  return linhas.slice(1).map((linha, idx) => {
    const cells = parseCSVRow(linha)
    const get = (col: string) => cells[header.indexOf(col)]?.trim() ?? ''
    const errors: string[] = []

    const enunciado = get('enunciado')
    const tipo_raw = get('tipo_opcao').toLowerCase()
    const resposta_correta = get('resposta_correta')
    const explicacao = get('explicacao')
    const categoria_nome = get('categoria')

    const tipo_opcao: 'booleano' | 'multipla' =
      tipo_raw === 'multipla' ? 'multipla' : 'booleano'

    if (!enunciado) errors.push('Enunciado obrigatório')
    else if (enunciado.length < 5) errors.push('Enunciado muito curto (mín. 5 caracteres)')

    if (!tipo_raw) errors.push('tipo_opcao obrigatório')
    else if (tipo_raw !== 'booleano' && tipo_raw !== 'multipla')
      errors.push('tipo_opcao inválido: use booleano ou multipla')

    if (!resposta_correta) errors.push('resposta_correta obrigatória')

    const opcoes = [
      get('opcao_1'), get('opcao_2'), get('opcao_3'), get('opcao_4'), get('opcao_5'),
    ].filter(Boolean)

    const imagens = [get('imagem_1'), get('imagem_2')].filter(Boolean)

    if (tipo_opcao === 'booleano') {
      const norm = resposta_correta.toLowerCase()
      if (norm !== 'verdadeiro' && norm !== 'falso')
        errors.push('Para booleano, resposta_correta deve ser Verdadeiro ou Falso')
    } else {
      if (opcoes.length < 2) errors.push('Múltipla escolha requer ao menos 2 opções (opcao_1, opcao_2)')
      else {
        const corretas = resposta_correta.split('|').map((s) => s.trim()).filter(Boolean)
        if (corretas.length === 0) errors.push('resposta_correta obrigatória')
        else {
          const invalidas = corretas.filter((r) => !opcoes.includes(r))
          if (invalidas.length > 0)
            errors.push(`resposta_correta não encontrada nas opções: "${invalidas.join('", "')}"`)
        }
      }
    }

    return { linha: idx + 2, enunciado, tipo_opcao, resposta_correta, opcoes, explicacao, categoria_nome, imagens, errors }
  })
}

// ── Dialog: Importar Planilha ─────────────────────────────────
function ImportarPlanilhaDialog({
  categorias,
  onClose,
}: {
  categorias: CategoriaMaterial[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'instrucoes' | 'importar'>('instrucoes')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; erros: number } | null>(null)

  const validRows = rows.filter((r) => r.errors.length === 0)
  const invalidRows = rows.filter((r) => r.errors.length > 0)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setRows(parseQuestoesCSV(text))
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    setImporting(true)
    let ok = 0
    let erros = 0
    for (const row of validRows) {
      try {
        const opcoes =
          row.tipo_opcao === 'booleano'
            ? [
                { texto: 'Verdadeiro', is_correta: row.resposta_correta.toLowerCase() === 'verdadeiro', ordem: 0 },
                { texto: 'Falso',      is_correta: row.resposta_correta.toLowerCase() === 'falso',      ordem: 1 },
              ]
            : (() => {
                const corretas = new Set(
                  row.resposta_correta.split('|').map((s) => s.trim()).filter(Boolean)
                )
                return row.opcoes.map((op, i) => ({
                  texto: op,
                  is_correta: corretas.has(op),
                  ordem: i,
                }))
              })()

        const imagens = row.imagens.map((url, i) => ({ url, ordem: i }))

        await createQuestao(
          db,
          {
            enunciado: row.enunciado,
            explicacao: row.explicacao || null,
            tipo_opcao: row.tipo_opcao,
            categoria_id: null,
            criado_por: null,
          },
          opcoes,
          imagens,
        )
        ok++
      } catch {
        erros++
      }
    }
    queryClient.invalidateQueries({ queryKey: ['questoes'] })
    setImportResult({ ok, erros })
    setImporting(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar questões por planilha
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {(['instrucoes', 'importar'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'instrucoes' ? 'Instruções' : 'Importar'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {tab === 'instrucoes' ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Prepare um arquivo <strong>.CSV</strong> com as colunas abaixo. Você pode usar
                    Excel ou Google Sheets e exportar como CSV.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar modelo
                </Button>
              </div>

              {/* Tabela de colunas */}
              <div className="rounded-md border overflow-hidden text-sm">
                <table className="w-full">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Coluna</th>
                      <th className="px-3 py-2 text-left font-medium">Obrigatório</th>
                      <th className="px-3 py-2 text-left font-medium">Descrição</th>
                      <th className="px-3 py-2 text-left font-medium">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {CSV_COLUMNS.map((col) => {
                      const info = COLUMN_DESCRIPTIONS[col]
                      if (!info) return null
                      return (
                        <tr key={col} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs bg-muted/20">{col}</td>
                          <td className="px-3 py-2">
                            {info.obrigatorio ? (
                              <span className="text-destructive font-medium">Sim</span>
                            ) : (
                              <span className="text-muted-foreground">Não</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{info.descricao}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground italic">
                            {info.exemplo || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Regras */}
              <div className="rounded-md bg-muted/30 border p-4 space-y-2 text-sm">
                <p className="font-medium">Regras importantes</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>A primeira linha deve conter exatamente os nomes das colunas.</li>
                  <li>Para <strong>booleano</strong>: use <code className="bg-muted px-1 rounded text-xs">Verdadeiro</code> ou <code className="bg-muted px-1 rounded text-xs">Falso</code> em <code className="bg-muted px-1 rounded text-xs">resposta_correta</code>. As colunas opcao_1..5 são ignoradas.</li>
                  <li>Para <strong>multipla</strong>: preencha ao menos <code className="bg-muted px-1 rounded text-xs">opcao_1</code> e <code className="bg-muted px-1 rounded text-xs">opcao_2</code>. Em <code className="bg-muted px-1 rounded text-xs">resposta_correta</code>, use o texto exato de uma opção — ou <strong>várias separadas por <code className="bg-muted px-1 rounded text-xs">|</code> (pipe)</strong>, ex: <code className="bg-muted px-1 rounded text-xs">60 km/h|80 km/h</code>.</li>
                  <li>O campo <code className="bg-muted px-1 rounded text-xs">categoria</code> deve conter o <strong>nome exato</strong> de uma categoria já cadastrada.</li>
                  <li>Salve o arquivo com codificação <strong>UTF-8</strong> para preservar acentuação.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload */}
              <label className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed border-input px-6 py-8 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
                <Upload className="h-8 w-8 opacity-40" />
                {fileName ? (
                  <span className="font-medium text-foreground">{fileName}</span>
                ) : (
                  <span>Clique para selecionar o arquivo CSV</span>
                )}
                <span className="text-xs">Apenas arquivos .csv</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={handleFile}
                />
              </label>

              {/* Resultado da importação */}
              {importResult && (
                <div className="rounded-md border p-3 flex items-center gap-3 text-sm">
                  <CircleCheck className="h-5 w-5 text-green-600 shrink-0" />
                  <span>
                    <strong>{importResult.ok}</strong> questão(ões) importada(s) com sucesso.
                    {importResult.erros > 0 && (
                      <span className="text-destructive ml-2">{importResult.erros} falha(s).</span>
                    )}
                  </span>
                </div>
              )}

              {/* Preview */}
              {rows.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {rows.length} linha(s) encontrada(s)
                    </span>
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1 text-green-600">
                        <CircleCheck className="h-4 w-4" />
                        {validRows.length} válida(s)
                      </span>
                      {invalidRows.length > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <CircleX className="h-4 w-4" />
                          {invalidRows.length} com erro(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border overflow-hidden text-sm max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted/40 border-b sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium w-10">#</th>
                          <th className="px-3 py-2 text-left font-medium">Enunciado</th>
                          <th className="px-3 py-2 text-left font-medium">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((row) => (
                          <tr
                            key={row.linha}
                            className={row.errors.length === 0 ? 'hover:bg-muted/20' : 'bg-destructive/5'}
                          >
                            <td className="px-3 py-2 text-muted-foreground">{row.linha}</td>
                            <td className="px-3 py-2 max-w-xs">
                              <span className="line-clamp-1">{row.enunciado || '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.tipo_opcao === 'booleano' ? 'V/F' : 'Múltipla'}
                            </td>
                            <td className="px-3 py-2">
                              {row.errors.length === 0 ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs">
                                  <CircleCheck className="h-3.5 w-3.5" />
                                  OK
                                </span>
                              ) : (
                                <span
                                  className="flex items-center gap-1 text-destructive text-xs"
                                  title={row.errors.join(' | ')}
                                >
                                  <CircleX className="h-3.5 w-3.5 shrink-0" />
                                  <span className="line-clamp-1">{row.errors[0]}{row.errors.length > 1 ? ` (+${row.errors.length - 1})` : ''}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {tab === 'instrucoes' ? (
            <Button onClick={() => setTab('importar')}>
              <Upload className="mr-2 h-4 w-4" />
              Ir para importação
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing || !!importResult}
              isLoading={importing}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar {validRows.length > 0 ? `${validRows.length} questão(ões)` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────
export function QuestoesPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoOpcaoQuestao | ''>('')
  const [alertaFiltro, setAlertaFiltro] = useState<'all' | 'pending' | 'none'>('all')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sort, setSort] = useState<SortState<'id' | 'enunciado' | 'tipo' | 'categoria' | 'simulados' | 'alerta' | 'created_at'>>({
    key: 'created_at',
    direction: 'desc',
  })
  const [showCreate, setShowCreate] = useState(false)
  const [showImportar, setShowImportar] = useState(false)
  const [selectedQuestao, setSelectedQuestao] = useState<QuestaoWithDetails | undefined>()
  const [editQuestao, setEditQuestao] = useState<QuestaoWithDetails | undefined>()
  const [deleteQuestao_, setDeleteQuestao] = useState<QuestaoWithDetails | undefined>()

  // Auto-open edit dialog via query param (?edit=id)
  const editParam = searchParams.get('edit')

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-material'],
    queryFn: () => listCategoriasMaterial(db),
  })

  const { data: questoes = [], isLoading } = useQuery({
    queryKey: ['questoes', search],
    queryFn: () =>
      listQuestoes(db, {
        ...(search && { search }),
      }),
  })

  const { data: pendingCounts = {} } = useQuery({
    queryKey: ['questoes-pending-errors'],
    queryFn: () => listPendingErroReportCounts(db),
  })

  const { data: usageCounts = {} } = useQuery({
    queryKey: ['questoes-simulado-usage-counts'],
    queryFn: () => listSimuladoUsageCounts(db),
  })

  // Auto-open via ?edit= param
  useEffect(() => {
    if (editParam && questoes.length > 0) {
      const q = questoes.find((q) => q.id === editParam)
      if (q) {
        setEditQuestao(q)
        setSearchParams({}, { replace: true })
      }
    }
  }, [editParam, questoes, setSearchParams])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestao(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] })
      queryClient.invalidateQueries({ queryKey: ['questoes-pending-errors'] })
      queryClient.invalidateQueries({ queryKey: ['questoes-simulado-usage-counts'] })
      setDeleteQuestao(undefined)
    },
  })

  const totalPendingErrors = Object.values(pendingCounts).reduce((a, b) => a + b, 0)
  const questoesFiltradas = useMemo(() => {
    const rows = questoes.filter((questao) => {
      const pendingErrors = pendingCounts[questao.id] ?? 0
      const categoria = categorias.find((c) => c.id === questao.categoria_id)
      if (categoriaFiltro && questao.categoria_id !== categoriaFiltro) return false
      if (tipoFiltro && questao.tipo_opcao !== tipoFiltro) return false
      if (alertaFiltro === 'pending' && pendingErrors === 0) return false
      if (alertaFiltro === 'none' && pendingErrors > 0) return false
      if (!includesText([questao.id, questao.enunciado, categoria?.nome, questao.tipo_opcao].join(' '), search)) return false
      return isWithinDateRange(questao.created_at, createdFrom, createdTo)
    })

    return sortBy(rows, sort, {
      id: (questao) => questao.id,
      enunciado: (questao) => questao.enunciado,
      tipo: (questao) => questao.tipo_opcao,
      categoria: (questao) => categorias.find((c) => c.id === questao.categoria_id)?.nome,
      simulados: (questao) => usageCounts[questao.id] ?? 0,
      alerta: (questao) => pendingCounts[questao.id] ?? 0,
      created_at: (questao) => questao.created_at,
    })
  }, [alertaFiltro, categorias, categoriaFiltro, createdFrom, createdTo, pendingCounts, questoes, search, sort, tipoFiltro, usageCounts])

  return (
    <div>
      <PageHeader
        title="Banco de Questões"
        subtitle={`${questoesFiltradas.length} questão(ões) exibida(s)${totalPendingErrors > 0 ? ` · ${totalPendingErrors} erro(s) pendente(s)` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/materiais">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Materiais
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowImportar(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar planilha
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Questão
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou enunciado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TipoOpcaoQuestao | '')}
          >
            <option value="">Todos os tipos</option>
            <option value="booleano">Booleano</option>
            <option value="multipla">Múltipla escolha</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={alertaFiltro}
            onChange={(e) => setAlertaFiltro(e.target.value as 'all' | 'pending' | 'none')}
          >
            <option value="all">Com e sem alerta</option>
            <option value="pending">Com alerta</option>
            <option value="none">Sem alerta</option>
          </select>
          <input
            type="date"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            title="Criado de"
          />
          <input
            type="date"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            title="Criado até"
          />
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
                  <SortableTh sort={sort} sortKey="id" onSort={(key) => setSort(nextSort(sort, key))}>ID</SortableTh>
                  <SortableTh sort={sort} sortKey="enunciado" onSort={(key) => setSort(nextSort(sort, key))}>Pergunta (Enunciado)</SortableTh>
                  <SortableTh sort={sort} sortKey="simulados" onSort={(key) => setSort(nextSort(sort, key))}>Simulados</SortableTh>
                  <SortableTh sort={sort} sortKey="alerta" onSort={(key) => setSort(nextSort(sort, key))} className="text-center">Alerta</SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y">
                {questoesFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nenhuma questão encontrada.
                    </td>
                  </tr>
                ) : null}
                {questoesFiltradas.map((q) => {
                  const pendingErrors = pendingCounts[q.id] ?? 0
                  const usageCount = usageCounts[q.id] ?? 0
                  return (
                    <tr
                      key={q.id}
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => setSelectedQuestao(q)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs rounded bg-muted px-2 py-1 text-muted-foreground">
                          {questaoIdentifier(q.id)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="line-clamp-2 leading-snug">{q.enunciado}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{usageCount}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pendingErrors > 0 ? (
                          <span
                            className="inline-flex items-center justify-center rounded-full bg-destructive/10 p-2 text-destructive"
                            title={`${pendingErrors} alerta(s) pendente(s)`}
                          >
                            <AlertCircle className="h-4 w-4" />
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center rounded-full bg-muted p-2 text-muted-foreground"
                            title="Sem alertas pendentes"
                          >
                            <CircleCheck className="h-4 w-4" />
                          </span>
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

      {/* Dialogs */}
      {showImportar && (
        <ImportarPlanilhaDialog categorias={categorias} onClose={() => setShowImportar(false)} />
      )}

      {(showCreate || editQuestao) && (
        <QuestaoDialog
          {...(editQuestao ? { questao: editQuestao } : {})}
          onClose={() => {
            setShowCreate(false)
            setEditQuestao(undefined)
          }}
        />
      )}

      {deleteQuestao_ && (
        <ConfirmDeleteDialog
          questao={deleteQuestao_}
          onConfirm={() => deleteMutation.mutate(deleteQuestao_.id)}
          onClose={() => setDeleteQuestao(undefined)}
          isLoading={deleteMutation.isPending}
        />
      )}

      {selectedQuestao && (
        <QuestaoFlyout
          questao={selectedQuestao}
          pendingErrors={pendingCounts[selectedQuestao.id] ?? 0}
          usageCount={usageCounts[selectedQuestao.id] ?? 0}
          onClose={() => setSelectedQuestao(undefined)}
          onEdit={() => {
            setEditQuestao(selectedQuestao)
            setSelectedQuestao(undefined)
          }}
        />
      )}
    </div>
  )
}
