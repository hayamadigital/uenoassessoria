import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  Plus,
  LayoutList,
  LayoutGrid,
  ImageIcon,
  Upload,
  Download,
  FileSpreadsheet,
  CircleCheck,
  CircleX,
  Tags,
  Power,
  Search,
  Trash2,
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
import { listServicos, createServico, toggleServicoStatus, deleteServico } from '@ueno/firebase/queries/servicos'
import { createServicoVariacao } from '@ueno/firebase/queries/servico_variacoes'
import { servicoSchema, type ServicoInput } from '@ueno/utils/validators'
import type { Servico, ServicoInsert, ServicoVariacaoInsert } from '@ueno/firebase'
import { includesText, isWithinDateRange, matchesActiveFilter, nextSort, sortBy, type ActiveFilter, type SortState } from '@/utils/table'

type ViewMode = 'table' | 'cards'

const SERVICO_CSV_HEADERS = [
  'tipo',
  'codigo',
  'servico_codigo',
  'nome',
  'descricao',
  'duracao_texto',
  'modelo_preco',
  'preco_jpy',
  'preco_min_jpy',
  'preco_max_jpy',
  'imagem_url',
  'ativo',
  'ordem',
] as const

const SERVICO_COLUMN_DESCRIPTIONS: Record<
  (typeof SERVICO_CSV_HEADERS)[number],
  { obrigatorio: boolean; descricao: string; exemplo: string }
> = {
  tipo: { obrigatorio: true, descricao: 'Use servico ou variacao', exemplo: 'servico' },
  codigo: { obrigatorio: false, descricao: 'Código único para referenciar um serviço dentro do CSV', exemplo: 'transferencia-habilitacao' },
  servico_codigo: { obrigatorio: false, descricao: 'Para variações, código do serviço pai', exemplo: 'transferencia-habilitacao' },
  nome: { obrigatorio: true, descricao: 'Nome do serviço exibido no catálogo', exemplo: 'CNH Categoria B' },
  descricao: { obrigatorio: false, descricao: 'Descrição, requisito ou condição', exemplo: 'Acompanhamento completo para transferência da CNH.' },
  duracao_texto: { obrigatorio: false, descricao: 'Texto livre de duração', exemplo: '14 dias' },
  modelo_preco: { obrigatorio: true, descricao: 'Use fixo, faixa ou variacoes', exemplo: 'fixo' },
  preco_jpy: { obrigatorio: false, descricao: 'Preço fixo em ienes, somente números', exemplo: '120000' },
  preco_min_jpy: { obrigatorio: false, descricao: 'Preço mínimo quando modelo_preco=faixa', exemplo: '90000' },
  preco_max_jpy: { obrigatorio: false, descricao: 'Preço máximo quando modelo_preco=faixa', exemplo: '150000' },
  imagem_url: { obrigatorio: false, descricao: 'URL da imagem de capa do serviço', exemplo: 'https://exemplo.com/servico.jpg' },
  ativo: { obrigatorio: false, descricao: 'Define se o serviço ou variação fica ativo', exemplo: 'true' },
  ordem: { obrigatorio: false, descricao: 'Ordem de exibição. Se vazio, entra no fim da lista', exemplo: '0' },
}

type ParsedServicoRow = {
  linha: number
  tipo: 'servico' | 'variacao'
  codigo: string
  servico_codigo: string
  servico?: ServicoInsert | undefined
  variacao?: Omit<ServicoVariacaoInsert, 'servico_id'> | undefined
  errors: string[]
}

function escapeCsvValue(value: string | number | boolean) {
  const raw = String(value)
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

function downloadServicosCsvTemplate() {
  const rows = [
    SERVICO_CSV_HEADERS,
    [
      'servico',
      'transferencia-habilitacao',
      '',
      'Transferência de Habilitação',
      'Serviço com variações por categoria.',
      '',
      'variacoes',
      '',
      '',
      '',
      '',
      'true',
      '0',
    ],
    [
      'variacao',
      '',
      'transferencia-habilitacao',
      'Carro Automático',
      'Necessário ter habilitação de carro',
      '14 dias',
      'fixo',
      '120000',
      '',
      '',
      '',
      'true',
      '1',
    ],
    [
      'variacao',
      '',
      'transferencia-habilitacao',
      'Moto 400cc',
      'Necessário ter habilitação de moto',
      '8 dias',
      'faixa',
      '',
      '90000',
      '130000',
      '',
      'true',
      '2',
    ],
    [
      'servico',
      'aula-pratica-avulsa',
      '',
      'Aula prática avulsa',
      'Treino prático com instrutor credenciado.',
      '1 hora',
      'fixo',
      '8000',
      '',
      '',
      '',
      'true',
      '3',
    ],
  ]
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-servicos.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let insideQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        insideQuotes = !insideQuotes
      }
    } else if ((char === ',' || char === ';') && !insideQuotes) {
      row.push(current)
      current = ''
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1
      row.push(current)
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }

  row.push(current)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}

function parseCsvBoolean(value: string, rowNumber: number) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  if (['true', '1', 'sim', 's', 'ativo', 'ativa'].includes(normalized)) return true
  if (['false', '0', 'nao', 'não', 'n', 'inativo', 'inativa'].includes(normalized)) return false
  throw new Error(`Linha ${rowNumber}: ativo deve ser true/false, sim/não ou 1/0.`)
}

function formatPrecoServico(servico: Pick<Servico, 'usa_variacoes' | 'preco_variavel' | 'preco_jpy' | 'preco_min_jpy' | 'preco_max_jpy'>) {
  if (servico.usa_variacoes) return 'Variações'
  if (servico.preco_variavel && servico.preco_min_jpy != null && servico.preco_max_jpy != null) {
    return `¥${servico.preco_min_jpy.toLocaleString('ja-JP')} - ¥${servico.preco_max_jpy.toLocaleString('ja-JP')}`
  }
  return servico.preco_jpy != null && servico.preco_jpy > 0
    ? `¥${servico.preco_jpy.toLocaleString('ja-JP')}`
    : '—'
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

function parseServicosCsvRows(text: string, nextOrdem: number): ParsedServicoRow[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos uma linha de serviço.')

  const headers = rows[0]!.map((header) => header.trim())
  const missingHeaders = SERVICO_CSV_HEADERS.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    throw new Error(`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}.`)
  }

  let autoOrder = nextOrdem

  const parsed = rows.slice(1).map((row, index) => {
    const rowNumber = index + 2
    const errors: string[] = []
    const record = Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() ?? '']))
    const tipoRaw = (record.tipo ?? '').toLowerCase()
    const tipo: 'servico' | 'variacao' | null =
      tipoRaw === 'variacao' || tipoRaw === 'variação'
        ? 'variacao'
        : tipoRaw === 'servico' || tipoRaw === 'serviço'
          ? 'servico'
          : null
    const codigo = record.codigo ?? ''
    const servicoCodigo = record.servico_codigo ?? ''
    const nome = record.nome ?? ''
    const descricao = record.descricao || null
    const duracaoTexto = record.duracao_texto || null
    const imagemUrl = record.imagem_url || null
    const modeloPreco = (record.modelo_preco ?? '').toLowerCase()
    const precoRaw = record.preco_jpy ?? ''
    const precoMinRaw = record.preco_min_jpy ?? ''
    const precoMaxRaw = record.preco_max_jpy ?? ''
    const ordemRaw = record.ordem ?? ''

    if (!tipo) errors.push(`Linha ${rowNumber}: tipo deve ser servico ou variacao.`)
    if (!nome) errors.push(`Linha ${rowNumber}: nome é obrigatório.`)
    else if (nome.length < 2) errors.push(`Linha ${rowNumber}: nome deve ter pelo menos 2 caracteres.`)
    if (tipo === 'servico' && !codigo) errors.push(`Linha ${rowNumber}: codigo é obrigatório para serviço.`)
    if (tipo === 'variacao' && !servicoCodigo) errors.push(`Linha ${rowNumber}: servico_codigo é obrigatório para variação.`)

    const usaVariacoes = tipo === 'servico' && modeloPreco === 'variacoes'
    const precoVariavel = modeloPreco === 'faixa'
    const precoJpy = usaVariacoes || precoVariavel ? null : parseCsvMoney(precoRaw, 'preco_jpy', rowNumber, errors)
    const precoMinJpy = precoVariavel ? parseCsvMoney(precoMinRaw, 'preco_min_jpy', rowNumber, errors) : null
    const precoMaxJpy = precoVariavel ? parseCsvMoney(precoMaxRaw, 'preco_max_jpy', rowNumber, errors) : null

    if (!['fixo', 'faixa', 'variacoes'].includes(modeloPreco)) {
      errors.push(`Linha ${rowNumber}: modelo_preco deve ser fixo, faixa ou variacoes.`)
    }
    if (tipo === 'variacao' && modeloPreco === 'variacoes') {
      errors.push(`Linha ${rowNumber}: variação não pode usar modelo_preco=variacoes.`)
    }
    if (modeloPreco === 'fixo' && precoJpy == null) errors.push(`Linha ${rowNumber}: preco_jpy é obrigatório quando modelo_preco=fixo.`)
    if (precoVariavel) {
      if (precoMinJpy == null) errors.push(`Linha ${rowNumber}: preco_min_jpy é obrigatório quando modelo_preco=faixa.`)
      if (precoMaxJpy == null) errors.push(`Linha ${rowNumber}: preco_max_jpy é obrigatório quando modelo_preco=faixa.`)
      if (precoMinJpy != null && precoMaxJpy != null && precoMaxJpy < precoMinJpy) {
        errors.push(`Linha ${rowNumber}: preco_max_jpy deve ser maior ou igual ao preco_min_jpy.`)
      }
    }

    let ordem = autoOrder
    if (ordemRaw) {
      const parsed = Number(ordemRaw)
      if (!Number.isInteger(parsed) || parsed < 0) {
        errors.push(`Linha ${rowNumber}: ordem deve ser um número inteiro maior ou igual a 0.`)
      } else {
        ordem = parsed
      }
    } else {
      autoOrder += 1
    }

    let isActive = true
    try {
      isActive = parseCsvBoolean(record.ativo ?? '', rowNumber)
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }

    const commonPrice = {
      preco_jpy: precoJpy ?? 0,
      preco_variavel: precoVariavel,
      preco_min_jpy: precoMinJpy,
      preco_max_jpy: precoMaxJpy,
    }

    return {
      linha: rowNumber,
      tipo: tipo ?? 'servico',
      codigo,
      servico_codigo: servicoCodigo,
      servico: tipo === 'servico' ? {
        nome,
        descricao,
        duracao_texto: duracaoTexto,
        ...commonPrice,
        usa_variacoes: usaVariacoes,
        imagem_url: imagemUrl,
        is_active: isActive,
        ordem,
      } : undefined,
      variacao: tipo === 'variacao' ? {
        nome,
        descricao,
        duracao_texto: duracaoTexto,
        ...commonPrice,
        ativo: isActive,
        is_active: isActive,
        usa_variacoes: false,
        ordem,
      } : undefined,
      errors,
    }
  })

  const serviceCodes = new Set(
    parsed
      .filter((row) => row.tipo === 'servico' && row.errors.length === 0)
      .map((row) => row.codigo),
  )

  parsed.forEach((row) => {
    if (row.tipo === 'variacao' && !serviceCodes.has(row.servico_codigo)) {
      row.errors.push(`Linha ${row.linha}: servico_codigo não corresponde a nenhum serviço válido no CSV.`)
    }
  })

  return parsed
}

// ── Novo Serviço Form ─────────────────────────────────────────
function NovoServicoForm({
  onSubmit,
  isLoading,
  onCancel,
  nextOrdem,
}: {
  onSubmit: (data: ServicoInput) => void
  isLoading: boolean
  onCancel: () => void
  nextOrdem: number
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ServicoInput>({
    resolver: zodResolver(servicoSchema),
    defaultValues: {
      is_active: true,
      usa_variacoes: false,
      preco_variavel: false,
      preco_jpy: 0,
      preco_min_jpy: null,
      preco_max_jpy: null,
      ordem: nextOrdem,
    },
  })
  const usaVariacoes = watch('usa_variacoes')
  const precoVariavel = watch('preco_variavel')

  return (
    <form id="novo-servico-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Nome <span className="text-destructive">*</span></Label>
        <Input {...register('nome')} placeholder="Ex: CNH Categoria B" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <textarea
          {...register('descricao')}
          placeholder="Descrição do serviço..."
          className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duração</Label>
          <Input
            {...register('duracao_texto')}
            placeholder="Ex: 3 meses, 2 semanas"
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
          {errors.preco_jpy && <p className="text-xs text-destructive">{errors.preco_jpy.message}</p>}
        </div>
      </div>
      {!usaVariacoes && (
        <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm">
          <input type="checkbox" {...register('preco_variavel')} className="mt-1" />
          <span>
            <span className="font-medium">Preço em faixa</span>
            <span className="block text-xs text-muted-foreground">
              Use uma faixa de preço mínimo e máximo.
            </span>
          </span>
        </label>
      )}
      {!usaVariacoes && precoVariavel && (
        <div className="grid grid-cols-2 gap-4">
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
      <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm">
        <input type="checkbox" {...register('usa_variacoes')} className="mt-1" />
        <span>
            <span className="font-medium">Serviço com variações</span>
          <span className="block text-xs text-muted-foreground">
            O preço e a duração serão definidos nas variações cadastradas.
          </span>
        </span>
      </label>
      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('is_active')} id="novo-is-active" defaultChecked />
        <label htmlFor="novo-is-active" className="text-sm">Ativo</label>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="novo-servico-form" isLoading={isLoading}>
          Criar Serviço
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Card de serviço ───────────────────────────────────────────
function ServicoCard({
  servico,
  onToggle,
  onDelete,
}: {
  servico: Servico
  onToggle: (s: Servico) => void
  onDelete: (s: Servico) => void
}) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col">
      <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
        {servico.imagem_url ? (
          <img
            src={servico.imagem_url}
            alt={servico.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={servico.is_active ? 'success' : 'outline'}>
            {servico.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-sm leading-tight">{servico.nome}</h3>
        {servico.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{servico.descricao}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {servico.duracao_texto && (
            <span>Duração: {servico.duracao_texto}</span>
          )}
          {servico.usa_variacoes ? (
            <span className="inline-flex items-center gap-1">
              <Tags className="h-3 w-3" />
              Variações
            </span>
          ) : (
            <span>{formatPrecoServico(servico)}</span>
          )}
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <Link to={`/servicos/${servico.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          title={servico.is_active ? 'Desativar' : 'Ativar'}
          onClick={() => onToggle(servico)}
        >
          <Power className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          title={servico.is_active ? 'Desative antes de remover' : 'Remover'}
          disabled={servico.is_active}
          onClick={() => onDelete(servico)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

// ── Dialog: Importar Planilha ─────────────────────────────────
function ImportarServicosDialog({
  nextOrdem,
  onClose,
}: {
  nextOrdem: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'instrucoes' | 'importar'>('instrucoes')
  const [rows, setRows] = useState<ParsedServicoRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; erros: number } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const validRows = rows.filter((row) => row.errors.length === 0)
  const invalidRows = rows.filter((row) => row.errors.length > 0)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFileName(file.name)
    setImportResult(null)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      try {
        const text = String(readerEvent.target?.result ?? '')
        setRows(parseServicosCsvRows(text, nextOrdem))
      } catch (err) {
        setRows([])
        setParseError(err instanceof Error ? err.message : String(err))
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    setImporting(true)
    let ok = 0
    let erros = 0
    const servicosPorCodigo = new Map<string, string>()

    for (const row of validRows.filter((item) => item.tipo === 'servico')) {
      try {
        if (!row.servico) throw new Error('Serviço inválido')
        const created = await createServico(db, row.servico)
        servicosPorCodigo.set(row.codigo, created.id)
        ok += 1
      } catch {
        erros += 1
      }
    }

    for (const row of validRows.filter((item) => item.tipo === 'variacao')) {
      try {
        if (!row.variacao) throw new Error('Variação inválida')
        const servicoId = servicosPorCodigo.get(row.servico_codigo)
        if (!servicoId) throw new Error('Serviço pai não importado')
        await createServicoVariacao(db, { ...row.variacao, servico_id: servicoId })
        ok += 1
      } catch {
        erros += 1
      }
    }

    queryClient.invalidateQueries({ queryKey: ['servicos', 'all'] })
    setImportResult({ ok, erros })
    setImporting(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar serviços por planilha
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
                <Button variant="outline" size="sm" onClick={downloadServicosCsvTemplate} className="shrink-0">
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
                    {SERVICO_CSV_HEADERS.map((column) => {
                      const info = SERVICO_COLUMN_DESCRIPTIONS[column]
                      return (
                        <tr key={column} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs bg-muted/20">{column}</td>
                          <td className="px-3 py-2">
                            {info.obrigatorio ? (
                              <span className="text-destructive font-medium">Sim</span>
                            ) : (
                              <span className="text-muted-foreground">Não</span>
                            )}
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
                  <li>Use <code className="bg-muted px-1 rounded text-xs">tipo=servico</code> para serviços pais e <code className="bg-muted px-1 rounded text-xs">tipo=variacao</code> para variações.</li>
                  <li>Para ligar variações ao serviço, preencha <code className="bg-muted px-1 rounded text-xs">codigo</code> no serviço e o mesmo valor em <code className="bg-muted px-1 rounded text-xs">servico_codigo</code> nas variações.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">modelo_preco</code> aceita <code className="bg-muted px-1 rounded text-xs">fixo</code>, <code className="bg-muted px-1 rounded text-xs">faixa</code> ou <code className="bg-muted px-1 rounded text-xs">variacoes</code>. Use <code className="bg-muted px-1 rounded text-xs">variacoes</code> somente em linhas de serviço.</li>
                  <li>Para <code className="bg-muted px-1 rounded text-xs">fixo</code>, preencha <code className="bg-muted px-1 rounded text-xs">preco_jpy</code>. Para <code className="bg-muted px-1 rounded text-xs">faixa</code>, preencha <code className="bg-muted px-1 rounded text-xs">preco_min_jpy</code> e <code className="bg-muted px-1 rounded text-xs">preco_max_jpy</code>.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">ativo</code> aceita <code className="bg-muted px-1 rounded text-xs">true/false</code>, <code className="bg-muted px-1 rounded text-xs">sim/não</code> ou <code className="bg-muted px-1 rounded text-xs">1/0</code>.</li>
                  <li>Se <code className="bg-muted px-1 rounded text-xs">ordem</code> ficar vazio, o registro será adicionado no fim da lista.</li>
                  <li>Salve o arquivo com codificação <strong>UTF-8</strong> para preservar acentuação.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed border-input px-6 py-8 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
                <Upload className="h-8 w-8 opacity-40" />
                {fileName ? (
                  <span className="font-medium text-foreground">{fileName}</span>
                ) : (
                  <span>Clique para selecionar o arquivo CSV</span>
                )}
                <span className="text-xs">Apenas arquivos .csv</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
              </label>

              {parseError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <p className="whitespace-pre-line">{parseError}</p>
                </div>
              )}

              {importResult && (
                <div className="rounded-md border p-3 flex items-center gap-3 text-sm">
                  <CircleCheck className="h-5 w-5 text-green-600 shrink-0" />
                  <span>
                    <strong>{importResult.ok}</strong> registro(s) importado(s) com sucesso.
                    {importResult.erros > 0 && (
                      <span className="text-destructive ml-2">{importResult.erros} falha(s).</span>
                    )}
                  </span>
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
                          <th className="px-3 py-2 text-left font-medium">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium">Nome</th>
                          <th className="px-3 py-2 text-left font-medium">Preço</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Validação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((row) => (
                          <tr
                            key={row.linha}
                            className={row.errors.length === 0 ? 'hover:bg-muted/20' : 'bg-destructive/5'}
                          >
                            <td className="px-3 py-2 text-muted-foreground">{row.linha}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.tipo === 'servico' ? 'Serviço' : 'Variação'}
                            </td>
                            <td className="px-3 py-2 max-w-xs">
                              <span className="line-clamp-1">{row.servico?.nome ?? row.variacao?.nome ?? '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.tipo === 'servico' && row.servico
                                ? formatPrecoServico(row.servico)
                                : row.variacao?.preco_variavel && row.variacao.preco_min_jpy != null && row.variacao.preco_max_jpy != null
                                  ? `¥${row.variacao.preco_min_jpy.toLocaleString('ja-JP')} - ¥${row.variacao.preco_max_jpy.toLocaleString('ja-JP')}`
                                  : row.variacao?.preco_jpy != null
                                    ? `¥${row.variacao.preco_jpy.toLocaleString('ja-JP')}`
                                    : '—'}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.servico?.is_active ?? row.variacao?.ativo ? 'Ativo' : 'Inativo'}
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
              Importar {validRows.length > 0 ? `${validRows.length} registro(s)` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────
export function ServicosPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [showImportar, setShowImportar] = useState(false)
  const [view, setView] = useState<ViewMode>('table')
  const [busca, setBusca] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sort, setSort] = useState<SortState<'ordem' | 'nome' | 'duracao' | 'preco' | 'status' | 'created_at'>>({
    key: 'ordem',
    direction: 'asc',
  })
  const [deleteConfirmServico, setDeleteConfirmServico] = useState<Servico | null>(null)

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos', 'all'],
    queryFn: () => listServicos(db, false),
  })

  const nextOrdem =
    servicos && servicos.length > 0
      ? Math.max(...servicos.map((servico) => servico.ordem)) + 1
      : 0

  const servicosFiltrados = useMemo(() => {
    const rows = (servicos ?? []).filter((servico) => {
      if (!matchesActiveFilter(servico.is_active, activeFilter)) return false
      if (!includesText(
        [servico.nome, servico.descricao, servico.duracao_texto, servico.is_active ? 'ativo' : 'inativo'].join(' '),
        busca,
      )) return false
      return isWithinDateRange(servico.created_at, createdFrom, createdTo)
    })

    return sortBy(rows, sort, {
      ordem: (servico) => servico.ordem,
      nome: (servico) => servico.nome,
      duracao: (servico) => servico.duracao_texto,
      preco: (servico) => servico.preco_jpy ?? servico.preco_min_jpy ?? 0,
      status: (servico) => servico.is_active,
      created_at: (servico) => servico.created_at,
    })
  }, [activeFilter, busca, createdFrom, createdTo, servicos, sort])

  const toggleMutation = useMutation({
    mutationFn: (s: Servico) => toggleServicoStatus(db, s.id, !s.is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['servicos', 'all'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteServico(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'all'] })
      setDeleteConfirmServico(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: ServicoInput) =>
      createServico(db, {
        nome: data.nome,
        descricao: data.descricao || null,
        duracao_texto: data.duracao_texto || null,
        preco_jpy: data.usa_variacoes || data.preco_variavel ? 0 : data.preco_jpy ?? 0,
        preco_variavel: data.usa_variacoes ? false : data.preco_variavel,
        preco_min_jpy: data.usa_variacoes || !data.preco_variavel ? null : data.preco_min_jpy ?? null,
        preco_max_jpy: data.usa_variacoes || !data.preco_variavel ? null : data.preco_max_jpy ?? null,
        usa_variacoes: data.usa_variacoes,
        imagem_url: null,
        is_active: data.is_active,
        ordem: data.ordem,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'all'] })
      setCreateOpen(false)
    },
  })

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={`${servicosFiltrados.length} serviço(s) exibido(s)`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none border-r"
                onClick={() => setView('table')}
                title="Visualização em tabela"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'cards' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setView('cards')}
                title="Visualização em cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowImportar(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar planilha
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição ou duração..."
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Ativos e inativos</option>
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

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : view === 'table' ? (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <SortableTh sort={sort} sortKey="nome" onSort={(key) => setSort(nextSort(sort, key))}>Nome</SortableTh>
                  <SortableTh sort={sort} sortKey="duracao" onSort={(key) => setSort(nextSort(sort, key))}>Duração</SortableTh>
                  <SortableTh sort={sort} sortKey="preco" onSort={(key) => setSort(nextSort(sort, key))}>Preço (¥)</SortableTh>
                  <SortableTh sort={sort} sortKey="status" onSort={(key) => setSort(nextSort(sort, key))}>Status</SortableTh>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {servicosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum serviço cadastrado.
                    </td>
                  </tr>
                ) : null}
                {servicosFiltrados.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{s.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.duracao_texto || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.usa_variacoes
                        ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Tags className="h-3 w-3" />
                            Variações
                          </span>
                        )
                        : formatPrecoServico(s)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'success' : 'outline'}>
                        {s.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link to={`/servicos/${s.id}`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="mr-2 h-4 w-4" />
                            Configurar
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={s.is_active ? 'Desativar' : 'Ativar'}
                          isLoading={toggleMutation.isPending && toggleMutation.variables?.id === s.id}
                          onClick={() => toggleMutation.mutate(s)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={s.is_active ? 'Desative antes de remover' : 'Remover'}
                          disabled={s.is_active}
                          onClick={() => setDeleteConfirmServico(s)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {servicosFiltrados.length === 0 ? (
              <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
                Nenhum serviço cadastrado.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {servicosFiltrados.map((s) => (
                  <ServicoCard
                    key={s.id}
                    servico={s}
                    onToggle={(sv) => toggleMutation.mutate(sv)}
                    onDelete={setDeleteConfirmServico}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Novo Serviço Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Serviço</DialogTitle>
          </DialogHeader>
          <NovoServicoForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            nextOrdem={nextOrdem}
          />
        </DialogContent>
      </Dialog>

      {showImportar && (
        <ImportarServicosDialog nextOrdem={nextOrdem} onClose={() => setShowImportar(false)} />
      )}

      <Dialog
        open={!!deleteConfirmServico}
        onOpenChange={(o: boolean) => { if (!o) setDeleteConfirmServico(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja remover o serviço <strong>{deleteConfirmServico?.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmServico(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteConfirmServico && deleteMutation.mutate(deleteConfirmServico.id)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
