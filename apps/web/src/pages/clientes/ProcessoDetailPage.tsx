import { useState, useEffect } from 'react'
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
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  FileText,
  Send,
  Download,
  FilePlus,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db, storage } from '@/lib/firebase'
import { uploadFile, contratoPath } from '@ueno/firebase/storage'
import { getProcesso, updateProcesso } from '@ueno/firebase/queries/processos'
import {
  listEtapasByProcesso,
  createEtapa,
  updateEtapa,
  reorderEtapas,
  deleteEtapa,
} from '@ueno/firebase/queries/etapas'
import { listEtapaTemplatesByServico } from '@ueno/firebase/queries/etapa_templates'
import {
  listContratosByProcesso,
  listAditivosByProcesso,
  createContrato,
  updateContrato,
  enviarContrato,
  updateContratoStatus,
  updateContratoPdfUrl,
} from '@ueno/firebase/queries/contratos'
import {
  listContratoTemplatesForServico,
} from '@ueno/firebase/queries/contrato_templates'
import { processoSchema, etapaSchema, type ProcessoInput, type EtapaInput } from '@ueno/utils/validators'
import { formatDateJST } from '@ueno/utils/date'
import { useAuthStore } from '@/stores/auth.store'
import type {
  ProcessoEtapa,
  StatusClienteProcesso,
  StatusProcessoEtapa,
  ResponsavelEtapa,
  Contrato,
  StatusContrato,
} from '@ueno/firebase'

const statusEtapaLabel: Record<StatusProcessoEtapa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
}

const statusEtapaVariant: Record<
  StatusProcessoEtapa,
  'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'
> = {
  pendente: 'secondary',
  em_andamento: 'default',
  concluido: 'success',
  atrasado: 'destructive',
}

const responsavelLabel: Record<ResponsavelEtapa, string> = {
  cliente: 'Cliente',
  assessoria: 'Assessoria',
  menkyocenter: 'Menkyo Center',
  outros: 'Outros',
}

const statusProcessoLabel: Record<StatusClienteProcesso, string> = {
  ativo: 'Ativo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

// ── Sortable etapa card ──────────────────────────────────────
function EtapaCard({
  etapa,
  onEdit,
  onDelete,
}: {
  etapa: ProcessoEtapa
  onEdit: (e: ProcessoEtapa) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: etapa.id })

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
        className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Arrastar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{etapa.nome}</span>
          <Badge variant={statusEtapaVariant[etapa.status]}>
            {statusEtapaLabel[etapa.status]}
          </Badge>
          <Badge variant="outline">{responsavelLabel[etapa.responsavel]}</Badge>
        </div>
        {etapa.descricao && (
          <p className="text-xs text-muted-foreground mt-0.5">{etapa.descricao}</p>
        )}
        {etapa.data_agendada && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            {etapa.agendamento_modo === 'definir_dia_hora' ? (
              <Clock className="h-3 w-3" />
            ) : (
              <Calendar className="h-3 w-3" />
            )}
            {formatDateJST(etapa.data_agendada)}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          Criado: {formatDateJST(etapa.created_at)}
          {etapa.updated_at !== etapa.created_at &&
            ` · Atualizado: ${formatDateJST(etapa.updated_at)}`}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onEdit(etapa)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(etapa.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

// ── Etapa Form ────────────────────────────────────────────────
function EtapaForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<EtapaInput>
  onSubmit: (data: EtapaInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EtapaInput>({
    resolver: zodResolver(etapaSchema),
    defaultValues: {
      status: 'pendente',
      agendamento_modo: 'nao_aplica',
      responsavel: 'assessoria',
      ...defaultValues,
    },
  })

  const agendamentoModo = watch('agendamento_modo')

  return (
    <form id="etapa-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Nome da Etapa <span className="text-destructive">*</span></Label>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register('status')}
          >
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Responsável</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register('responsavel')}
          >
            <option value="assessoria">Assessoria</option>
            <option value="cliente">Cliente</option>
            <option value="menkyocenter">Menkyo Center</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Agendamento</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register('agendamento_modo')}
          >
            <option value="nao_aplica">Não se aplica</option>
            <option value="definir_dia">Definir dia</option>
            <option value="definir_dia_hora">Definir dia e hora</option>
          </select>
        </div>
        {agendamentoModo !== 'nao_aplica' && (
          <div className="space-y-2">
            <Label>Data {agendamentoModo === 'definir_dia_hora' ? 'e Hora' : ''}</Label>
            <Input
              type={agendamentoModo === 'definir_dia_hora' ? 'datetime-local' : 'date'}
              {...register('data_agendada')}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="etapa-form" isLoading={isLoading}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

const statusContratoLabel: Record<StatusContrato, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
}

const statusContratoVariant: Record<
  StatusContrato,
  'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'
> = {
  rascunho: 'secondary',
  enviado: 'warning',
  assinado: 'success',
  cancelado: 'destructive',
}

// ── Linha de documento (contrato ou aditivo) ─────────────────
function ContratoDocRow({
  doc,
  isMain,
  label,
  gerandoPdf,
  onGerarPdf,
  onDownload,
  onEditar,
  onEnviar,
  onCancelar,
  cancelando,
  onCriarAditivo,
}: {
  doc: Contrato
  isMain?: boolean
  label?: string
  gerandoPdf: string | null
  onGerarPdf: () => void
  onDownload: () => void
  onEditar: () => void
  onEnviar: () => void
  onCancelar: () => void
  cancelando: boolean
  onCriarAditivo?: () => void
}) {
  const isGenerating = gerandoPdf === doc.id
  const canEdit = doc.status === 'rascunho' && !doc.pdf_url
  const hasPdf = !!doc.pdf_url

  return (
    <div className="rounded-md border bg-background">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">{doc.titulo}</span>
            {label && <Badge variant="outline" className="text-xs">{label}</Badge>}
            <Badge variant={statusContratoVariant[doc.status]}>
              {statusContratoLabel[doc.status]}
            </Badge>
            {hasPdf && <Badge variant="secondary" className="text-xs">PDF gerado</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
            Criado em {formatDateJST(doc.created_at)}
            {doc.assinado_em && ` · Assinado em ${formatDateJST(doc.assinado_em)}`}
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {/* PDF: gerar ou baixar */}
          {!hasPdf && doc.status !== 'cancelado' && (
            <Button
              variant="outline"
              size="sm"
              isLoading={isGenerating}
              onClick={onGerarPdf}
            >
              {!isGenerating && <FileText className="mr-1.5 h-3.5 w-3.5" />}
              Gerar PDF
            </Button>
          )}
          {hasPdf && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Baixar PDF
            </Button>
          )}

          {/* Editar (só rascunho sem PDF) */}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEditar}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
          )}

          {/* Aditivo (só se for contrato principal com PDF ou não-rascunho) */}
          {isMain && (hasPdf || doc.status !== 'rascunho') && doc.status !== 'cancelado' && onCriarAditivo && (
            <Button variant="outline" size="sm" onClick={onCriarAditivo}>
              <FilePlus className="mr-1.5 h-3.5 w-3.5" />
              Aditivo
            </Button>
          )}

          {/* Enviar */}
          {hasPdf && doc.status === 'rascunho' && (
            <Button variant="default" size="sm" onClick={onEnviar}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Enviar
            </Button>
          )}

          {/* Cancelar */}
          {(doc.status === 'rascunho' || doc.status === 'enviado') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              isLoading={cancelando}
              onClick={onCancelar}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export function ProcessoDetailPage() {
  const { id: clienteId, processoId } = useParams<{ id: string; processoId: string }>()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.session?.userId)

  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<'manual' | 'template'>('manual')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [editEtapa, setEditEtapa] = useState<ProcessoEtapa | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Contrato state
  const [editContratoOpen, setEditContratoOpen] = useState(false)
  const [editingAditivo, setEditingAditivo] = useState<Contrato | null>(null) // aditivo sendo editado
  const [isAditivoMode, setIsAditivoMode] = useState(false) // true = editContratoOpen está criando aditivo
  const [aditivoTargetId, setAditivoTargetId] = useState<string | null>(null) // contrato pai do aditivo
  const [contratoTitulo, setContratoTitulo] = useState('')
  const [contratoCorpo, setContratoCorpo] = useState('')
  const [enviarContratoOpen, setEnviarContratoOpen] = useState(false)
  const [enviarTarget, setEnviarTarget] = useState<Contrato | null>(null) // contrato ou aditivo a enviar
  const [selecionarTemplateOpen, setSelecionarTemplateOpen] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState<string | null>(null) // id do contrato/aditivo gerando pdf

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: processo, isLoading: processoLoading } = useQuery({
    queryKey: ['processos', processoId],
    queryFn: () => getProcesso(db, processoId!),
    enabled: !!processoId,
  })

  const { data: etapas = [], isLoading: etapasLoading } = useQuery({
    queryKey: ['processos', processoId, 'etapas'],
    queryFn: () => listEtapasByProcesso(db, processoId!),
    enabled: !!processoId,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['etapa-templates', processo?.servico_id],
    queryFn: () => listEtapaTemplatesByServico(db, processo!.servico_id),
    enabled: !!processo?.servico_id,
  })

  const { data: contratos = [] } = useQuery({
    queryKey: ['processos', processoId, 'contratos'],
    queryFn: () => listContratosByProcesso(db, processoId!),
    enabled: !!processoId,
  })

  const { data: contratoTemplates = [] } = useQuery({
    queryKey: ['contrato-templates', 'servico', processo?.servico_id],
    queryFn: () => listContratoTemplatesForServico(db, processo!.servico_id),
    enabled: !!processo?.servico_id,
  })

  const { data: todosAditivos = [] } = useQuery({
    queryKey: ['processos', processoId, 'aditivos'],
    queryFn: () => listAditivosByProcesso(db, processoId!),
    enabled: !!processoId,
  })

  // Processo edit form
  const {
    register: regProcesso,
    handleSubmit: handleProcesso,
    reset: resetProcesso,
    formState: { isDirty: processoDirty, isSubmitting: processoSubmitting },
  } = useForm<ProcessoInput>({
    resolver: zodResolver(processoSchema),
  })

  useEffect(() => {
    if (processo) {
      resetProcesso({
        servico_id: processo.servico_id,
        data_inicio: processo.data_inicio ?? '',
        valor_acordado_jpy: processo.valor_acordado_jpy ?? undefined,
        notas: processo.notas ?? '',
      })
    }
  }, [processo, resetProcesso])

  const updateProcessoMutation = useMutation({
    mutationFn: (data: ProcessoInput) =>
      updateProcesso(db, processoId!, {
        data_inicio: data.data_inicio || null,
        valor_acordado_jpy: data.valor_acordado_jpy ?? null,
        notas: data.notas || null,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['processos', processoId] }),
  })

  // ── Contrato mutations ────────────────────────────────────────
  const saveContratoMutation = useMutation({
    mutationFn: async () => {
      if (isAditivoMode && aditivoTargetId) {
        // Criar novo aditivo vinculado ao contrato pai
        await createContrato(db, {
          cliente_id: processo!.cliente_id,
          servico_id: processo!.servico_id,
          processo_id: processoId!,
          aditivo_de: aditivoTargetId,
          titulo: contratoTitulo,
          corpo_html: contratoCorpo,
          status: 'rascunho',
          assinado_em: null,
          assinatura_url: null,
          ip_assinatura: null,
          pdf_url: null,
          enviado_por: null,
        })
      } else if (editingAditivo) {
        await updateContrato(db, editingAditivo.id, {
          titulo: contratoTitulo,
          corpo_html: contratoCorpo,
        })
      } else {
        // Criar novo contrato principal (sem limitação de quantidade)
        await createContrato(db, {
          cliente_id: processo!.cliente_id,
          servico_id: processo!.servico_id,
          processo_id: processoId!,
          aditivo_de: null,
          titulo: contratoTitulo,
          corpo_html: contratoCorpo,
          status: 'rascunho',
          assinado_em: null,
          assinatura_url: null,
          ip_assinatura: null,
          pdf_url: null,
          enviado_por: null,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'contratos'] })
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'aditivos'] })
      setEditContratoOpen(false)
      setIsAditivoMode(false)
      setEditingAditivo(null)
      setAditivoTargetId(null)
    },
  })

  const enviarContratoMutation = useMutation({
    mutationFn: () => enviarContrato(db, enviarTarget!.id, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'contratos'] })
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'aditivos'] })
      setEnviarContratoOpen(false)
      setEnviarTarget(null)
    },
  })

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => updateContratoStatus(db, id, 'cancelado'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'contratos'] })
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'aditivos'] })
    },
  })

  async function gerarPdf(doc: Contrato) {
    setGerandoPdf(doc.id)
    try {
      // Importação dinâmica para evitar SSR issues
      const html2pdf = (await import('html2pdf.js')).default

      // Container temporário fora da tela com estilos de impressão
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111;padding:20mm 24mm;'
      container.innerHTML = `
        <style>
          h2{font-size:16px;font-weight:bold;margin:0 0 16px}
          h3{font-size:13px;font-weight:bold;margin:16px 0 6px}
          p{margin:4px 0}
          ul,ol{margin:4px 0 8px;padding-left:20px}
          li{margin-bottom:3px}
          hr{border:none;border-top:1px solid #ccc;margin:12px 0}
        </style>
        ${doc.corpo_html}
      `
      document.body.appendChild(container)

      const blob: Blob = await html2pdf()
        .set({
          margin: 0,
          filename: `${doc.titulo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .outputPdf('blob')

      document.body.removeChild(container)

      const path = contratoPath(doc.cliente_id, doc.id, `${doc.id}.pdf`)
      const pdfUrl = await uploadFile(storage, path, blob as Blob)

      await updateContratoPdfUrl(db, doc.id, pdfUrl)
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'contratos'] })
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'aditivos'] })
    } finally {
      setGerandoPdf(null)
    }
  }

  function downloadPdf(doc: Contrato) {
    if (!doc.pdf_url) return
    const a = document.createElement('a')
    a.href = doc.pdf_url
    a.download = `${doc.titulo}.pdf`
    a.target = '_blank'
    a.click()
  }

  function abrirNovoContratoComTemplate(tpl: { nome: string; corpo_html: string } | null) {
    const titulo = `Contrato — ${processo!.servico.nome}`
    const corpoHtml = tpl
      ? tpl.corpo_html
          .replaceAll('{{cliente_nome}}', '')
          .replaceAll('{{servico_nome}}', processo!.servico.nome)
          .replaceAll('{{valor_jpy}}', processo!.valor_acordado_jpy?.toLocaleString('ja-JP') ?? '0')
          .replaceAll('{{data_inicio}}', processo!.data_inicio ?? '')
          .replaceAll('{{data_hoje}}', new Date().toLocaleDateString('pt-BR'))
      : `<h2>${titulo}</h2><p><strong>CONTRATANTE:</strong> </p><p><strong>CONTRATADO:</strong> UENO ASSESSORIA</p>`
    setIsAditivoMode(false)
    setEditingAditivo(null)
    setContratoTitulo(titulo)
    setContratoCorpo(corpoHtml)
    setSelecionarTemplateOpen(false)
    setEditContratoOpen(true)
  }

  function abrirAditivo(targetContrato: Contrato) {
    const aditivosDoContrato = todosAditivos.filter((a) => a.aditivo_de === targetContrato.id)
    const n = aditivosDoContrato.length + 1
    setContratoTitulo(`Aditivo ${n} — ${targetContrato.titulo}`)
    setContratoCorpo(`<h2>Aditivo Contratual Nº ${n}</h2><p>Em complemento ao contrato "${targetContrato.titulo}", as partes acordam o seguinte:</p><p></p>`)
    setIsAditivoMode(true)
    setAditivoTargetId(targetContrato.id)
    setEditingAditivo(null)
    setEditContratoOpen(true)
  }

  function abrirEditarAditivo(doc: Contrato) {
    setContratoTitulo(doc.titulo)
    setContratoCorpo(doc.corpo_html)
    setIsAditivoMode(false)
    setEditingAditivo(doc)
    setEditContratoOpen(true)
  }

  useEffect(() => {
    if (!editContratoOpen) {
      setIsAditivoMode(false)
      setEditingAditivo(null)
      setAditivoTargetId(null)
    }
  }, [editContratoOpen])

  const addEtapaMutation = useMutation({
    mutationFn: (data: EtapaInput) =>
      createEtapa(db, {
        processo_id: processoId!,
        nome: data.nome,
        descricao: data.descricao || null,
        status: data.status,
        agendamento_modo: data.agendamento_modo,
        data_agendada: data.data_agendada || null,
        responsavel: data.responsavel,
        ordem: etapas.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'etapas'] })
      setAddOpen(false)
    },
  })

  const addFromTemplateMutation = useMutation({
    mutationFn: () => {
      const tpl = templates.find((t) => t.id === selectedTemplateId)
      if (!tpl) throw new Error('Template não encontrado')
      return createEtapa(db, {
        processo_id: processoId!,
        nome: tpl.nome,
        descricao: tpl.descricao || null,
        status: 'pendente',
        agendamento_modo: 'nao_aplica',
        data_agendada: null,
        responsavel: tpl.responsavel_padrao,
        ordem: etapas.length,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'etapas'] })
      setAddOpen(false)
      setSelectedTemplateId('')
    },
  })

  const editEtapaMutation = useMutation({
    mutationFn: (data: EtapaInput) =>
      updateEtapa(db, editEtapa!.id, {
        nome: data.nome,
        descricao: data.descricao || null,
        status: data.status,
        agendamento_modo: data.agendamento_modo,
        data_agendada: data.data_agendada || null,
        responsavel: data.responsavel,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'etapas'] })
      setEditEtapa(null)
    },
  })

  const deleteEtapaMutation = useMutation({
    mutationFn: (id: string) => deleteEtapa(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos', processoId, 'etapas'] })
      setDeleteId(null)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; ordem: number }>) =>
      reorderEtapas(db, updates),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = etapas.findIndex((e) => e.id === active.id)
    const newIndex = etapas.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(etapas, oldIndex, newIndex)

    // Optimistic update
    queryClient.setQueryData(
      ['processos', processoId, 'etapas'],
      reordered.map((e, i) => ({ ...e, ordem: i })),
    )

    reorderMutation.mutate(reordered.map((e, i) => ({ id: e.id, ordem: i })))
  }

  if (processoLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!processo) return null

  return (
    <div>
      <PageHeader
        title={processo.servico.nome}
        subtitle={`Processo iniciado em ${processo.data_inicio ? formatDateJST(processo.data_inicio) : '—'}`}
        actions={
          <Badge variant={processo.status === 'ativo' ? 'default' : processo.status === 'concluido' ? 'success' : 'destructive'}>
            {statusProcessoLabel[processo.status]}
          </Badge>
        }
      />

      <div className="px-8 pt-4">
        <Link
          to={`/clientes/${clienteId}/processo`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar para Processos
        </Link>
      </div>

      <div className="p-8 space-y-6">
        {/* Dados do processo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleProcesso((data) => updateProcessoMutation.mutate(data))}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Input value={processo.servico.nome} disabled />
              </div>
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" {...regProcesso('data_inicio')} />
              </div>
              <div className="space-y-2">
                <Label>Valor Acordado (¥)</Label>
                <Input
                  type="number"
                  min={0}
                  {...regProcesso('valor_acordado_jpy', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações</Label>
                <textarea
                  {...regProcesso('notas')}
                  className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  isLoading={processoSubmitting || updateProcessoMutation.isPending}
                  disabled={!processoDirty}
                >
                  Salvar Dados
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Contrato */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contratos</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setSelecionarTemplateOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {contratos.length === 0 ? (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                Nenhum contrato vinculado a este processo.
                <br />
                Clique em "Novo Contrato" para criar a partir de um modelo.
              </div>
            ) : (
              <div className="space-y-6">
                {contratos.map((c, ci) => {
                  const aditivosDoContrato = todosAditivos.filter((a) => a.aditivo_de === c.id)
                  return (
                    <div key={c.id} className="space-y-2">
                      {contratos.length > 1 && (
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Contrato {ci + 1}
                        </p>
                      )}
                      {/* ── Contrato principal ── */}
                      <ContratoDocRow
                        doc={c}
                        isMain
                        gerandoPdf={gerandoPdf}
                        onGerarPdf={() => gerarPdf(c)}
                        onDownload={() => downloadPdf(c)}
                        onEditar={() => {
                          setContratoTitulo(c.titulo)
                          setContratoCorpo(c.corpo_html)
                          setIsAditivoMode(false)
                          setEditingAditivo(null)
                          setEditContratoOpen(true)
                        }}
                        onEnviar={() => { setEnviarTarget(c); setEnviarContratoOpen(true) }}
                        onCancelar={() => cancelarMutation.mutate(c.id)}
                        cancelando={cancelarMutation.isPending}
                        onCriarAditivo={() => abrirAditivo(c)}
                      />

                      {/* ── Aditivos do contrato ── */}
                      {aditivosDoContrato.length > 0 && (
                        <div className="ml-4 space-y-2 border-l pl-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Aditivos ({aditivosDoContrato.length})
                          </p>
                          {aditivosDoContrato.map((ad, i) => (
                            <ContratoDocRow
                              key={ad.id}
                              doc={ad}
                              label={`Aditivo ${i + 1}`}
                              gerandoPdf={gerandoPdf}
                              onGerarPdf={() => gerarPdf(ad)}
                              onDownload={() => downloadPdf(ad)}
                              onEditar={() => abrirEditarAditivo(ad)}
                              onEnviar={() => { setEnviarTarget(ad); setEnviarContratoOpen(true) }}
                              onCancelar={() => cancelarMutation.mutate(ad.id)}
                              cancelando={cancelarMutation.isPending}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Etapas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Etapas</CardTitle>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Etapa
            </Button>
          </CardHeader>
          <CardContent>
            {etapasLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : etapas.length === 0 ? (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                Nenhuma etapa cadastrada. Clique em "Adicionar Etapa" para criar.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={etapas.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {etapas.map((etapa) => (
                      <EtapaCard
                        key={etapa.id}
                        etapa={etapa}
                        onEdit={setEditEtapa}
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

      {/* Add Etapa Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          {templates.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  addMode === 'manual'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-accent'
                }`}
                onClick={() => setAddMode('manual')}
              >
                Manual
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  addMode === 'template'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-accent'
                }`}
                onClick={() => setAddMode('template')}
              >
                Do Template
              </button>
            </div>
          )}

          {addMode === 'template' && templates.length > 0 ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Selecionar Template</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">Selecionar...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    Responsável: {responsavelLabel[templates.find((t) => t.id === selectedTemplateId)!.responsavel_padrao]}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  isLoading={addFromTemplateMutation.isPending}
                  disabled={!selectedTemplateId}
                  onClick={() => addFromTemplateMutation.mutate()}
                >
                  Adicionar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <EtapaForm
              onSubmit={(data) => addEtapaMutation.mutate(data)}
              isLoading={addEtapaMutation.isPending}
              onCancel={() => setAddOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Etapa Dialog */}
      <Dialog open={!!editEtapa} onOpenChange={(o) => !o && setEditEtapa(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
          </DialogHeader>
          {editEtapa && (
            <EtapaForm
              defaultValues={{
                nome: editEtapa.nome,
                descricao: editEtapa.descricao ?? '',
                status: editEtapa.status,
                agendamento_modo: editEtapa.agendamento_modo,
                data_agendada: editEtapa.data_agendada ?? '',
                responsavel: editEtapa.responsavel,
              }}
              onSubmit={(data) => editEtapaMutation.mutate(data)}
              isLoading={editEtapaMutation.isPending}
              onCancel={() => setEditEtapa(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja remover esta etapa?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteEtapaMutation.isPending}
              onClick={() => deleteId && deleteEtapaMutation.mutate(deleteId)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Selecionar Template Dialog */}
      <Dialog open={selecionarTemplateOpen} onOpenChange={setSelecionarTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escolher modelo de contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {contratoTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="w-full rounded-md border bg-background px-4 py-3 text-left hover:bg-accent transition-colors"
                onClick={() => abrirNovoContratoComTemplate(tpl)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm">{tpl.nome}</span>
                  {tpl.is_default && !tpl.servico_id && (
                    <Badge variant="secondary" className="text-xs">Padrão global</Badge>
                  )}
                  {tpl.servico_id && (
                    <Badge variant="outline" className="text-xs">Este serviço</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">
                  {tpl.corpo_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)}…
                </p>
              </button>
            ))}
            {contratoTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhum modelo configurado para este serviço.
              </p>
            )}
            <button
              type="button"
              className="w-full rounded-md border border-dashed bg-background px-4 py-3 text-left hover:bg-accent transition-colors"
              onClick={() => abrirNovoContratoComTemplate(null)}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm">Em branco</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">Começar com documento vazio</p>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelecionarTemplateOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor de Contrato / Aditivo */}
      <Dialog open={editContratoOpen} onOpenChange={setEditContratoOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAditivoMode
                ? 'Novo Aditivo'
                : editingAditivo
                ? 'Editar Aditivo'
                : 'Novo Contrato'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 py-2">
            {/* Editor principal */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="space-y-2">
                <Label>Título <span className="text-destructive">*</span></Label>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={contratoTitulo}
                  onChange={(e) => setContratoTitulo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo <span className="text-destructive">*</span></Label>
                <RichTextEditor
                  value={contratoCorpo}
                  onChange={setContratoCorpo}
                  placeholder="Digite o conteúdo..."
                  minHeight="420px"
                />
              </div>
            </div>

            {/* Painel lateral */}
            <div className="w-52 shrink-0 space-y-4 pt-0.5">
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground mb-2">Variáveis — clique para copiar</p>
                {[
                  { tag: '{{cliente_nome}}', label: 'Nome do cliente' },
                  { tag: '{{servico_nome}}', label: 'Serviço' },
                  { tag: '{{valor_jpy}}', label: 'Valor (¥)' },
                  { tag: '{{data_inicio}}', label: 'Data de início' },
                  { tag: '{{data_hoje}}', label: 'Data de hoje' },
                ].map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    title={`Copiar ${v.tag}`}
                    className="w-full text-left rounded px-2 py-1.5 hover:bg-accent transition-colors"
                    onClick={() => navigator.clipboard.writeText(v.tag)}
                  >
                    <code className="text-xs font-mono text-primary block">{v.tag}</code>
                    <span className="text-xs text-muted-foreground">{v.label}</span>
                  </button>
                ))}
              </div>

              {contratoTemplates.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground mb-1">Carregar modelo</p>
                  <p className="text-xs text-muted-foreground mb-2">Substitui o conteúdo atual.</p>
                  {contratoTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="w-full text-left rounded px-2 py-1.5 hover:bg-accent transition-colors"
                      onClick={() => {
                        setContratoCorpo(
                          tpl.corpo_html
                            .replaceAll('{{cliente_nome}}', '')
                            .replaceAll('{{servico_nome}}', processo!.servico.nome)
                            .replaceAll('{{valor_jpy}}', processo!.valor_acordado_jpy?.toLocaleString('ja-JP') ?? '0')
                            .replaceAll('{{data_inicio}}', processo!.data_inicio ?? '')
                            .replaceAll('{{data_hoje}}', new Date().toLocaleDateString('pt-BR'))
                        )
                      }}
                    >
                      <span className="text-xs font-medium text-foreground block">{tpl.nome}</span>
                      {tpl.is_default && !tpl.servico_id && (
                        <span className="text-xs text-muted-foreground">Padrão global</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContratoOpen(false)}>
              Cancelar
            </Button>
            <Button
              isLoading={saveContratoMutation.isPending}
              disabled={!contratoTitulo || !contratoCorpo}
              onClick={() => saveContratoMutation.mutate()}
            >
              {isAditivoMode ? 'Criar Aditivo' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enviar Confirm */}
      <Dialog open={enviarContratoOpen} onOpenChange={(o) => { setEnviarContratoOpen(o); if (!o) setEnviarTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para assinatura</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            O documento "<strong>{enviarTarget?.titulo}</strong>" será enviado ao cliente para assinatura no app. Certifique-se de que o PDF foi gerado antes de enviar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnviarContratoOpen(false)}>
              Cancelar
            </Button>
            <Button isLoading={enviarContratoMutation.isPending} onClick={() => enviarContratoMutation.mutate()}>
              <Send className="mr-2 h-4 w-4" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
