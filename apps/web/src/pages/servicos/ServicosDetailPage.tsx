import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, GripVertical, Plus, Pencil, Trash2, ImageIcon, Upload, Power, FileSpreadsheet, CircleCheck, CircleX, Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db, storage } from '@/lib/firebase'
import { uploadFile } from '@ueno/firebase/storage'
import { getServico, updateServico } from '@ueno/firebase/queries/servicos'
import {
  listVariacoesByServico,
  createServicoVariacao,
  updateServicoVariacao,
  reorderServicoVariacoes,
  toggleServicoVariacaoStatus,
  deleteServicoVariacao,
} from '@ueno/firebase/queries/servico_variacoes'
import {
  listEtapaTemplatesByServico,
  createEtapaTemplate,
  updateEtapaTemplate,
  reorderEtapaTemplates,
  deleteEtapaTemplate,
} from '@ueno/firebase/queries/etapa_templates'
import {
  servicoSchema,
  servicoVariacaoSchema,
  etapaTemplateSchema,
  type ServicoInput,
  type ServicoVariacaoInput,
  type EtapaTemplateInput,
} from '@ueno/utils/validators'
import type { EtapaTemplate, ResponsavelEtapa, ServicoVariacao } from '@ueno/firebase'

const responsavelLabel: Record<ResponsavelEtapa, string> = {
  cliente: 'Cliente',
  assessoria: 'Assessoria',
  menkyocenter: 'Menkyo Center',
  outros: 'Outros',
}

const responsavelCsvValues = Object.keys(responsavelLabel) as ResponsavelEtapa[]

function getTemplateVariacoesLabel(template: EtapaTemplate, variacoes: ServicoVariacao[]) {
  if (template.variacao_ids.length === 0) return 'Todas as variações'
  const names = template.variacao_ids.map((id) => variacoes.find((v) => v.id === id)?.nome ?? id)
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
}

function formatPreco(
  item: Pick<ServicoVariacao, 'preco_variavel' | 'preco_jpy' | 'preco_min_jpy' | 'preco_max_jpy'>,
) {
  if (item.preco_variavel && item.preco_min_jpy != null && item.preco_max_jpy != null) {
    return `¥${item.preco_min_jpy.toLocaleString('ja-JP')} - ¥${item.preco_max_jpy.toLocaleString('ja-JP')}`
  }
  return item.preco_jpy != null ? `¥${item.preco_jpy.toLocaleString('ja-JP')}` : '—'
}

// ── Sortable template card ───────────────────────────────────
function TemplateCard({
  template,
  variacoes,
  onEdit,
  onDelete,
}: {
  template: EtapaTemplate
  variacoes: ServicoVariacao[]
  onEdit: (t: EtapaTemplate) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: template.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-background px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{template.nome}</span>
          <Badge variant="outline">{responsavelLabel[template.responsavel_padrao]}</Badge>
          {variacoes.length > 0 && (
            <Badge variant={template.variacao_ids.length === 0 ? 'secondary' : 'outline'}>
              {getTemplateVariacoesLabel(template, variacoes)}
            </Badge>
          )}
        </div>
        {template.descricao && (
          <p className="text-xs text-muted-foreground mt-0.5">{template.descricao}</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(template)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(template.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

// ── Template Form ─────────────────────────────────────────────
function TemplateForm({
  defaultValues,
  variacoes,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<EtapaTemplateInput>
  variacoes: ServicoVariacao[]
  onSubmit: (data: EtapaTemplateInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EtapaTemplateInput>({
    resolver: zodResolver(etapaTemplateSchema),
    defaultValues: { responsavel_padrao: 'assessoria', variacao_ids: [], ...defaultValues },
  })
  const selectedVariacaoIds = watch('variacao_ids') ?? []

  function toggleVariacaoId(variacaoId: string, checked: boolean) {
    const next = checked
      ? [...new Set([...selectedVariacaoIds, variacaoId])]
      : selectedVariacaoIds.filter((id) => id !== variacaoId)
    setValue('variacao_ids', next, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <form id="tpl-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Nome <span className="text-destructive">*</span></Label>
        <Input {...register('nome')} />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <textarea
          {...register('descricao')}
          className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label>Responsável Padrão</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register('responsavel_padrao')}
        >
          <option value="assessoria">Assessoria</option>
          <option value="cliente">Cliente</option>
          <option value="menkyocenter">Menkyo Center</option>
          <option value="outros">Outros</option>
        </select>
      </div>
      {variacoes.length > 0 && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Variações que usam esta etapa</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Deixe sem seleção para aplicar esta etapa a todas as variações.
              </p>
            </div>
            {selectedVariacaoIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setValue('variacao_ids', [], { shouldDirty: true, shouldValidate: true })}
              >
                Todas
              </Button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {variacoes.map((variacao) => (
              <label key={variacao.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedVariacaoIds.includes(variacao.id)}
                  onChange={(event) => toggleVariacaoId(variacao.id, event.target.checked)}
                />
                <span>{variacao.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="tpl-form" isLoading={isLoading}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

function VariacaoCard({
  variacao,
  onEdit,
  onToggle,
  onDelete,
}: {
  variacao: ServicoVariacao
  onEdit: (v: ServicoVariacao) => void
  onToggle: (v: ServicoVariacao) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: variacao.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-md border bg-background px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Arrastar variação"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{variacao.nome}</span>
          <Badge variant={variacao.ativo ? 'success' : 'outline'}>
            {variacao.ativo ? 'Ativa' : 'Inativa'}
          </Badge>
          <Badge variant="secondary">{formatPreco(variacao)}</Badge>
          {variacao.duracao_texto && <Badge variant="outline">{variacao.duracao_texto}</Badge>}
        </div>
        {variacao.descricao && (
          <p className="text-xs text-muted-foreground mt-1">{variacao.descricao}</p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onToggle(variacao)} title={variacao.ativo ? 'Desativar' : 'Ativar'}>
          <Power className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(variacao)} title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={variacao.ativo ? 'Desative antes de remover' : 'Remover'}
          disabled={variacao.ativo}
          onClick={() => onDelete(variacao.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

function VariacaoForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<ServicoVariacaoInput>
  onSubmit: (data: ServicoVariacaoInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ServicoVariacaoInput>({
    resolver: zodResolver(servicoVariacaoSchema),
    defaultValues: {
      ativo: true,
      preco_variavel: false,
      preco_jpy: 0,
      preco_min_jpy: null,
      preco_max_jpy: null,
      ...defaultValues,
    },
  })
  const precoVariavel = watch('preco_variavel')

  return (
    <form id="variacao-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Nome <span className="text-destructive">*</span></Label>
        <Input {...register('nome')} placeholder="Ex: Carro Automático" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Descrição ou requisito</Label>
        <textarea
          {...register('descricao')}
          placeholder="Ex: Necessário ter habilitação de carro"
          className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Preço fixo (¥)</Label>
          {precoVariavel ? (
            <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
              Definido pela faixa
            </div>
          ) : (
            <Input type="number" min={0} {...register('preco_jpy', { valueAsNumber: true })} />
          )}
          {errors.preco_jpy && <p className="text-xs text-destructive">{errors.preco_jpy.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Duração</Label>
          <Input {...register('duracao_texto')} placeholder="Ex: 14 dias" />
        </div>
      </div>
      <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm">
        <input type="checkbox" {...register('preco_variavel')} className="mt-1" />
        <span>
          <span className="font-medium">Preço em faixa</span>
          <span className="block text-xs text-muted-foreground">
            Use uma faixa de preço mínimo e máximo para esta variação.
          </span>
        </span>
      </label>
      {precoVariavel && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Preço mínimo (¥)</Label>
            <Input type="number" min={0} {...register('preco_min_jpy', { valueAsNumber: true })} />
            {errors.preco_min_jpy && <p className="text-xs text-destructive">{errors.preco_min_jpy.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Preço máximo (¥)</Label>
            <Input type="number" min={0} {...register('preco_max_jpy', { valueAsNumber: true })} />
            {errors.preco_max_jpy && <p className="text-xs text-destructive">{errors.preco_max_jpy.message}</p>}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('ativo')} id="variacao-ativo" />
        <label htmlFor="variacao-ativo" className="text-sm">Ativa</label>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="variacao-form" isLoading={isLoading}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── CSV Import Variações ──────────────────────────────────────
const VARIACAO_CSV_HEADERS = [
  'nome',
  'descricao',
  'modelo_preco',
  'preco_jpy',
  'preco_min_jpy',
  'preco_max_jpy',
  'duracao_texto',
  'ativo',
] as const

const VARIACAO_COLUMN_DESCRIPTIONS: Record<
  (typeof VARIACAO_CSV_HEADERS)[number],
  { obrigatorio: boolean; descricao: string; exemplo: string }
> = {
  nome: { obrigatorio: true, descricao: 'Nome da variação exibido no catálogo', exemplo: 'Carro Automático' },
  descricao: { obrigatorio: false, descricao: 'Descrição, requisito ou condição', exemplo: 'Necessário ter habilitação de carro' },
  modelo_preco: { obrigatorio: false, descricao: 'Use fixo ou faixa. Se omitido, usa fixo quando preco_jpy preenchido, faixa quando min/max preenchidos', exemplo: 'fixo' },
  preco_jpy: { obrigatorio: false, descricao: 'Preço fixo em ienes, somente números', exemplo: '120000' },
  preco_min_jpy: { obrigatorio: false, descricao: 'Preço mínimo (modelo faixa)', exemplo: '90000' },
  preco_max_jpy: { obrigatorio: false, descricao: 'Preço máximo (modelo faixa)', exemplo: '150000' },
  duracao_texto: { obrigatorio: false, descricao: 'Texto livre de duração', exemplo: '14 dias' },
  ativo: { obrigatorio: false, descricao: 'Define se a variação fica ativa', exemplo: 'true' },
}

type ParsedVariacaoRow = {
  linha: number
  nome: string
  descricao: string | null
  preco_variavel: boolean
  preco_jpy: number | null
  preco_min_jpy: number | null
  preco_max_jpy: number | null
  duracao_texto: string | null
  ativo: boolean
  errors: string[]
}

type ImportFailure = {
  linha: number
  nome: string
  erro: string
}

function escapeCsvValue(value: string | number | boolean) {
  const raw = String(value)
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

function downloadVariacoesCsvTemplate() {
  const rows = [
    VARIACAO_CSV_HEADERS,
    ['Carro Automático', 'Necessário ter habilitação de carro', 'fixo', '120000', '', '', '14 dias', 'true'],
    ['Moto 400cc', 'Necessário ter habilitação de moto', 'faixa', '', '90000', '130000', '8 dias', 'true'],
  ]
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-variacoes.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let insideQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') { current += '"'; i += 1 }
      else insideQuotes = !insideQuotes
    } else if ((char === ',' || char === ';') && !insideQuotes) {
      row.push(current); current = ''
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1
      row.push(current)
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []; current = ''
    } else {
      current += char
    }
  }

  row.push(current)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}

function parseCsvMoney(value: string, field: string, rowNumber: number, errors: string[]) {
  if (!value) return null
  const parsed = Number(value.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    errors.push(`Linha ${rowNumber}: ${field} deve ser um número inteiro maior ou igual a 0.`)
    return null
  }
  return parsed
}

function parseCsvBoolean(value: string, rowNumber: number) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  if (['true', '1', 'sim', 's', 'ativo', 'ativa'].includes(normalized)) return true
  if (['false', '0', 'nao', 'não', 'n', 'inativo', 'inativa'].includes(normalized)) return false
  throw new Error(`Linha ${rowNumber}: ativo deve ser true/false, sim/não ou 1/0.`)
}

function parseVariacoesCsvRows(text: string): ParsedVariacaoRow[] {
  const rows = parseCsvText(text.replace(/^﻿/, ''))
  if (rows.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos uma linha de variação.')

  const headers = rows[0]!.map((h) => h.trim().toLowerCase())
  if (!headers.includes('nome')) throw new Error('Coluna obrigatória ausente: nome.')

  return rows.slice(1).map((row, index) => {
    const rowNumber = index + 2
    const errors: string[] = []
    const record = Object.fromEntries(headers.map((h, ci) => [h, row[ci]?.trim() ?? '']))

    const nome = record.nome ?? ''

    // Infer modelo_preco if column absent or empty
    const modeloPrecoRaw = (record.modelo_preco ?? '').toLowerCase()
    const hasMin = !!record.preco_min_jpy
    const hasMax = !!record.preco_max_jpy
    const hasFixed = !!record.preco_jpy
    let modeloPreco: string
    if (modeloPrecoRaw === 'faixa') {
      modeloPreco = 'faixa'
    } else if (modeloPrecoRaw === 'fixo') {
      modeloPreco = 'fixo'
    } else if (!modeloPrecoRaw) {
      modeloPreco = hasMin || hasMax ? 'faixa' : 'fixo'
    } else {
      modeloPreco = modeloPrecoRaw
      errors.push(`Linha ${rowNumber}: modelo_preco deve ser fixo ou faixa (recebido: "${modeloPrecoRaw}").`)
    }

    const precoVariavel = modeloPreco === 'faixa'
    const precoJpy = precoVariavel ? null : parseCsvMoney(record.preco_jpy ?? '', 'preco_jpy', rowNumber, errors)
    const precoMinJpy = precoVariavel ? parseCsvMoney(record.preco_min_jpy ?? '', 'preco_min_jpy', rowNumber, errors) : null
    const precoMaxJpy = precoVariavel ? parseCsvMoney(record.preco_max_jpy ?? '', 'preco_max_jpy', rowNumber, errors) : null

    if (!nome) errors.push(`Linha ${rowNumber}: nome é obrigatório.`)
    else if (nome.length < 2) errors.push(`Linha ${rowNumber}: nome deve ter pelo menos 2 caracteres.`)

    if (modeloPreco === 'fixo' && !hasFixed) errors.push(`Linha ${rowNumber}: preco_jpy é obrigatório quando modelo_preco=fixo.`)
    if (precoVariavel) {
      if (precoMinJpy == null) errors.push(`Linha ${rowNumber}: preco_min_jpy é obrigatório quando modelo_preco=faixa.`)
      if (precoMaxJpy == null) errors.push(`Linha ${rowNumber}: preco_max_jpy é obrigatório quando modelo_preco=faixa.`)
      if (precoMinJpy != null && precoMaxJpy != null && precoMaxJpy < precoMinJpy) {
        errors.push(`Linha ${rowNumber}: preco_max_jpy deve ser maior ou igual ao preco_min_jpy.`)
      }
    }

    let ativo = true
    try { ativo = parseCsvBoolean(record.ativo ?? '', rowNumber) }
    catch (err) { errors.push(err instanceof Error ? err.message : String(err)) }

    return {
      linha: rowNumber,
      nome,
      descricao: record.descricao || null,
      preco_variavel: precoVariavel,
      preco_jpy: precoJpy,
      preco_min_jpy: precoMinJpy,
      preco_max_jpy: precoMaxJpy,
      duracao_texto: record.duracao_texto || null,
      ativo,
      errors,
    }
  })
}

function formatVariacaoPreco(row: Pick<ParsedVariacaoRow, 'preco_variavel' | 'preco_jpy' | 'preco_min_jpy' | 'preco_max_jpy'>) {
  if (row.preco_variavel && row.preco_min_jpy != null && row.preco_max_jpy != null) {
    return `¥${row.preco_min_jpy.toLocaleString('ja-JP')} - ¥${row.preco_max_jpy.toLocaleString('ja-JP')}`
  }
  return row.preco_jpy != null ? `¥${row.preco_jpy.toLocaleString('ja-JP')}` : '—'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Erro desconhecido'
}

function ImportarVariacoesDialog({
  servicoId,
  baseOrdem,
  onClose,
}: {
  servicoId: string
  baseOrdem: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'instrucoes' | 'importar'>('instrucoes')
  const [rows, setRows] = useState<ParsedVariacaoRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; erros: number } | null>(null)
  const [importFailures, setImportFailures] = useState<ImportFailure[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  const validRows = rows.filter((r) => r.errors.length === 0)
  const invalidRows = rows.filter((r) => r.errors.length > 0)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileName(file.name)
    setImportResult(null)
    setImportFailures([])
    setParseError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        setRows(parseVariacoesCsvRows(String(e.target?.result ?? '')))
      } catch (err) {
        setRows([])
        setParseError(err instanceof Error ? err.message : String(err))
      }
    }
    reader.onerror = () => {
      setRows([])
      setParseError('Não foi possível ler o arquivo. Verifique se é um arquivo CSV válido.')
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    setImporting(true)
    setImportFailures([])
    let ok = 0
    const failures: ImportFailure[] = []
    for (const [i, row] of validRows.entries()) {
      try {
        await createServicoVariacao(db, {
          servico_id: servicoId,
          nome: row.nome,
          descricao: row.descricao,
          preco_jpy: row.preco_variavel ? null : (row.preco_jpy ?? 0),
          preco_variavel: row.preco_variavel,
          preco_min_jpy: row.preco_min_jpy,
          preco_max_jpy: row.preco_max_jpy,
          duracao_texto: row.duracao_texto,
          ativo: row.ativo,
          ordem: baseOrdem + i,
        })
        ok += 1
      } catch (err) {
        failures.push({
          linha: row.linha,
          nome: row.nome,
          erro: getErrorMessage(err),
        })
      }
    }
    queryClient.invalidateQueries({ queryKey: ['servico-variacoes', servicoId] })
    setImportFailures(failures)
    setImportResult({ ok, erros: failures.length })
    setImporting(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar variações por planilha
          </DialogTitle>
        </DialogHeader>

        <div className="flex border-b px-6">
          {(['instrucoes', 'importar'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === item
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {item === 'instrucoes' ? 'Instruções' : 'Importar'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {tab === 'instrucoes' ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Prepare um arquivo <strong>.CSV</strong> com as colunas abaixo. Você pode usar
                  Excel ou Google Sheets e exportar como CSV.
                </p>
                <Button variant="outline" size="sm" onClick={downloadVariacoesCsvTemplate} className="shrink-0">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar modelo
                </Button>
              </div>

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
                    {VARIACAO_CSV_HEADERS.map((column) => {
                      const info = VARIACAO_COLUMN_DESCRIPTIONS[column]
                      return (
                        <tr key={column} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs bg-muted/20">{column}</td>
                          <td className="px-3 py-2">
                            {info.obrigatorio
                              ? <span className="text-destructive font-medium">Sim</span>
                              : <span className="text-muted-foreground">Não</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{info.descricao}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground italic">{info.exemplo || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="rounded-md bg-muted/30 border p-4 space-y-2 text-sm">
                <p className="font-medium">Regras importantes</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>A primeira linha deve conter exatamente os nomes das colunas.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">modelo_preco</code> aceita <code className="bg-muted px-1 rounded text-xs">fixo</code> ou <code className="bg-muted px-1 rounded text-xs">faixa</code>.</li>
                  <li>Para <code className="bg-muted px-1 rounded text-xs">fixo</code>, preencha <code className="bg-muted px-1 rounded text-xs">preco_jpy</code>. Para <code className="bg-muted px-1 rounded text-xs">faixa</code>, preencha <code className="bg-muted px-1 rounded text-xs">preco_min_jpy</code> e <code className="bg-muted px-1 rounded text-xs">preco_max_jpy</code>.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">ativo</code> aceita <code className="bg-muted px-1 rounded text-xs">true/false</code>, <code className="bg-muted px-1 rounded text-xs">sim/não</code> ou <code className="bg-muted px-1 rounded text-xs">1/0</code>. Padrão: <code className="bg-muted px-1 rounded text-xs">true</code>.</li>
                  <li>Salve o arquivo com codificação <strong>UTF-8</strong> para preservar acentuação.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed border-input px-6 py-8 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
                <Upload className="h-8 w-8 opacity-40" />
                {fileName
                  ? <span className="font-medium text-foreground">{fileName}</span>
                  : <span>Clique para selecionar o arquivo CSV</span>}
                <span className="text-xs">Apenas arquivos .csv</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
              </label>

              {parseError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <p className="whitespace-pre-line">{parseError}</p>
                </div>
              )}

              {importResult && (
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <CircleCheck className="h-5 w-5 text-green-600 shrink-0" />
                    <span>
                      <strong>{importResult.ok}</strong> variação(ões) importada(s) com sucesso.
                      {importResult.erros > 0 && (
                        <span className="text-destructive ml-2">{importResult.erros} falha(s).</span>
                      )}
                    </span>
                  </div>
                  {importFailures.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-destructive">
                      {importFailures.map((failure) => (
                        <li key={`${failure.linha}-${failure.nome}`}>
                          Linha {failure.linha} ({failure.nome || 'sem nome'}): {failure.erro}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {rows.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{rows.length} linha(s) encontrada(s)</span>
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
                          <th className="px-3 py-2 text-left font-medium">Nome</th>
                          <th className="px-3 py-2 text-left font-medium">Preço</th>
                          <th className="px-3 py-2 text-left font-medium">Duração</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Validação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((row) => (
                          <tr key={row.linha} className={row.errors.length === 0 ? 'hover:bg-muted/20' : 'bg-destructive/5'}>
                            <td className="px-3 py-2 text-muted-foreground">{row.linha}</td>
                            <td className="px-3 py-2 max-w-xs">
                              <span className="line-clamp-1">{row.nome || '—'}</span>
                              {row.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{row.descricao}</p>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{formatVariacaoPreco(row)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.duracao_texto || '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.ativo ? 'Ativo' : 'Inativo'}</td>
                            <td className="px-3 py-2">
                              {row.errors.length === 0 ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs">
                                  <CircleCheck className="h-3.5 w-3.5" />
                                  OK
                                </span>
                              ) : (
                                <div className="flex items-start gap-1 text-destructive text-xs">
                                  <CircleX className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <ul className="space-y-0.5">
                                    {row.errors.map((e, ei) => <li key={ei}>{e}</li>)}
                                  </ul>
                                </div>
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
              Importar {validRows.length > 0 ? `${validRows.length} variação(ões)` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── CSV Import Etapas Padrão ──────────────────────────────────
const ETAPA_CSV_HEADERS = [
  'nome',
  'descricao',
  'responsavel_padrao',
  'variacoes',
  'ordem',
] as const

const ETAPA_COLUMN_DESCRIPTIONS: Record<
  (typeof ETAPA_CSV_HEADERS)[number],
  { obrigatorio: boolean; descricao: string; exemplo: string }
> = {
  nome: { obrigatorio: true, descricao: 'Nome da etapa padrão', exemplo: 'Separar documentos' },
  descricao: { obrigatorio: false, descricao: 'Descrição ou orientação da etapa', exemplo: 'Cliente deve enviar CNH e zairyu card.' },
  responsavel_padrao: { obrigatorio: false, descricao: 'Use cliente, assessoria, menkyocenter ou outros. Padrão: assessoria', exemplo: 'cliente' },
  variacoes: { obrigatorio: false, descricao: 'Nomes ou IDs das variações separados por |. Vazio aplica a todas.', exemplo: 'Carro|Moto 400cc' },
  ordem: { obrigatorio: false, descricao: 'Ordem de exibição. Se vazio, entra no fim da lista.', exemplo: '0' },
}

type ParsedEtapaRow = {
  linha: number
  nome: string
  descricao: string | null
  responsavel_padrao: ResponsavelEtapa
  variacao_ids: string[]
  ordem: number
  errors: string[]
}

function downloadEtapasCsvTemplate(variacoes: ServicoVariacao[]) {
  const primeiraVariacao = variacoes[0]?.nome ?? ''
  const segundaVariacao = variacoes[1]?.nome ?? ''
  const variacoesExemplo = [primeiraVariacao, segundaVariacao].filter(Boolean).join('|')
  const rows = [
    ETAPA_CSV_HEADERS,
    ['Separar documentos', 'Cliente deve enviar os documentos iniciais.', 'cliente', '', '0'],
    ['Conferir documentação', 'Assessoria confere se há pendências.', 'assessoria', variacoesExemplo, '1'],
    ['Agendar entrevista', 'Agendamento junto ao Menkyo Center.', 'menkyocenter', primeiraVariacao, '2'],
  ]
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-etapas-padrao.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function resolveVariacaoIds(raw: string, variacoes: ServicoVariacao[], rowNumber: number, errors: string[]) {
  if (!raw.trim()) return []
  const byId = new Map(variacoes.map((variacao) => [variacao.id.toLowerCase(), variacao.id]))
  const byName = new Map(variacoes.map((variacao) => [variacao.nome.trim().toLowerCase(), variacao.id]))
  const ids: string[] = []

  raw.split('|').map((item) => item.trim()).filter(Boolean).forEach((item) => {
    const normalized = item.toLowerCase()
    const id = byId.get(normalized) ?? byName.get(normalized)
    if (!id) {
      errors.push(`Linha ${rowNumber}: variação "${item}" não encontrada neste serviço.`)
      return
    }
    if (!ids.includes(id)) ids.push(id)
  })

  return ids
}

function parseEtapasCsvRows(text: string, variacoes: ServicoVariacao[], nextOrdem: number): ParsedEtapaRow[] {
  const rows = parseCsvText(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos uma linha de etapa.')

  const headers = rows[0]!.map((header) => header.trim().toLowerCase())
  const missingHeaders = ETAPA_CSV_HEADERS.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    throw new Error(`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}.`)
  }

  let autoOrder = nextOrdem

  return rows.slice(1).map((row, index) => {
    const rowNumber = index + 2
    const errors: string[] = []
    const record = Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() ?? '']))
    const nome = record.nome ?? ''
    const responsavelRaw = (record.responsavel_padrao || 'assessoria').toLowerCase()
    const responsavel = responsavelCsvValues.includes(responsavelRaw as ResponsavelEtapa)
      ? responsavelRaw as ResponsavelEtapa
      : 'assessoria'

    if (!nome) errors.push(`Linha ${rowNumber}: nome é obrigatório.`)
    if (!responsavelCsvValues.includes(responsavelRaw as ResponsavelEtapa)) {
      errors.push(`Linha ${rowNumber}: responsavel_padrao deve ser cliente, assessoria, menkyocenter ou outros.`)
    }

    let ordem = autoOrder
    if (record.ordem) {
      const parsed = Number(record.ordem)
      if (!Number.isInteger(parsed) || parsed < 0) {
        errors.push(`Linha ${rowNumber}: ordem deve ser um número inteiro maior ou igual a 0.`)
      } else {
        ordem = parsed
      }
    } else {
      autoOrder += 1
    }

    return {
      linha: rowNumber,
      nome,
      descricao: record.descricao || null,
      responsavel_padrao: responsavel,
      variacao_ids: resolveVariacaoIds(record.variacoes ?? '', variacoes, rowNumber, errors),
      ordem,
      errors,
    }
  })
}

function ImportarEtapasDialog({
  servicoId,
  variacoes,
  baseOrdem,
  onClose,
}: {
  servicoId: string
  variacoes: ServicoVariacao[]
  baseOrdem: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'instrucoes' | 'importar'>('instrucoes')
  const [rows, setRows] = useState<ParsedEtapaRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; erros: number } | null>(null)
  const [importFailures, setImportFailures] = useState<ImportFailure[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  const validRows = rows.filter((row) => row.errors.length === 0)
  const invalidRows = rows.filter((row) => row.errors.length > 0)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileName(file.name)
    setImportResult(null)
    setImportFailures([])
    setParseError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        setRows(parseEtapasCsvRows(String(e.target?.result ?? ''), variacoes, baseOrdem))
      } catch (err) {
        setRows([])
        setParseError(getErrorMessage(err))
      }
    }
    reader.onerror = () => {
      setRows([])
      setParseError('Não foi possível ler o arquivo. Verifique se é um arquivo CSV válido.')
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    setImporting(true)
    setImportFailures([])
    let ok = 0
    const failures: ImportFailure[] = []

    for (const row of validRows) {
      try {
        await createEtapaTemplate(db, {
          servico_id: servicoId,
          nome: row.nome,
          descricao: row.descricao,
          responsavel_padrao: row.responsavel_padrao,
          variacao_ids: row.variacao_ids,
          ordem: row.ordem,
        })
        ok += 1
      } catch (err) {
        failures.push({ linha: row.linha, nome: row.nome, erro: getErrorMessage(err) })
      }
    }

    queryClient.invalidateQueries({ queryKey: ['etapa-templates', servicoId] })
    setImportFailures(failures)
    setImportResult({ ok, erros: failures.length })
    setImporting(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar etapas padrão por planilha
          </DialogTitle>
        </DialogHeader>

        <div className="flex border-b px-6">
          {(['instrucoes', 'importar'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === item
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {item === 'instrucoes' ? 'Instruções' : 'Importar'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {tab === 'instrucoes' ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Prepare um arquivo <strong>.CSV</strong> com as etapas padrão do serviço.
                </p>
                <Button variant="outline" size="sm" onClick={() => downloadEtapasCsvTemplate(variacoes)} className="shrink-0">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar modelo
                </Button>
              </div>

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
                    {ETAPA_CSV_HEADERS.map((column) => {
                      const info = ETAPA_COLUMN_DESCRIPTIONS[column]
                      return (
                        <tr key={column} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs bg-muted/20">{column}</td>
                          <td className="px-3 py-2">
                            {info.obrigatorio ? <span className="text-destructive font-medium">Sim</span> : <span className="text-muted-foreground">Não</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{info.descricao}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground italic">{info.exemplo}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="rounded-md bg-muted/30 border p-4 space-y-2 text-sm">
                <p className="font-medium">Regras importantes</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li><code className="bg-muted px-1 rounded text-xs">variacoes</code> vazio aplica a etapa a todas as variações.</li>
                  <li>Para limitar uma etapa, informe nomes ou IDs das variações separados por <code className="bg-muted px-1 rounded text-xs">|</code>.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">responsavel_padrao</code> aceita <code className="bg-muted px-1 rounded text-xs">cliente</code>, <code className="bg-muted px-1 rounded text-xs">assessoria</code>, <code className="bg-muted px-1 rounded text-xs">menkyocenter</code> ou <code className="bg-muted px-1 rounded text-xs">outros</code>.</li>
                  <li>Salve o arquivo com codificação <strong>UTF-8</strong> para preservar acentuação.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed border-input px-6 py-8 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
                <Upload className="h-8 w-8 opacity-40" />
                {fileName ? <span className="font-medium text-foreground">{fileName}</span> : <span>Clique para selecionar o arquivo CSV</span>}
                <span className="text-xs">Apenas arquivos .csv</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
              </label>

              {parseError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <p className="whitespace-pre-line">{parseError}</p>
                </div>
              )}

              {importResult && (
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <CircleCheck className="h-5 w-5 text-green-600 shrink-0" />
                    <span>
                      <strong>{importResult.ok}</strong> etapa(s) importada(s) com sucesso.
                      {importResult.erros > 0 && <span className="text-destructive ml-2">{importResult.erros} falha(s).</span>}
                    </span>
                  </div>
                  {importFailures.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-destructive">
                      {importFailures.map((failure) => (
                        <li key={`${failure.linha}-${failure.nome}`}>
                          Linha {failure.linha} ({failure.nome || 'sem nome'}): {failure.erro}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {rows.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{rows.length} linha(s) encontrada(s)</span>
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
                          <th className="px-3 py-2 text-left font-medium">Nome</th>
                          <th className="px-3 py-2 text-left font-medium">Responsável</th>
                          <th className="px-3 py-2 text-left font-medium">Variações</th>
                          <th className="px-3 py-2 text-left font-medium">Validação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((row) => (
                          <tr key={row.linha} className={row.errors.length === 0 ? 'hover:bg-muted/20' : 'bg-destructive/5'}>
                            <td className="px-3 py-2 text-muted-foreground">{row.linha}</td>
                            <td className="px-3 py-2 max-w-xs">
                              <span className="line-clamp-1">{row.nome || '—'}</span>
                              {row.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{row.descricao}</p>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{responsavelLabel[row.responsavel_padrao]}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.variacao_ids.length === 0
                                ? 'Todas'
                                : row.variacao_ids.map((id) => variacoes.find((v) => v.id === id)?.nome ?? id).join(', ')}
                            </td>
                            <td className="px-3 py-2">
                              {row.errors.length === 0 ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs">
                                  <CircleCheck className="h-3.5 w-3.5" />
                                  OK
                                </span>
                              ) : (
                                <div className="flex items-start gap-1 text-destructive text-xs">
                                  <CircleX className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <ul className="space-y-0.5">
                                    {row.errors.map((e, ei) => <li key={ei}>{e}</li>)}
                                  </ul>
                                </div>
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
              Importar {validRows.length > 0 ? `${validRows.length} etapa(s)` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────
export function ServicosDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editTemplate, setEditTemplate] = useState<EtapaTemplate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addVariacaoOpen, setAddVariacaoOpen] = useState(false)
  const [editVariacao, setEditVariacao] = useState<ServicoVariacao | null>(null)
  const [deleteVariacaoId, setDeleteVariacaoId] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showImportarVariacoes, setShowImportarVariacoes] = useState(false)
  const [showImportarEtapas, setShowImportarEtapas] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: servico, isLoading } = useQuery({
    queryKey: ['servicos', id],
    queryFn: () => getServico(db, id!),
    enabled: !!id,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['etapa-templates', id],
    queryFn: () => listEtapaTemplatesByServico(db, id!),
    enabled: !!id,
  })

  const {
    data: variacoes = [],
    isLoading: isLoadingVariacoes,
    isError: isVariacoesError,
    error: variacoesError,
  } = useQuery({
    queryKey: ['servico-variacoes', id],
    queryFn: () => listVariacoesByServico(db, id!),
    enabled: !!id,
  })

  // Serviço edit form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ServicoInput>({
    resolver: zodResolver(servicoSchema),
  })
  const usaVariacoes = watch('usa_variacoes')
  const precoVariavel = watch('preco_variavel')

  useEffect(() => {
    if (servico) {
      reset({
        nome: servico.nome,
        descricao: servico.descricao ?? '',
        duracao_texto: servico.duracao_texto ?? '',
        preco_jpy: servico.usa_variacoes || servico.preco_variavel ? null : servico.preco_jpy,
        preco_variavel: servico.preco_variavel,
        preco_min_jpy: servico.preco_min_jpy,
        preco_max_jpy: servico.preco_max_jpy,
        usa_variacoes: servico.usa_variacoes,
        is_active: servico.is_active,
        ordem: servico.ordem,
      })
      setImagePreview(servico.imagem_url ?? null)
    }
  }, [servico, reset])

  const updateServicMutation = useMutation({
    mutationFn: (data: ServicoInput) =>
      updateServico(db, id!, {
        ...data,
        descricao: data.descricao || null,
        duracao_texto: data.duracao_texto || null,
        preco_jpy: data.usa_variacoes || data.preco_variavel ? null : data.preco_jpy ?? 0,
        preco_variavel: data.usa_variacoes ? false : data.preco_variavel,
        preco_min_jpy: data.usa_variacoes || !data.preco_variavel ? null : data.preco_min_jpy ?? null,
        preco_max_jpy: data.usa_variacoes || !data.preco_variavel ? null : data.preco_max_jpy ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', id] })
      queryClient.invalidateQueries({ queryKey: ['servicos', 'all'] })
    },
  })

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return

    setUploadError(null)
    setUploadSuccess(false)
    setImagePreview(URL.createObjectURL(file))
    setUploadingImage(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `imagens/servicos/${id}/imagem.${ext}`

      const publicUrl = await uploadFile(storage, path, file)

      await updateServico(db, id, { imagem_url: publicUrl })
      queryClient.invalidateQueries({ queryKey: ['servicos', id] })
      queryClient.invalidateQueries({ queryKey: ['servicos', 'all'] })
      setUploadSuccess(true)
    } catch (err) {
      console.error('Erro ao fazer upload da imagem:', err)
      const msg = (err as { message?: string })?.message ?? 'Erro desconhecido ao salvar imagem'
      setUploadError(msg)
      // Revert preview to the last saved image
      setImagePreview(servico?.imagem_url ?? null)
    } finally {
      setUploadingImage(false)
    }
  }

  const addTemplateMutation = useMutation({
    mutationFn: (data: EtapaTemplateInput) =>
      createEtapaTemplate(db, {
        servico_id: id!,
        nome: data.nome,
        descricao: data.descricao || null,
        responsavel_padrao: data.responsavel_padrao,
        variacao_ids: data.variacao_ids ?? [],
        ordem: templates.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapa-templates', id] })
      setAddError(null)
      setAddOpen(false)
    },
    onError: (err) => {
      setAddError(err instanceof Error ? err.message : String(err))
    },
  })

  const editTemplateMutation = useMutation({
    mutationFn: (data: EtapaTemplateInput) =>
      updateEtapaTemplate(db, editTemplate!.id, {
        ...data,
        descricao: data.descricao || null,
        variacao_ids: data.variacao_ids ?? [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapa-templates', id] })
      setEditError(null)
      setEditTemplate(null)
    },
    onError: (err) => {
      setEditError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (tplId: string) => deleteEtapaTemplate(db, tplId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapa-templates', id] })
      setDeleteId(null)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; ordem: number }>) =>
      reorderEtapaTemplates(db, updates),
  })

  const addVariacaoMutation = useMutation({
    mutationFn: (data: ServicoVariacaoInput) =>
      createServicoVariacao(db, {
        servico_id: id!,
        nome: data.nome,
        descricao: data.descricao || null,
        preco_jpy: data.preco_variavel ? null : data.preco_jpy ?? 0,
        preco_variavel: data.preco_variavel,
        preco_min_jpy: data.preco_variavel ? data.preco_min_jpy ?? null : null,
        preco_max_jpy: data.preco_variavel ? data.preco_max_jpy ?? null : null,
        duracao_texto: data.duracao_texto || null,
        ativo: data.ativo,
        ordem: variacoes.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servico-variacoes', id] })
      setAddVariacaoOpen(false)
    },
  })

  const editVariacaoMutation = useMutation({
    mutationFn: (data: ServicoVariacaoInput) =>
      updateServicoVariacao(db, editVariacao!.id, {
        nome: data.nome,
        descricao: data.descricao || null,
        preco_jpy: data.preco_variavel ? null : data.preco_jpy ?? 0,
        preco_variavel: data.preco_variavel,
        preco_min_jpy: data.preco_variavel ? data.preco_min_jpy ?? null : null,
        preco_max_jpy: data.preco_variavel ? data.preco_max_jpy ?? null : null,
        duracao_texto: data.duracao_texto || null,
        ativo: data.ativo,
        ordem: data.ordem,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servico-variacoes', id] })
      setEditVariacao(null)
    },
  })

  const toggleVariacaoMutation = useMutation({
    mutationFn: (variacao: ServicoVariacao) => toggleServicoVariacaoStatus(db, variacao.id, !variacao.ativo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['servico-variacoes', id] }),
  })

  const deleteVariacaoMutation = useMutation({
    mutationFn: (variacaoId: string) => deleteServicoVariacao(db, variacaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servico-variacoes', id] })
      setDeleteVariacaoId(null)
    },
  })

  const reorderVariacoesMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; ordem: number }>) =>
      reorderServicoVariacoes(db, updates),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = templates.findIndex((t) => t.id === active.id)
    const newIndex = templates.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(templates, oldIndex, newIndex)

    queryClient.setQueryData(
      ['etapa-templates', id],
      reordered.map((t, i) => ({ ...t, ordem: i })),
    )

    reorderMutation.mutate(reordered.map((t, i) => ({ id: t.id, ordem: i })))
  }

  function handleVariacaoDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = variacoes.findIndex((v) => v.id === active.id)
    const newIndex = variacoes.findIndex((v) => v.id === over.id)
    const reordered = arrayMove(variacoes, oldIndex, newIndex)

    queryClient.setQueryData(
      ['servico-variacoes', id],
      reordered.map((v, i) => ({ ...v, ordem: i })),
    )

    reorderVariacoesMutation.mutate(reordered.map((v, i) => ({ id: v.id, ordem: i })))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!servico) return null

  const currentImage = imagePreview

  return (
    <div>
      <PageHeader title={servico.nome} subtitle="Configurações do serviço" />

      <div className="px-8 pt-4">
        <Link
          to="/servicos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar para Serviços
        </Link>
      </div>

      <div className="p-8 space-y-6">
        {/* Dados do serviço */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) => updateServicMutation.mutate(data))}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input {...register('nome')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <textarea
                  {...register('descricao')}
                  className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Duração</Label>
                <Input
                  {...register('duracao_texto')}
                  placeholder="Ex: 2 semanas, 3 meses, 5 dias úteis"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço fixo (¥)</Label>
                {usaVariacoes || precoVariavel ? (
                  <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                    {usaVariacoes ? 'Definido nas variações' : 'Definido pela faixa'}
                  </div>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    {...register('preco_jpy', { valueAsNumber: true })}
                  />
                )}
                {usaVariacoes && (
                  <p className="text-xs text-muted-foreground">
                    Preço definido individualmente nas variações.
                  </p>
                )}
              </div>
              {!usaVariacoes && (
                <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:col-span-2">
                  <input type="checkbox" {...register('preco_variavel')} className="mt-1" />
                  <span>
                    <span className="font-medium">Preço em faixa</span>
                    <span className="block text-xs text-muted-foreground">
                      Use uma faixa de preço mínimo e máximo para o serviço.
                    </span>
                  </span>
                </label>
              )}
              {!usaVariacoes && precoVariavel && (
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Preço mínimo (¥)</Label>
                    <Input type="number" min={0} {...register('preco_min_jpy', { valueAsNumber: true })} />
                    {errors.preco_min_jpy && <p className="text-xs text-destructive">{errors.preco_min_jpy.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Preço máximo (¥)</Label>
                    <Input type="number" min={0} {...register('preco_max_jpy', { valueAsNumber: true })} />
                    {errors.preco_max_jpy && <p className="text-xs text-destructive">{errors.preco_max_jpy.message}</p>}
                  </div>
                </div>
              )}
              <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:col-span-2">
                <input type="checkbox" {...register('usa_variacoes')} className="mt-1" />
                <span>
                  <span className="font-medium">Serviço com variações</span>
                  <span className="block text-xs text-muted-foreground">
                    O processo exigirá a seleção de uma variação e usará o preço dela.
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input type="checkbox" {...register('is_active')} id="is_active" />
                <label htmlFor="is_active" className="text-sm">Ativo</label>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  isLoading={isSubmitting || updateServicMutation.isPending}
                  disabled={!isDirty}
                >
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {servico.usa_variacoes && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Variações</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowImportarVariacoes(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Importar planilha
                </Button>
                <Button size="sm" onClick={() => setAddVariacaoOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Variação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingVariacoes ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : isVariacoesError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {variacoesError instanceof Error
                    ? variacoesError.message
                    : 'Não foi possível carregar as variações deste serviço.'}
                </div>
              ) : variacoes.length === 0 ? (
                <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Nenhuma variação cadastrada. Crie ao menos uma variação ativa para abrir processos deste serviço.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleVariacaoDragEnd}
                >
                  <SortableContext
                    items={variacoes.map((v) => v.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {variacoes.map((variacao) => (
                        <VariacaoCard
                          key={variacao.id}
                          variacao={variacao}
                          onEdit={setEditVariacao}
                          onToggle={(v) => toggleVariacaoMutation.mutate(v)}
                          onDelete={setDeleteVariacaoId}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        )}

        {/* Imagem do serviço */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagem do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <div
                className="relative flex h-40 w-64 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingImage ? (
                  <Spinner />
                ) : currentImage ? (
                  <img
                    src={currentImage}
                    alt="Imagem do serviço"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-10 w-10" />
                    <span className="text-xs">Nenhuma imagem</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={uploadingImage}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {currentImage ? 'Trocar imagem' : 'Carregar imagem'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recomendado: JPG ou PNG, proporção 16:9
                </p>
                {uploadSuccess && (
                  <p className="text-xs text-green-600">Imagem salva com sucesso!</p>
                )}
                {uploadError && (
                  <p className="text-xs text-destructive max-w-[200px]">{uploadError}</p>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </CardContent>
        </Card>

        {/* Etapas padrão (templates) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Etapas Padrão</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowImportarEtapas(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Importar planilha
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Etapa Padrão
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                Nenhuma etapa padrão. Clique em "Adicionar" para criar templates de etapas para este serviço.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={templates.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {templates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        variacoes={variacoes}
                        onEdit={setEditTemplate}
                        onDelete={setDeleteId}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Template Dialog */}
      <Dialog open={addOpen} onOpenChange={(o: boolean) => { setAddOpen(o); if (!o) setAddError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etapa Padrão</DialogTitle>
          </DialogHeader>
          {addError && <p className="text-xs text-destructive px-1">{addError}</p>}
          <TemplateForm
            variacoes={variacoes}
            onSubmit={(data) => addTemplateMutation.mutate(data)}
            isLoading={addTemplateMutation.isPending}
            onCancel={() => { setAddOpen(false); setAddError(null) }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addVariacaoOpen} onOpenChange={setAddVariacaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Variação</DialogTitle>
          </DialogHeader>
          <VariacaoForm
            onSubmit={(data) => addVariacaoMutation.mutate(data)}
            isLoading={addVariacaoMutation.isPending}
            onCancel={() => setAddVariacaoOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVariacao} onOpenChange={(o: boolean) => !o && setEditVariacao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Variação</DialogTitle>
          </DialogHeader>
          {editVariacao && (
            <VariacaoForm
              defaultValues={{
                nome: editVariacao.nome,
                descricao: editVariacao.descricao ?? '',
                preco_jpy: editVariacao.preco_variavel ? null : editVariacao.preco_jpy,
                preco_variavel: editVariacao.preco_variavel,
                preco_min_jpy: editVariacao.preco_min_jpy,
                preco_max_jpy: editVariacao.preco_max_jpy,
                duracao_texto: editVariacao.duracao_texto ?? '',
                ativo: editVariacao.ativo,
                ordem: editVariacao.ordem,
              }}
              onSubmit={(data) => editVariacaoMutation.mutate(data)}
              isLoading={editVariacaoMutation.isPending}
              onCancel={() => setEditVariacao(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteVariacaoId} onOpenChange={(o: boolean) => !o && setDeleteVariacaoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja remover esta variação?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVariacaoId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteVariacaoMutation.isPending}
              onClick={() => deleteVariacaoId && deleteVariacaoMutation.mutate(deleteVariacaoId)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(o: boolean) => { if (!o) { setEditTemplate(null); setEditError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Etapa Padrão</DialogTitle>
          </DialogHeader>
          {editError && <p className="text-xs text-destructive px-1">{editError}</p>}
          {editTemplate && (
            <TemplateForm
              defaultValues={{
                nome: editTemplate.nome,
                descricao: editTemplate.descricao ?? '',
                responsavel_padrao: editTemplate.responsavel_padrao,
                variacao_ids: editTemplate.variacao_ids,
                ordem: editTemplate.ordem,
              }}
              variacoes={variacoes}
              onSubmit={(data) => editTemplateMutation.mutate(data)}
              isLoading={editTemplateMutation.isPending}
              onCancel={() => { setEditTemplate(null); setEditError(null) }}
            />
          )}
        </DialogContent>
      </Dialog>

      {showImportarVariacoes && id && (
        <ImportarVariacoesDialog
          servicoId={id}
          baseOrdem={variacoes.length}
          onClose={() => setShowImportarVariacoes(false)}
        />
      )}

      {showImportarEtapas && id && (
        <ImportarEtapasDialog
          servicoId={id}
          variacoes={variacoes}
          baseOrdem={templates.length}
          onClose={() => setShowImportarEtapas(false)}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja remover esta etapa padrão?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteTemplateMutation.isPending}
              onClick={() => deleteId && deleteTemplateMutation.mutate(deleteId)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
