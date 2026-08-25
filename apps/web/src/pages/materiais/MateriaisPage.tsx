import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  FileText,
  Video,
  Link2,
  AlignLeft,
  ClipboardList,
  BookOpen,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Search,
  RefreshCw,
  Check,
  EyeOff,
  Eye,
  Image,
  Images,
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
import { db, storage } from '@/lib/firebase'
import { uploadFile, materialPath } from '@ueno/firebase/storage'
import {
  listCategoriasMaterial,
  createCategoriaMaterial,
  updateCategoriaMaterial,
  deleteCategoriaMaterial,
  listMateriais,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  upsertSimuladoConfig,
  setSimuladoQuestoes,
} from '@ueno/firebase/queries/materiais'
import { listQuestoes } from '@ueno/firebase/queries/questoes'
import {
  materialSchema,
  editMaterialSchema,
  categoriaMaterialSchema,
  novoSimuladoSchema,
  type MaterialInput,
  type EditMaterialInput,
  type CategoriaMaterialInput,
  type NovoSimuladoInput,
} from '@ueno/utils/validators'
import type { Material, CategoriaMaterial, TipoMaterial, Questao } from '@ueno/firebase'
import { includesText, isWithinDateRange, matchesActiveFilter, nextSort, sortBy, type ActiveFilter, type SortState } from '@/utils/table'

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

function normalizeQuestionText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"“”‘’()[\]{}]/g, '')
    .trim()
}

function uniqueQuestoesForRandom(questoes: Questao[]): Questao[] {
  const seen = new Set<string>()
  return questoes.filter((questao) => {
    const key = `${questao.tipo_opcao}:${normalizeQuestionText(questao.enunciado) || questao.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const TIPO_LABELS: Record<TipoMaterial, string> = {
  pdf: 'PDF',
  video: 'Vídeo',
  link: 'Link',
  texto: 'Texto',
  simulado: 'Simulado',
  card: 'Cards',
}

const TIPO_ICONS: Record<TipoMaterial, React.ElementType> = {
  pdf: FileText,
  video: Video,
  link: Link2,
  texto: AlignLeft,
  simulado: ClipboardList,
  card: Image,
}

const TIPO_BADGE_VARIANTS: Record<TipoMaterial, string> = {
  pdf: 'destructive',
  video: 'secondary',
  link: 'outline',
  texto: 'outline',
  simulado: 'default',
  card: 'secondary',
}

const EMPTY_QUESTOES: Questao[] = []

// ── Dialog: Nova / Editar Categoria ──────────────────────────
function CategoriaDialog({
  categoria,
  onClose,
  onDeleted,
}: {
  categoria?: CategoriaMaterial
  onClose: () => void
  onDeleted?: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!categoria

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoriaMaterialInput>({
    resolver: zodResolver(categoriaMaterialSchema),
    defaultValues: isEdit
      ? { nome: categoria.nome, descricao: categoria.descricao ?? '', ordem: categoria.ordem }
      : { nome: '', descricao: '', ordem: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: CategoriaMaterialInput) => {
      const payload = { nome: data.nome, descricao: data.descricao || null, ordem: data.ordem }
      return isEdit
        ? updateCategoriaMaterial(db, categoria.id, payload)
        : createCategoriaMaterial(db, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategoriaMaterial(db, categoria!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      onDeleted?.(categoria!.id)
      onClose()
    },
  })

  const handleDelete = () => {
    if (!categoria) return
    const confirmed = window.confirm(`Excluir a categoria "${categoria.nome}"?`)
    if (confirmed) deleteMutation.mutate()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input {...register('nome')} placeholder="Ex: Legislação de Trânsito" />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input {...register('descricao')} placeholder="Descrição opcional" />
          </div>
          <div className="space-y-2">
            <Label>Ordem</Label>
            <Input type="number" {...register('ordem', { valueAsNumber: true })} />
          </div>
          <DialogFooter>
            {isEdit && (
              <Button
                variant="destructive"
                type="button"
                onClick={handleDelete}
                isLoading={deleteMutation.isPending}
                className="mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            )}
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {isEdit ? 'Salvar' : 'Criar categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog: Novo Material (pdf/video/link/texto) ──────────────
function NovoMaterialDialog({
  categorias,
  defaultCategoriaId,
  onClose,
}: {
  categorias: CategoriaMaterial[]
  defaultCategoriaId?: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [bannerArquivo, setBannerArquivo] = useState<File | null>(null)
  const [albumArquivos, setAlbumArquivos] = useState<File[]>([])
  const [videoInputMode, setVideoInputMode] = useState<'url' | 'arquivo'>('url')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaterialInput>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      tipo: 'pdf',
      url: '',
      conteudo_texto: '',
      is_public: false,
      ordem: 0,
      categoria_id: defaultCategoriaId ?? '',
    },
  })

  const tipo = watch('tipo')

  const mutation = useMutation({
    mutationFn: async (data: MaterialInput) => {
      let url = data.url || null
      let bannerUrl: string | null = null
      let albumUrls: string[] = []

      // Upload file if provided
      if (arquivo) {
        const folder = data.tipo === 'pdf' || data.tipo === 'video' ? data.tipo : 'public'
        const path = materialPath(folder, arquivo.name)
        url = await uploadFile(storage, path, arquivo)
      }

      if (data.tipo === 'texto') {
        if (bannerArquivo) {
          const path = materialPath('texto/banner', bannerArquivo.name)
          bannerUrl = await uploadFile(storage, path, bannerArquivo)
        }
        if (albumArquivos.length > 0) {
          albumUrls = await Promise.all(
            albumArquivos.map((file) => uploadFile(storage, materialPath('texto/album', file.name), file)),
          )
        }
      }

      return createMaterial(db, {
        titulo: data.titulo,
        descricao: data.descricao || null,
        tipo: data.tipo,
        url: data.tipo === 'card' ? null : url,
        conteudo_texto: data.tipo === 'texto' ? data.conteudo_texto || null : null,
        banner_url: bannerUrl,
        album_urls: albumUrls,
        categoria_id: data.categoria_id || null,
        is_public: data.is_public,
        is_active: true,
        ordem: data.ordem,
        thumbnail_url: null,
        duracao_min: null,
        tamanho_bytes: arquivo ? arquivo.size : null,
        publicado_por: null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      onClose()
    },
    onError: (err: Error) => setUploadError(err.message),
  })

  const useFileInput = tipo === 'pdf' || (tipo === 'video' && videoInputMode === 'arquivo')

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Tipo <span className="text-destructive">*</span>
            </Label>
            <select
              {...register('tipo')}
              onChange={(e) => {
                register('tipo').onChange(e)
                setArquivo(null)
                setBannerArquivo(null)
                setAlbumArquivos([])
                setValue('url', '')
                setValue('conteudo_texto', '')
                setUploadError(null)
                setVideoInputMode('url')
              }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="pdf">PDF</option>
              <option value="video">Vídeo</option>
              <option value="link">Link</option>
              <option value="texto">Texto</option>
              <option value="card">Cards</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>
              Título <span className="text-destructive">*</span>
            </Label>
            <Input {...register('titulo')} placeholder="Título do material" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <textarea
              {...register('descricao')}
              placeholder="Descrição opcional..."
              className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* ── Campos condicionais por tipo ── */}
          {tipo === 'link' && (
            <div className="space-y-2">
              <Label>
                URL <span className="text-destructive">*</span>
              </Label>
              <Input {...register('url')} placeholder="https://..." />
              {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
            </div>
          )}

          {tipo === 'pdf' && (
            <div className="space-y-2">
              <Label>
                Arquivo PDF <span className="text-destructive">*</span>
              </Label>
              <label className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-input px-4 py-5 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
                <FileText className="h-8 w-8 opacity-40" />
                {arquivo ? (
                  <span className="font-medium text-foreground">{arquivo.name}</span>
                ) : (
                  <span>Clique para selecionar um PDF</span>
                )}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {tipo === 'video' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Vídeo</Label>
                <div className="flex rounded-md overflow-hidden border text-xs">
                  <button
                    type="button"
                    onClick={() => { setVideoInputMode('url'); setArquivo(null) }}
                    className={`px-3 py-1 transition-colors ${videoInputMode === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVideoInputMode('arquivo'); setValue('url', '') }}
                    className={`px-3 py-1 transition-colors ${videoInputMode === 'arquivo' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    Arquivo
                  </button>
                </div>
              </div>
              {videoInputMode === 'url' ? (
                <>
                  <Input {...register('url')} placeholder="https://..." />
                  {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
                </>
              ) : (
                <label className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-input px-4 py-5 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
                  <Video className="h-8 w-8 opacity-40" />
                  {arquivo ? (
                    <span className="font-medium text-foreground">{arquivo.name}</span>
                  ) : (
                    <span>Clique para selecionar um vídeo</span>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          )}

          {tipo === 'texto' && (
            <div className="space-y-4 rounded-md border bg-muted/20 p-3">
              <div className="space-y-2">
                <Label>Conteúdo do texto</Label>
                <textarea
                  {...register('conteudo_texto')}
                  placeholder="Digite o conteúdo que será exibido no app..."
                  className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Banner</Label>
                <label className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-input px-4 py-5 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-background transition-colors">
                  <Image className="h-8 w-8 opacity-40" />
                  {bannerArquivo ? (
                    <span className="font-medium text-foreground">{bannerArquivo.name}</span>
                  ) : (
                    <span>Clique para selecionar uma imagem de banner</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setBannerArquivo(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <Label>Álbum / carrossel</Label>
                <label className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-input px-4 py-5 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-background transition-colors">
                  <Images className="h-8 w-8 opacity-40" />
                  {albumArquivos.length > 0 ? (
                    <span className="font-medium text-foreground">
                      {albumArquivos.length} imagem(ns) selecionada(s)
                    </span>
                  ) : (
                    <span>Clique para selecionar imagens do álbum</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => setAlbumArquivos(Array.from(e.target.files ?? []))}
                  />
                </label>
              </div>
            </div>
          )}

          {tipo === 'card' && (
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              Este material será um conjunto de flashcards. Depois de criar, abra “Gerenciar” para adicionar imagens, legendas e campos de memorização de cada card.
            </div>
          )}

          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

          {!defaultCategoriaId && (
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
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('is_public')} id="mat-public" />
            <label htmlFor="mat-public" className="text-sm">
              Público (visível no app)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={mutation.isPending}
              disabled={useFileInput && !arquivo}
            >
              Criar material
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog: Editar Material ───────────────────────────────────
function EditarMaterialDialog({
  material,
  categorias,
  onClose,
}: {
  material: Material
  categorias: CategoriaMaterial[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [titulo, setTitulo] = useState(material.titulo)
  const [descricao, setDescricao] = useState(material.descricao ?? '')
  const [url, setUrl] = useState(material.url ?? '')
  const [categoriaId, setCategoriaId] = useState(material.categoria_id ?? '')
  const [isPublic, setIsPublic] = useState(material.is_public)
  const [saveError, setSaveError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      updateMaterial(db, material.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        url: material.tipo === 'card' ? null : url.trim() || null,
        is_public: isPublic,
        ordem: material.ordem,
        categoria_id: categoriaId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      onClose()
    },
    onError: (err) => setSaveError(err instanceof Error ? err.message : String(err)),
  })

  const showUrl = material.tipo === 'link' || material.tipo === 'video'
  const tituloError = titulo.trim().length < 2

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título <span className="text-destructive">*</span></Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            {tituloError && <p className="text-xs text-destructive">Título obrigatório</p>}
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
          {showUrl && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-mat-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="edit-mat-public" className="text-sm">Público (visível no app)</label>
          </div>
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={() => { if (!tituloError) mutation.mutate() }}
              isLoading={mutation.isPending}
              disabled={tituloError}
            >
              Salvar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog: Novo Simulado (multi-step) ───────────────────────
function NovoSimuladoDialog({
  categorias,
  defaultCategoriaId,
  onClose,
}: {
  categorias: CategoriaMaterial[]
  defaultCategoriaId?: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [simuladoId, setSimuladoId] = useState<string | null>(null)
  const [config, setConfig] = useState<NovoSimuladoInput | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [randomPreview, setRandomPreview] = useState<Questao[]>([])
  const [searchQuestao, setSearchQuestao] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NovoSimuladoInput>({
    resolver: zodResolver(novoSimuladoSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      is_public: false,
      total_questoes: 10,
      modo_selecao: 'aleatorio',
      ...(defaultCategoriaId && { categoria_id: defaultCategoriaId }),
    },
  })

  const modoSelecao = watch('modo_selecao')
  const { data: questoesDisponiveis = [], isLoading: loadingQuestoes } = useQuery({
    queryKey: ['questoes-selecao', searchQuestao],
    queryFn: () =>
      listQuestoes(db, {
        ...(searchQuestao && { search: searchQuestao }),
      }),
    enabled: step === 2 && config?.modo_selecao === 'manual',
  })

  const {
    data: questoesAleatorias,
    isLoading: loadingQuestoesAleatorias,
    isError: hasRandomQuestoesError,
    error: randomQuestoesError,
  } = useQuery({
    queryKey: ['questoes-sorteio', 'todas'],
    queryFn: () =>
      listQuestoes(db),
    enabled: step === 2 && config?.modo_selecao === 'aleatorio',
  })

  const questoesAleatoriasList = questoesAleatorias ?? EMPTY_QUESTOES
  const questoesAleatoriasUnicas = useMemo(
    () => uniqueQuestoesForRandom(questoesAleatoriasList),
    [questoesAleatoriasList],
  )

  useEffect(() => {
    if (step !== 2 || config?.modo_selecao !== 'aleatorio') return
    if (loadingQuestoesAleatorias) return
    const sorteadas = shuffleArray(questoesAleatoriasUnicas).slice(0, config.total_questoes)
    setRandomPreview(sorteadas)
    setSelectedIds(sorteadas.map((q) => q.id))
  }, [config, loadingQuestoesAleatorias, questoesAleatoriasUnicas, step])

  const createSimuladoMutation = useMutation({
    mutationFn: async (data: NovoSimuladoInput) => {
      const material = await createMaterial(db, {
        titulo: data.titulo,
        descricao: data.descricao || null,
        tipo: 'simulado',
        url: null,
        conteudo_texto: null,
        banner_url: null,
        album_urls: [],
        categoria_id: data.categoria_id || null,
        is_public: data.is_public,
        is_active: true,
        ordem: 0,
        thumbnail_url: null,
        duracao_min: null,
        tamanho_bytes: null,
        publicado_por: null,
      })
      await upsertSimuladoConfig(db, {
        material_id: material.id,
        total_questoes: data.total_questoes,
        modo_selecao: data.modo_selecao,
      })
      return material
    },
    onSuccess: async (material, data) => {
      setSimuladoId(material.id)
      setConfig(data)
      setRandomPreview([])
      setSelectedIds([])
      setStep(2)
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : String(err)),
  })

  const finalizeMutation = useMutation({
    mutationFn: () => setSimuladoQuestoes(db, simuladoId!, selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      onClose()
    },
  })

  const handleResortear = async () => {
    const todas =
      questoesAleatoriasUnicas.length > 0
        ? questoesAleatoriasUnicas
        : await listQuestoes(db)
    const sorteadas = shuffleArray(uniqueQuestoesForRandom(todas)).slice(0, config!.total_questoes)
    setRandomPreview(sorteadas)
    setSelectedIds(sorteadas.map((q) => q.id))
  }

  const toggleQuestao = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const totalNecessario = config?.total_questoes ?? 0

  if (step === 1) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Simulado</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => createSimuladoMutation.mutate(d))}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label>
                Título <span className="text-destructive">*</span>
              </Label>
              <Input {...register('titulo')} placeholder="Ex: Simulado Legislação Básica" />
              {errors.titulo && (
                <p className="text-xs text-destructive">{errors.titulo.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea
                {...register('descricao')}
                placeholder="Descrição opcional..."
                className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            {!defaultCategoriaId && (
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
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Nº de questões <span className="text-destructive">*</span>
                </Label>
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
                <Label>
                  Seleção <span className="text-destructive">*</span>
                </Label>
                <select
                  {...register('modo_selecao')}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="aleatorio">Aleatória</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              {modoSelecao === 'aleatorio'
                ? 'As questões serão sorteadas do banco geral. Você poderá revisar e ressortear antes de confirmar.'
                : 'Na próxima etapa você selecionará as questões manualmente por busca.'}
            </p>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('is_public')} id="sim-public" />
              <label htmlFor="sim-public" className="text-sm">
                Público (visível no app)
              </label>
            </div>
            {createError && (
              <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                {createError}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={createSimuladoMutation.isPending}>
                Próximo →
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle>
            {config?.modo_selecao === 'aleatorio'
              ? 'Revisar questões sorteadas'
              : 'Selecionar questões'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm pb-3 border-b">
          <span className="text-muted-foreground">
            {selectedIds.length} de {totalNecessario} selecionada(s)
          </span>
          {config?.modo_selecao === 'aleatorio' && selectedIds.length > 0 ? (
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" />
              Sorteado
            </Badge>
          ) : selectedIds.length === totalNecessario ? (
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
          {config?.modo_selecao === 'aleatorio' ? (
            <>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResortear}
                  disabled={loadingQuestoesAleatorias || questoesAleatoriasUnicas.length === 0}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Ressortear
                </Button>
              </div>
              {loadingQuestoesAleatorias ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : hasRandomQuestoesError ? (
                <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  Não foi possível carregar as questões para sorteio:{' '}
                  {randomQuestoesError instanceof Error
                    ? randomQuestoesError.message
                    : 'erro desconhecido'}
                </p>
              ) : randomPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma questão disponível.{' '}
                  <Link to="/materiais/questoes" className="text-primary hover:underline">
                    Criar questões →
                  </Link>
                </p>
              ) : (
                randomPreview.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 rounded-md border p-3 bg-muted/20"
                  >
                    <span className="text-xs text-muted-foreground w-5 shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <span className="text-sm line-clamp-2 flex-1">{q.enunciado}</span>
                  </div>
                ))
              )}
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
              ) : questoesDisponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma questão encontrada.{' '}
                  <Link to="/materiais/questoes" className="text-primary hover:underline">
                    Criar questões →
                  </Link>
                </p>
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
              config?.modo_selecao === 'aleatorio'
                ? randomPreview.length === 0
                : selectedIds.length !== totalNecessario
            }
            isLoading={finalizeMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Confirmar simulado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Linha de material na tabela ───────────────────────────────
function MaterialRow({
  material,
  categorias,
  onEdit,
  onDelete,
}: {
  material: Material
  categorias: CategoriaMaterial[]
  onEdit: (m: Material) => void
  onDelete: (m: Material) => void
}) {
  const queryClient = useQueryClient()
  const categoria = categorias.find((c) => c.id === material.categoria_id)
  const Icon = TIPO_ICONS[material.tipo]
  const isActive = material.is_active !== false

  const toggleMutation = useMutation({
    mutationFn: () => updateMaterial(db, material.id, { is_active: !isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materiais'] }),
  })

  return (
    <tr className={isActive ? 'hover:bg-muted/20' : 'hover:bg-muted/20 opacity-50'}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{material.titulo}</span>
          {!isActive && (
            <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
          )}
        </div>
        {material.descricao && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6 line-clamp-1">
            {material.descricao}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={TIPO_BADGE_VARIANTS[material.tipo] as any}>
          {TIPO_LABELS[material.tipo]}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-sm">{categoria?.nome ?? '—'}</td>
      <td className="px-4 py-3">
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
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {(material.tipo === 'simulado' || material.tipo === 'card') && (
            <Link to={`/materiais/${material.id}`}>
              <Button variant="ghost" size="sm">
                <Pencil className="mr-1 h-3 w-3" />
                Gerenciar
              </Button>
            </Link>
          )}
          {material.tipo !== 'simulado' && material.tipo !== 'card' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => onEdit(material)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            title={isActive ? 'Desativar' : 'Ativar'}
            onClick={() => toggleMutation.mutate()}
            isLoading={toggleMutation.isPending}
          >
            {isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(material)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────
export function MateriaisPage() {
  const queryClient = useQueryClient()
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  const [tipoFiltro, setTipoFiltro] = useState<TipoMaterial | ''>('')
  const [visibilidadeFiltro, setVisibilidadeFiltro] = useState<'all' | 'public' | 'private'>('all')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sort, setSort] = useState<SortState<'titulo' | 'tipo' | 'categoria' | 'visibilidade' | 'created_at'>>({
    key: 'created_at',
    direction: 'desc',
  })
  // null = dialog fechado | undefined = livre (sem pré-seleção) | string = pré-selecionada
  const [novoMaterialCategoria, setNovoMaterialCategoria] = useState<string | undefined | null>(null)
  const [novoSimuladoCategoria, setNovoSimuladoCategoria] = useState<string | undefined | null>(null)
  const [showNovaCategoria, setShowNovaCategoria] = useState(false)
  const [editCategoria, setEditCategoria] = useState<CategoriaMaterial | undefined>()
  const [editMaterial, setEditMaterial] = useState<Material | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Material | undefined>()

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-material'],
    queryFn: () => listCategoriasMaterial(db),
  })

  const { data: todosMateriais = [], isLoading } = useQuery({
    queryKey: ['materiais'],
    queryFn: () => listMateriais(db),
  })

  const materiais = useMemo(() => {
    const rows = todosMateriais.filter((material) => {
      if (categoriaAtiva && material.categoria_id !== categoriaAtiva) return false
      if (!matchesActiveFilter(material.is_active !== false, activeFilter)) return false
      if (tipoFiltro && material.tipo !== tipoFiltro) return false
      if (visibilidadeFiltro === 'public' && !material.is_public) return false
      if (visibilidadeFiltro === 'private' && material.is_public) return false
      const categoria = categorias.find((c) => c.id === material.categoria_id)
      if (!includesText(
        [
          material.titulo,
          material.descricao,
          TIPO_LABELS[material.tipo],
          categoria?.nome,
          material.is_public ? 'publico' : 'privado',
          material.is_active !== false ? 'ativo' : 'inativo',
        ].join(' '),
        busca,
      )) return false
      return isWithinDateRange(material.created_at, createdFrom, createdTo)
    })

    return sortBy(rows, sort, {
      titulo: (material) => material.titulo,
      tipo: (material) => TIPO_LABELS[material.tipo],
      categoria: (material) => categorias.find((c) => c.id === material.categoria_id)?.nome,
      visibilidade: (material) => material.is_public,
      created_at: (material) => material.created_at,
    })
  }, [activeFilter, busca, categoriaAtiva, categorias, createdFrom, createdTo, sort, tipoFiltro, todosMateriais, visibilidadeFiltro])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaterial(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      setDeleteTarget(undefined)
    },
  })

  const simulados = materiais.filter((m) => m.tipo === 'simulado')
  const outrosMateriais = materiais.filter((m) => m.tipo !== 'simulado')

  return (
    <div>
      <PageHeader
        title="Materiais"
        subtitle={`${materiais.length} material(is) · ${simulados.length} simulado(s)`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/materiais/questoes">
              <Button variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Banco de Questões
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowNovaCategoria(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Categoria
            </Button>
            <Button variant="outline" onClick={() => setNovoMaterialCategoria(categoriaAtiva ?? undefined)}>
              <Plus className="mr-2 h-4 w-4" />
              Material
            </Button>
            <Button onClick={() => setNovoSimuladoCategoria(undefined)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Novo Simulado
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, descrição ou categoria..."
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Ativos e inativos</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value as TipoMaterial | '')}>
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={visibilidadeFiltro} onChange={(e) => setVisibilidadeFiltro(e.target.value as 'all' | 'public' | 'private')}>
            <option value="all">Públicos e privados</option>
            <option value="public">Públicos</option>
            <option value="private">Privados</option>
          </select>
          <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} title="Criado de" />
          <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} title="Criado até" />
        </div>

        {/* Abas de categoria */}
        <div className="flex gap-1 flex-wrap border-b pb-2">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              categoriaAtiva === null
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <div key={cat.id} className="group relative flex items-center">
              <button
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`px-4 py-1.5 rounded-md text-sm transition-colors pr-8 ${
                  categoriaAtiva === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {cat.nome}
              </button>
              <div className="absolute right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditCategoria(cat)}
                  className="p-0.5 rounded hover:bg-black/10"
                  title="Editar"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : materiais.length === 0 ? (
          <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground space-y-3">
            <p>Nenhum material cadastrado{categoriaAtiva ? ' nesta categoria' : ''}.</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNovoMaterialCategoria(categoriaAtiva ?? undefined)}>
                <Plus className="mr-1 h-3 w-3" />
                Novo Material
              </Button>
              <Button size="sm" onClick={() => setNovoSimuladoCategoria(categoriaAtiva ?? undefined)}>
                <ClipboardList className="mr-1 h-3 w-3" />
                Novo Simulado
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {simulados.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Simulados
                </h3>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <SortableTh sort={sort} sortKey="titulo" onSort={(key) => setSort(nextSort(sort, key))}>Título</SortableTh>
                        <SortableTh sort={sort} sortKey="tipo" onSort={(key) => setSort(nextSort(sort, key))}>Tipo</SortableTh>
                        <SortableTh sort={sort} sortKey="categoria" onSort={(key) => setSort(nextSort(sort, key))}>Categoria</SortableTh>
                        <SortableTh sort={sort} sortKey="visibilidade" onSort={(key) => setSort(nextSort(sort, key))}>Visibilidade</SortableTh>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {simulados.map((m) => (
                        <MaterialRow
                          key={m.id}
                          material={m}
                          categorias={categorias}
                          onEdit={setEditMaterial}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {outrosMateriais.length > 0 && (
              <div>
                {simulados.length > 0 && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Outros materiais
                  </h3>
                )}
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <SortableTh sort={sort} sortKey="titulo" onSort={(key) => setSort(nextSort(sort, key))}>Título</SortableTh>
                        <SortableTh sort={sort} sortKey="tipo" onSort={(key) => setSort(nextSort(sort, key))}>Tipo</SortableTh>
                        <SortableTh sort={sort} sortKey="categoria" onSort={(key) => setSort(nextSort(sort, key))}>Categoria</SortableTh>
                        <SortableTh sort={sort} sortKey="visibilidade" onSort={(key) => setSort(nextSort(sort, key))}>Visibilidade</SortableTh>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {outrosMateriais.map((m) => (
                        <MaterialRow
                          key={m.id}
                          material={m}
                          categorias={categorias}
                          onEdit={setEditMaterial}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {(showNovaCategoria || editCategoria) && (
        <CategoriaDialog
          {...(editCategoria ? { categoria: editCategoria } : {})}
          onDeleted={(id) => {
            if (categoriaAtiva === id) setCategoriaAtiva(null)
          }}
          onClose={() => {
            setShowNovaCategoria(false)
            setEditCategoria(undefined)
          }}
        />
      )}
      {novoMaterialCategoria !== null && (
        <NovoMaterialDialog
          categorias={categorias}
          {...(novoMaterialCategoria !== undefined ? { defaultCategoriaId: novoMaterialCategoria } : {})}
          onClose={() => setNovoMaterialCategoria(null)}
        />
      )}
      {novoSimuladoCategoria !== null && (
        <NovoSimuladoDialog
          categorias={categorias}
          {...(novoSimuladoCategoria !== undefined ? { defaultCategoriaId: novoSimuladoCategoria } : {})}
          onClose={() => setNovoSimuladoCategoria(null)}
        />
      )}
      {editMaterial && (
        <EditarMaterialDialog
          material={editMaterial}
          categorias={categorias}
          onClose={() => setEditMaterial(undefined)}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(undefined)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir material?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              "{deleteTarget.titulo}" será removido permanentemente.
              {deleteTarget.tipo === 'simulado' &&
                ' As questões do banco não serão excluídas.'}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                isLoading={deleteMutation.isPending}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
