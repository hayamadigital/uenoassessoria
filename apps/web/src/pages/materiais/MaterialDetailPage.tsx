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
  Pencil,
  Trash2,
  Globe,
  Lock,
  Image,
  Plus,
  Upload,
  Download,
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
import { db, storage } from '@/lib/firebase'
import { uploadFile, materialPath } from '@ueno/firebase/storage'
import {
  getMaterial,
  updateMaterial,
  getSimuladoConfig,
  upsertSimuladoConfig,
  listSimuladoQuestoes,
  listSimuladoResultados,
  listCategoriasMaterial,
  listMaterialCards,
  createMaterialCard,
  updateMaterialCard,
  deleteMaterialCard,
} from '@ueno/firebase/queries/materiais'
import {
  listErroReports,
  updateErroReport,
  createErroReport,
} from '@ueno/firebase/queries/questoes'
import {
  novoSimuladoSchema,
  materialCardSchema,
  questaoErroReportSchema,
  type NovoSimuladoInput,
  type MaterialCardInput,
  type QuestaoErroReportInput,
} from '@ueno/utils/validators'
import type {
  Material,
  SimuladoConfig,
  QuestaoWithDetails,
  ClienteSimuladoResultadoWithProfile,
  QuestaoErroReportWithDetails,
  CategoriaMaterial,
  MaterialCard,
} from '@ueno/firebase'

function questaoIdentifier(id: string) {
  return id.slice(0, 8).toUpperCase()
}

const CARD_CSV_HEADERS = [
  'imagem_url',
  'legenda_pt',
  'categoria',
  'legenda_kanji',
  'legenda_hiragana',
  'legenda_romaji',
  'descricao',
  'credito_imagem',
  'fonte_url',
  'ordem',
] as const

type CardCsvPreviewRow = {
  rowNumber: number
  input: MaterialCardInput
  errors: string[]
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(current.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      current = ''
      continue
    }

    current += char
  }

  row.push(current.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)

  return rows
}

function parseCardCsvRows(text: string, nextOrder: number): CardCsvPreviewRow[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''))
  if (rows.length === 0) return []

  const headerRow = rows[0]
  if (!headerRow) return []

  const headers = headerRow.map((header) => header.trim())
  const normalizedHeaders = headers.map((header) => header.toLowerCase())

  return rows.slice(1).map((values, index) => {
    const row: Record<string, string> = {}
    headers.forEach((header, headerIndex) => {
      const value = values[headerIndex]?.trim() ?? ''
      const normalizedHeader = normalizedHeaders[headerIndex] ?? header
      row[header] = value
      row[normalizedHeader] = value
    })

    const ordemValue = row.ordem
    const parsedOrder = ordemValue ? Number.parseInt(ordemValue, 10) : nextOrder + index
    const input: MaterialCardInput = {
      imagem_url: row.imagem_url ?? '',
      legenda_pt: row.legenda_pt ?? '',
      categoria: row.categoria ?? '',
      legenda_kanji: row.legenda_kanji ?? '',
      legenda_hiragana: row.legenda_hiragana ?? '',
      legenda_romaji: row.legenda_romaji ?? '',
      descricao: row.descricao ?? '',
      credito_imagem: row.credito_imagem ?? '',
      fonte_url: row.fonte_url ?? '',
      ordem: Number.isFinite(parsedOrder) ? parsedOrder : nextOrder + index,
    }

    const result = materialCardSchema.safeParse(input)
    const errors = result.success
      ? []
      : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)

    if (!input.imagem_url?.trim()) errors.push('imagem_url: Imagem obrigatória')

    return {
      rowNumber: index + 2,
      input,
      errors,
    }
  })
}

function csvEscape(value: string | number) {
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCardsCsvTemplate() {
  const sample = [
    'https://example.com/sinal.png',
    'Proibido estacionar',
    'Proibição',
    '駐車禁止',
    'ちゅうしゃきんし',
    'chusha kinshi',
    'Sinal usado em locais onde o estacionamento não é permitido.',
    'traffic-rules.com',
    'https://traffic-rules.com/pt-jp/livro',
    0,
  ]
  const csv = [
    CARD_CSV_HEADERS.join(','),
    sample.map(csvEscape).join(','),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-cards.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function CardDeckConfiguracaoTab({
  material,
  categorias,
}: {
  material: Material
  categorias: CategoriaMaterial[]
}) {
  const queryClient = useQueryClient()
  const [titulo, setTitulo] = useState(material.titulo)
  const [descricao, setDescricao] = useState(material.descricao ?? '')
  const [categoriaId, setCategoriaId] = useState(material.categoria_id ?? '')
  const [isPublic, setIsPublic] = useState(material.is_public)

  const mutation = useMutation({
    mutationFn: () =>
      updateMaterial(db, material.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        categoria_id: categoriaId || null,
        is_public: isPublic,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material', material.id] })
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
    },
  })

  const tituloError = titulo.trim().length < 2

  return (
    <div className="max-w-lg space-y-5">
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
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>
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
          id="card-deck-public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <label htmlFor="card-deck-public" className="text-sm">Público (visível no app)</label>
      </div>
      <Button
        onClick={() => mutation.mutate()}
        isLoading={mutation.isPending}
        disabled={tituloError}
      >
        Salvar alterações
      </Button>
    </div>
  )
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

// ── Tab: Questões do Simulado ─────────────────────────────────
function QuestoesTab({
  material,
  config,
}: {
  material: Material
  config: SimuladoConfig | null
}) {
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
      </div>

      {config && (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          A lista de questões é definida na criação do simulado e fica bloqueada depois disso.
        </div>
      )}

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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs rounded bg-muted px-2 py-1 text-muted-foreground">
                      {questaoIdentifier(q.id)}
                    </span>
                    <p className="text-sm font-medium flex-1 min-w-[220px]">{q.enunciado}</p>
                  </div>

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

    </div>
  )
}

function MaterialCardDialog({
  materialId,
  card,
  nextOrder,
  onClose,
}: {
  materialId: string
  card?: MaterialCard
  nextOrder: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const isEdit = !!card
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MaterialCardInput>({
    resolver: zodResolver(materialCardSchema),
    defaultValues: {
      imagem_url: card?.imagem_url ?? '',
      legenda_pt: card?.legenda_pt ?? '',
      categoria: card?.categoria ?? '',
      legenda_kanji: card?.legenda_kanji ?? '',
      legenda_hiragana: card?.legenda_hiragana ?? '',
      legenda_romaji: card?.legenda_romaji ?? '',
      descricao: card?.descricao ?? '',
      credito_imagem: card?.credito_imagem ?? '',
      fonte_url: card?.fonte_url ?? '',
      ordem: card?.ordem ?? nextOrder,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: MaterialCardInput) => {
      let imagemUrl = data.imagem_url?.trim() || ''
      if (arquivo) {
        imagemUrl = await uploadFile(storage, materialPath('card', arquivo.name), arquivo)
      }
      if (!imagemUrl) throw new Error('Imagem obrigatória')

      const payload = {
        material_id: materialId,
        imagem_url: imagemUrl,
        legenda_pt: data.legenda_pt.trim(),
        categoria: data.categoria?.trim() || null,
        legenda_kanji: data.legenda_kanji?.trim() || null,
        legenda_hiragana: data.legenda_hiragana?.trim() || null,
        legenda_romaji: data.legenda_romaji?.trim() || null,
        descricao: data.descricao?.trim() || null,
        credito_imagem: data.credito_imagem?.trim() || null,
        fonte_url: data.fonte_url?.trim() || null,
        ordem: data.ordem,
      }

      return isEdit
        ? updateMaterialCard(db, materialId, card.id, payload)
        : createMaterialCard(db, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-cards', materialId] })
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar card' : 'Novo card'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Imagem <span className="text-destructive">*</span></Label>
            <label className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-input px-4 py-5 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
              <Image className="h-8 w-8 opacity-40" />
              {arquivo ? (
                <span className="font-medium text-foreground">{arquivo.name}</span>
              ) : (
                <span>Clique para selecionar uma imagem</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
            </label>
            <Input {...register('imagem_url')} placeholder="ou cole uma URL da imagem" />
            {errors.imagem_url && <p className="text-xs text-destructive">{errors.imagem_url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Legenda em português <span className="text-destructive">*</span></Label>
            <Input {...register('legenda_pt')} placeholder="Ex: Proibido estacionar" />
            {errors.legenda_pt && <p className="text-xs text-destructive">{errors.legenda_pt.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input {...register('categoria')} placeholder="Ex: Proibição" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Kanji</Label>
              <Input {...register('legenda_kanji')} placeholder="駐車禁止" />
            </div>
            <div className="space-y-2">
              <Label>Hiragana</Label>
              <Input {...register('legenda_hiragana')} placeholder="ちゅうしゃきんし" />
            </div>
            <div className="space-y-2">
              <Label>Romaji</Label>
              <Input {...register('legenda_romaji')} placeholder="chusha kinshi" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <textarea
              {...register('descricao')}
              placeholder="Breve explicação opcional..."
              className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Crédito</Label>
              <Input {...register('credito_imagem')} placeholder="Ex: via Wikimedia.org" />
            </div>
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Input {...register('fonte_url')} placeholder="https://..." />
              {errors.fonte_url && <p className="text-xs text-destructive">{errors.fonte_url.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input type="number" {...register('ordem', { valueAsNumber: true })} />
            </div>
          </div>

          {mutation.error && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {isEdit ? 'Salvar' : 'Criar card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MaterialCardsCsvDialog({
  materialId,
  nextOrder,
  onClose,
}: {
  materialId: string
  nextOrder: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CardCsvPreviewRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  const validRows = rows.filter((row) => row.errors.length === 0)
  const invalidRows = rows.filter((row) => row.errors.length > 0)

  const importMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        validRows.map((row) =>
          createMaterialCard(db, {
            material_id: materialId,
            imagem_url: row.input.imagem_url?.trim() ?? '',
            legenda_pt: row.input.legenda_pt.trim(),
            categoria: row.input.categoria?.trim() || null,
            legenda_kanji: row.input.legenda_kanji?.trim() || null,
            legenda_hiragana: row.input.legenda_hiragana?.trim() || null,
            legenda_romaji: row.input.legenda_romaji?.trim() || null,
            descricao: row.input.descricao?.trim() || null,
            credito_imagem: row.input.credito_imagem?.trim() || null,
            fonte_url: row.input.fonte_url?.trim() || null,
            ordem: row.input.ordem,
          }),
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-cards', materialId] })
      onClose()
    },
  })

  async function handleCsvFile(file: File | null) {
    setRows([])
    setParseError(null)
    setFileName(file?.name ?? '')
    if (!file) return

    try {
      const text = await file.text()
      const parsedRows = parseCardCsvRows(text, nextOrder)
      if (parsedRows.length === 0) {
        setParseError('CSV sem linhas de cards.')
        return
      }
      setRows(parsedRows)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Não foi possível ler o CSV.')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar cards por CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-3 rounded-md border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-md bg-muted/20 px-4 py-5 text-sm text-muted-foreground hover:bg-muted/30">
              <Upload className="h-7 w-7 opacity-50" />
              <span className="font-medium text-foreground">
                {fileName || 'Selecionar arquivo CSV'}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => handleCsvFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button type="button" variant="outline" onClick={downloadCardsCsvTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Modelo
            </Button>
          </div>

          <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Colunas aceitas: {CARD_CSV_HEADERS.join(', ')}. A imagem do CSV deve ser uma URL.
          </div>

          {parseError && <p className="text-xs text-destructive">{parseError}</p>}

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="success">{validRows.length} válido(s)</Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="destructive">{invalidRows.length} com erro(s)</Badge>
                )}
              </div>

              <div className="max-h-[320px] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b bg-background">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Linha</th>
                      <th className="px-3 py-2 text-left font-medium">Legenda</th>
                      <th className="px-3 py-2 text-left font-medium">Categoria</th>
                      <th className="px-3 py-2 text-left font-medium">Imagem</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.slice(0, 80).map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          <div className="max-w-[220px] truncate font-medium">
                            {row.input.legenda_pt || 'Sem legenda'}
                          </div>
                          {(row.input.legenda_kanji || row.input.legenda_hiragana || row.input.legenda_romaji) && (
                            <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                              {[row.input.legenda_kanji, row.input.legenda_hiragana, row.input.legenda_romaji]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="block max-w-[180px] truncate text-xs text-muted-foreground">
                            {row.input.categoria || 'Sem categoria'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="block max-w-[260px] truncate text-xs text-muted-foreground">
                            {row.input.imagem_url || 'Sem imagem'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row.errors.length === 0 ? (
                            <Badge variant="success">OK</Badge>
                          ) : (
                            <div className="space-y-1">
                              {row.errors.map((error) => (
                                <p key={error} className="text-xs text-destructive">
                                  {error}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.length > 80 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando as primeiras 80 linhas de {rows.length}.
                </p>
              )}
            </div>
          )}

          {importMutation.error && (
            <p className="text-xs text-destructive">
              {importMutation.error instanceof Error
                ? importMutation.error.message
                : String(importMutation.error)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            isLoading={importMutation.isPending}
            disabled={validRows.length === 0 || invalidRows.length > 0}
            onClick={() => importMutation.mutate()}
          >
            Importar {validRows.length || ''} card(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CardsTab({ material }: { material: Material }) {
  const queryClient = useQueryClient()
  const [dialogCard, setDialogCard] = useState<MaterialCard | null | undefined>(undefined)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MaterialCard | null>(null)
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['material-cards', material.id],
    queryFn: () => listMaterialCards(db, material.id),
  })

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => deleteMaterialCard(db, material.id, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-cards', material.id] })
      setDeleteTarget(null)
    },
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{cards.length} card(s) neste material</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCsvImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button size="sm" onClick={() => setDialogCard(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo card
          </Button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum card cadastrado neste material.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div key={card.id} className="rounded-md border bg-card p-4">
              <div className="aspect-[4/3] rounded-md border bg-muted/30">
                <img
                  src={card.imagem_url}
                  alt={card.legenda_pt}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{card.legenda_pt}</p>
                    {card.categoria && <Badge variant="secondary">{card.categoria}</Badge>}
                  </div>
                  {(card.legenda_kanji || card.legenda_hiragana || card.legenda_romaji) && (
                    <p className="text-xs text-muted-foreground">
                      {[card.legenda_kanji, card.legenda_hiragana, card.legenda_romaji]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                {card.descricao && (
                  <p className="line-clamp-3 text-xs text-muted-foreground">{card.descricao}</p>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Badge variant="outline">#{card.ordem}</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialogCard(card)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(card)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogCard !== undefined && (
        <MaterialCardDialog
          materialId={material.id}
          {...(dialogCard ? { card: dialogCard } : {})}
          nextOrder={cards.length}
          onClose={() => setDialogCard(undefined)}
        />
      )}

      {showCsvImport && (
        <MaterialCardsCsvDialog
          materialId={material.id}
          nextOrder={cards.length}
          onClose={() => setShowCsvImport(false)}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir card?</DialogTitle>
            </DialogHeader>
            <p className="py-2 text-sm text-muted-foreground">
              “{deleteTarget.legenda_pt}” será removido permanentemente.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
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
    staleTime: 0,
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
type TabKey = 'configuracao' | 'questoes' | 'cards' | 'resultados'

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
    enabled: !!id && material?.tipo === 'simulado',
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

  const isCardDeck = material.tipo === 'card'
  const TABS: { key: TabKey; label: string }[] = isCardDeck
    ? [
        { key: 'configuracao', label: 'Configuração' },
        { key: 'cards', label: 'Cards' },
      ]
    : [
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
            <Badge>{isCardDeck ? 'Cards' : 'Simulado'}</Badge>
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
          isCardDeck ? (
            <CardDeckConfiguracaoTab material={material} categorias={categorias} />
          ) : (
            <ConfiguracaoTab material={material} config={config ?? null} categorias={categorias} />
          )
        )}
        {tab === 'questoes' && (
          <QuestoesTab material={material} config={config ?? null} />
        )}
        {tab === 'cards' && <CardsTab material={material} />}
        {tab === 'resultados' && <ResultadosTab material={material} />}
      </div>
    </div>
  )
}
