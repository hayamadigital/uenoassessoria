import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HelpCircle, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical,
  Car, FileText, Calendar, Clock, MapPin, CreditCard, Users, Shield,
  BookOpen, CheckCircle, AlertCircle, Info, Phone, Mail, Globe, Star,
  Briefcase, Building, Flag, Award, ClipboardList, MessageCircle, Lock,
  Camera, Download, Landmark, Lightbulb, Navigation, Clipboard, Upload,
  FileSpreadsheet, CircleCheck, CircleX, Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { listFaqs, createFaq, updateFaq, deleteFaq } from '@ueno/firebase/queries/faq'
import type { FAQ, FAQInsert } from '@ueno/firebase'
import { includesText, isWithinDateRange, matchesActiveFilter, nextSort, sortBy, type ActiveFilter, type SortState } from '@/utils/table'

// ── Ícones disponíveis ────────────────────────────────────────
const ICON_LIST: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: 'HelpCircle',    label: 'Dúvida',         Icon: HelpCircle },
  { name: 'Car',           label: 'Carro',           Icon: Car },
  { name: 'FileText',      label: 'Documento',       Icon: FileText },
  { name: 'Calendar',      label: 'Calendário',      Icon: Calendar },
  { name: 'Clock',         label: 'Prazo',           Icon: Clock },
  { name: 'MapPin',        label: 'Local',           Icon: MapPin },
  { name: 'Navigation',    label: 'Navegação',       Icon: Navigation },
  { name: 'CreditCard',    label: 'Pagamento',       Icon: CreditCard },
  { name: 'Users',         label: 'Pessoas',         Icon: Users },
  { name: 'Shield',        label: 'Segurança',       Icon: Shield },
  { name: 'BookOpen',      label: 'Estudo',          Icon: BookOpen },
  { name: 'CheckCircle',   label: 'Concluído',       Icon: CheckCircle },
  { name: 'AlertCircle',   label: 'Atenção',         Icon: AlertCircle },
  { name: 'Info',          label: 'Informação',      Icon: Info },
  { name: 'Phone',         label: 'Telefone',        Icon: Phone },
  { name: 'Mail',          label: 'E-mail',          Icon: Mail },
  { name: 'Globe',         label: 'Internacional',   Icon: Globe },
  { name: 'Star',          label: 'Destaque',        Icon: Star },
  { name: 'Briefcase',     label: 'Serviço',         Icon: Briefcase },
  { name: 'Building',      label: 'Departamento',    Icon: Building },
  { name: 'Landmark',      label: 'Órgão público',   Icon: Landmark },
  { name: 'Flag',          label: 'Processo',        Icon: Flag },
  { name: 'Award',         label: 'Aprovação',       Icon: Award },
  { name: 'ClipboardList', label: 'Lista',           Icon: ClipboardList },
  { name: 'Clipboard',     label: 'Formulário',      Icon: Clipboard },
  { name: 'MessageCircle', label: 'Mensagem',        Icon: MessageCircle },
  { name: 'Lock',          label: 'Acesso',          Icon: Lock },
  { name: 'Camera',        label: 'Foto',            Icon: Camera },
  { name: 'Download',      label: 'Download',        Icon: Download },
  { name: 'Lightbulb',     label: 'Dica',            Icon: Lightbulb },
]

const DEFAULT_ICON = 'HelpCircle'
const DEFAULT_COLOR = '#6B46C1'

function getIconComponent(name: string): LucideIcon {
  return ICON_LIST.find((i) => i.name === name)?.Icon ?? HelpCircle
}

// ── Paleta de cores ───────────────────────────────────────────
const COLOR_PALETTE: string[] = [
  '#6B46C1', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#F97316', '#06B6D4',
  '#8B5CF6', '#14B8A6', '#84CC16', '#6366F1',
]

function normalizeHexColor(color?: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color ?? '') ? color! : DEFAULT_COLOR
}

function hexToRgba(hex: string, alpha: number) {
  const safeHex = normalizeHexColor(hex)
  const r = parseInt(safeHex.slice(1, 3), 16)
  const g = parseInt(safeHex.slice(3, 5), 16)
  const b = parseInt(safeHex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const FAQ_CSV_HEADERS = ['pergunta', 'resposta', 'icone', 'cor_icone', 'is_active', 'ordem'] as const

const FAQ_COLUMN_DESCRIPTIONS: Record<
  (typeof FAQ_CSV_HEADERS)[number],
  { obrigatorio: boolean; descricao: string; exemplo: string }
> = {
  pergunta: { obrigatorio: true, descricao: 'Texto da pergunta exibida no FAQ', exemplo: 'Como agendar uma aula prática?' },
  resposta: { obrigatorio: true, descricao: 'Resposta completa para o cliente', exemplo: 'Acesse o app, vá em Agenda e selecione um horário disponível.' },
  icone: { obrigatorio: false, descricao: 'Nome do ícone Lucide disponível na tela', exemplo: 'Calendar' },
  cor_icone: { obrigatorio: false, descricao: 'Cor do ícone em hexadecimal', exemplo: '#3B82F6' },
  is_active: { obrigatorio: false, descricao: 'Define se a pergunta será publicada', exemplo: 'true' },
  ordem: { obrigatorio: false, descricao: 'Ordem de exibição. Se vazio, entra no fim da lista', exemplo: '0' },
}

type ParsedFaqRow = FAQInsert & {
  linha: number
  errors: string[]
}

function escapeCsvValue(value: string | number | boolean) {
  const raw = String(value)
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

function buildFaqCsvTemplate() {
  const rows = [
    FAQ_CSV_HEADERS,
    [
      'Como agendar uma aula prática?',
      'Acesse o app, vá em Agenda e selecione um horário disponível.',
      'Calendar',
      '#3B82F6',
      'true',
      '0',
    ],
    [
      'Quais documentos são necessários?',
      'Passaporte válido, Residence Card e documentos do processo.',
      'FileText',
      '#10B981',
      'true',
      '1',
    ],
  ]

  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')
}

function downloadFaqCsvTemplate() {
  const blob = new Blob([`\uFEFF${buildFaqCsvTemplate()}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-faq.csv'
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
  if (['true', '1', 'sim', 's', 'publicada', 'ativo', 'ativa'].includes(normalized)) return true
  if (['false', '0', 'nao', 'não', 'n', 'inativa', 'inativo', 'rascunho'].includes(normalized)) return false
  throw new Error(`Linha ${rowNumber}: is_active deve ser true/false, sim/não ou 1/0.`)
}

function parseFaqCsv(text: string, nextOrdem: number): FAQInsert[] {
  const rows = parseFaqCsvRows(text, nextOrdem)
  const errors = rows.flatMap((row) => row.errors)
  if (errors.length > 0) throw new Error(errors.slice(0, 8).join('\n'))
  return rows.map(({ linha: _linha, errors: _errors, ...item }) => item)
}

function parseFaqCsvRows(text: string, nextOrdem: number): ParsedFaqRow[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos uma linha de FAQ.')

  const headers = rows[0]!.map((header) => header.trim())
  const missingHeaders = FAQ_CSV_HEADERS.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    throw new Error(`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}.`)
  }

  let autoOrder = nextOrdem
  const parsedRows: ParsedFaqRow[] = []

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2
    const errors: string[] = []
    const record = Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() ?? '']))
    const pergunta = record.pergunta ?? ''
    const resposta = record.resposta ?? ''
    const icone = record.icone || DEFAULT_ICON
    const corIcone = normalizeHexColor(record.cor_icone)
    const ordemRaw = record.ordem ?? ''

    if (!pergunta) errors.push(`Linha ${rowNumber}: pergunta é obrigatória.`)
    if (!resposta) errors.push(`Linha ${rowNumber}: resposta é obrigatória.`)
    if (!ICON_LIST.some((item) => item.name === icone)) {
      errors.push(`Linha ${rowNumber}: ícone "${icone}" não existe. Use um nome da lista de ícones da tela.`)
    }
    if (record.cor_icone && corIcone !== record.cor_icone) {
      errors.push(`Linha ${rowNumber}: cor_icone deve estar no formato #RRGGBB.`)
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
      isActive = parseCsvBoolean(record.is_active ?? '', rowNumber)
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }

    parsedRows.push({
      linha: rowNumber,
      pergunta,
      resposta,
      icone,
      cor_icone: corIcone,
      is_active: isActive,
      ordem,
      errors,
    })
  })

  return parsedRows
}

// ── Seletor de cor ────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          className="h-7 w-7 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: cor,
            outline: value === cor ? `3px solid ${cor}` : '2px solid transparent',
            outlineOffset: '2px',
          }}
          title={cor}
        />
      ))}
    </div>
  )
}

// ── Seletor de ícone ──────────────────────────────────────────
function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (n: string) => void }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? ICON_LIST.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : ICON_LIST

  const selected = ICON_LIST.find((i) => i.name === value)

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      {/* Busca */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
          fill="none" stroke="currentColor" strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ícone..."
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Grid com scroll */}
      <div className="max-h-48 overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum ícone encontrado.</p>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filtered.map(({ name, label, Icon }) => {
              const isSelected = value === name
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  title={label}
                  className="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-background"
                  style={
                    isSelected
                      ? {
                          backgroundColor: hexToRgba(color, 0.15),
                          boxShadow: `0 0 0 2px ${color}`,
                        }
                      : {}
                  }
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    style={{ color: isSelected ? color : 'currentColor' }}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Ícone selecionado */}
      {selected && (
        <div className="flex items-center gap-2 border-t pt-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: hexToRgba(color, 0.15) }}
          >
            <selected.Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-xs text-muted-foreground">
            Selecionado: <span className="font-medium text-foreground">{selected.label}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ── Ícone visual (preview do mobile) ─────────────────────────
function FaqIconPreview({ cor, icone }: { cor: string; icone: string }) {
  const Icon = getIconComponent(icone)
  const safeColor = normalizeHexColor(cor)
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: hexToRgba(safeColor, 0.15) }}
    >
      <Icon className="h-5 w-5" style={{ color: safeColor }} />
    </div>
  )
}

// ── Dialog de criar/editar ────────────────────────────────────
function FaqDialog({
  faq,
  nextOrdem,
  onClose,
}: {
  faq?: FAQ
  nextOrdem: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!faq

  const [pergunta, setPergunta] = useState(faq?.pergunta ?? '')
  const [resposta, setResposta] = useState(faq?.resposta ?? '')
  const [corIcone, setCorIcone] = useState(faq?.cor_icone ?? DEFAULT_COLOR)
  const [icone, setIcone] = useState(faq?.icone ?? DEFAULT_ICON)
  const [isActive, setIsActive] = useState(faq?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (!pergunta.trim()) throw new Error('Pergunta é obrigatória')
      if (!resposta.trim()) throw new Error('Resposta é obrigatória')
      const payload = {
        pergunta: pergunta.trim(),
        resposta: resposta.trim(),
        cor_icone: corIcone,
        icone,
        is_active: isActive,
        ordem: faq?.ordem ?? nextOrdem,
      }
      return isEdit ? updateFaq(db, faq!.id, payload) : createFaq(db, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  })

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar Pergunta' : 'Nova Pergunta'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Preview */}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
          <FaqIconPreview cor={corIcone} icone={icone} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-foreground">
              {pergunta || 'Prévia da pergunta'}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {resposta || 'Prévia da resposta...'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pergunta <span className="text-destructive">*</span></Label>
          <Input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex: Como agendar uma aula prática?"
          />
        </div>

        <div className="space-y-2">
          <Label>Resposta <span className="text-destructive">*</span></Label>
          <textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Digite a resposta completa..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <Label>Ícone</Label>
          <IconPicker value={icone} color={corIcone} onChange={setIcone} />
        </div>

        <div className="space-y-2">
          <Label>Cor do ícone</Label>
          <ColorPicker value={corIcone} onChange={setCorIcone} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="faq-is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="faq-is-active" className="text-sm">Publicada</label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
          {isEdit ? 'Salvar' : 'Criar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ── Row da lista ──────────────────────────────────────────────
function FaqRow({
  faq,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  faq: FAQ
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  isToggling: boolean
  isDeleting: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <tr className={`hover:bg-muted/20 ${!faq.is_active ? 'opacity-50' : ''}`}>
      <td className="px-3 py-3">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </td>
      <td className="px-3 py-3">
        <FaqIconPreview cor={faq.cor_icone} icone={faq.icone ?? DEFAULT_ICON} />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium leading-snug">{faq.pergunta}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{faq.resposta}</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant={faq.is_active ? 'success' : 'outline'}>
          {faq.is_active ? 'Publicada' : 'Inativa'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            isLoading={isToggling}
            title={faq.is_active ? 'Desativar' : 'Ativar'}
          >
            {faq.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {!faq.is_active && !confirmDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              title="Deletar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-1">
              <Button variant="destructive" size="sm" onClick={onDelete} isLoading={isDeleting}>
                Confirmar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Dialog: Importar Planilha ─────────────────────────────────
function ImportarFaqDialog({
  nextOrdem,
  onClose,
}: {
  nextOrdem: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'instrucoes' | 'importar'>('instrucoes')
  const [rows, setRows] = useState<ParsedFaqRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; erros: number } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const validRows = rows.filter((row) => row.errors.length === 0)
  const invalidRows = rows.filter((row) => row.errors.length > 0)

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
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
        setRows(parseFaqCsvRows(text, nextOrdem))
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

    for (const row of validRows) {
      const { linha: _linha, errors: _errors, ...item } = row
      try {
        await createFaq(db, item)
        ok += 1
      } catch {
        erros += 1
      }
    }

    queryClient.invalidateQueries({ queryKey: ['faq'] })
    setImportResult({ ok, erros })
    setImporting(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar FAQ por planilha
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
                <Button variant="outline" size="sm" onClick={downloadFaqCsvTemplate} className="shrink-0">
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
                    {FAQ_CSV_HEADERS.map((column) => {
                      const info = FAQ_COLUMN_DESCRIPTIONS[column]
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
                  <li>A primeira linha deve conter exatamente os nomes das colunas.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">icone</code> deve usar um nome disponível no seletor da tela, como <code className="bg-muted px-1 rounded text-xs">HelpCircle</code>, <code className="bg-muted px-1 rounded text-xs">Calendar</code> ou <code className="bg-muted px-1 rounded text-xs">FileText</code>.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">cor_icone</code> deve estar no formato <code className="bg-muted px-1 rounded text-xs">#RRGGBB</code>.</li>
                  <li><code className="bg-muted px-1 rounded text-xs">is_active</code> aceita <code className="bg-muted px-1 rounded text-xs">true/false</code>, <code className="bg-muted px-1 rounded text-xs">sim/não</code> ou <code className="bg-muted px-1 rounded text-xs">1/0</code>.</li>
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
                    <strong>{importResult.ok}</strong> pergunta(s) importada(s) com sucesso.
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
                          <th className="px-3 py-2 text-left font-medium">Pergunta</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Ordem</th>
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
                            <td className="px-3 py-2 max-w-xs">
                              <span className="line-clamp-1">{row.pergunta || '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.is_active ? 'Publicada' : 'Inativa'}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{row.ordem}</td>
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
              Importar {validRows.length > 0 ? `${validRows.length} pergunta(s)` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Página principal ──────────────────────────────────────────
export function FaqPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [showImportar, setShowImportar] = useState(false)
  const [editFaq, setEditFaq] = useState<FAQ | null>(null)
  const [busca, setBusca] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sort, setSort] = useState<SortState<'ordem' | 'pergunta' | 'status' | 'created_at'>>({
    key: 'ordem',
    direction: 'asc',
  })

  const { data: faqs = [], isLoading, isError, error } = useQuery({
    queryKey: ['faq'],
    queryFn: () => listFaqs(db),
  })

  const publicadas = faqs.filter((f) => f.is_active).length
  const rascunhos = faqs.filter((f) => !f.is_active).length
  const nextOrdem = faqs.length > 0 ? Math.max(...faqs.map((f) => f.ordem)) + 1 : 0
  const faqsFiltradas = useMemo(() => {
    const rows = faqs.filter((faq) => {
      if (!matchesActiveFilter(faq.is_active, activeFilter)) return false
      if (!includesText([faq.pergunta, faq.resposta, faq.is_active ? 'publicada ativo' : 'inativa inativo'].join(' '), busca)) return false
      return isWithinDateRange(faq.created_at, createdFrom, createdTo)
    })

    return sortBy(rows, sort, {
      ordem: (faq) => faq.ordem,
      pergunta: (faq) => faq.pergunta,
      status: (faq) => faq.is_active,
      created_at: (faq) => faq.created_at,
    })
  }, [activeFilter, busca, createdFrom, createdTo, faqs, sort])

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateFaq(db, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFaq(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq'] }),
  })

  return (
    <div>
      <PageHeader
        title="Perguntas Frequentes"
        subtitle={`${publicadas} publicada(s) · ${rascunhos} inativa(s)`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowImportar(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar planilha
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por pergunta ou resposta..."
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
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
            <option value="all">Ativas e inativas</option>
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
        ) : isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-5 text-sm">
            <p className="font-medium text-destructive">Não foi possível carregar o FAQ.</p>
            <p className="mt-1 text-muted-foreground">
              {error instanceof Error ? error.message : 'Tente novamente em instantes.'}
            </p>
          </div>
        ) : faqsFiltradas.length === 0 ? (
          <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
            Nenhuma pergunta cadastrada.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="w-14 px-3 py-3" />
                  <SortableTh sort={sort} sortKey="pergunta" onSort={(key) => setSort(nextSort(sort, key))}>Pergunta</SortableTh>
                  <SortableTh sort={sort} sortKey="status" onSort={(key) => setSort(nextSort(sort, key))}>Status</SortableTh>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {faqsFiltradas.map((faq) => (
                  <FaqRow
                    key={faq.id}
                    faq={faq}
                    onEdit={() => setEditFaq(faq)}
                    onToggle={() =>
                      toggleMutation.mutate({ id: faq.id, is_active: !faq.is_active })
                    }
                    onDelete={() => deleteMutation.mutate(faq.id)}
                    isToggling={toggleMutation.isPending && toggleMutation.variables?.id === faq.id}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === faq.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen && (
          <FaqDialog nextOrdem={nextOrdem} onClose={() => setCreateOpen(false)} />
        )}
      </Dialog>

      {showImportar && (
        <ImportarFaqDialog nextOrdem={nextOrdem} onClose={() => setShowImportar(false)} />
      )}

      <Dialog open={!!editFaq} onOpenChange={(open: boolean) => { if (!open) setEditFaq(null) }}>
        {editFaq && (
          <FaqDialog faq={editFaq} nextOrdem={nextOrdem} onClose={() => setEditFaq(null)} />
        )}
      </Dialog>
    </div>
  )
}
