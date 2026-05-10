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
import { ArrowLeft, GripVertical, Plus, Pencil, Trash2, ImageIcon, Upload } from 'lucide-react'
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
  listEtapaTemplatesByServico,
  createEtapaTemplate,
  updateEtapaTemplate,
  reorderEtapaTemplates,
  deleteEtapaTemplate,
} from '@ueno/firebase/queries/etapa_templates'
import { servicoSchema, etapaTemplateSchema, type ServicoInput, type EtapaTemplateInput } from '@ueno/utils/validators'
import type { EtapaTemplate, ResponsavelEtapa } from '@ueno/firebase'

const responsavelLabel: Record<ResponsavelEtapa, string> = {
  cliente: 'Cliente',
  assessoria: 'Assessoria',
  menkyocenter: 'Menkyo Center',
  outros: 'Outros',
}

// ── Sortable template card ───────────────────────────────────
function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: EtapaTemplate
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
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{template.nome}</span>
          <Badge variant="outline">{responsavelLabel[template.responsavel_padrao]}</Badge>
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
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<EtapaTemplateInput>
  onSubmit: (data: EtapaTemplateInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EtapaTemplateInput>({
    resolver: zodResolver(etapaTemplateSchema),
    defaultValues: { responsavel_padrao: 'assessoria', ...defaultValues },
  })

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

// ── Main page ─────────────────────────────────────────────────
export function ServicosDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editTemplate, setEditTemplate] = useState<EtapaTemplate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Serviço edit form
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<ServicoInput>({
    resolver: zodResolver(servicoSchema),
  })

  useEffect(() => {
    if (servico) {
      reset({
        nome: servico.nome,
        descricao: servico.descricao ?? '',
        duracao_texto: servico.duracao_texto ?? '',
        preco_jpy: servico.preco_jpy,
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
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['servicos', id] }),
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
                <Label>Preço (¥)</Label>
                <Input type="number" min={0} {...register('preco_jpy', { valueAsNumber: true })} />
              </div>
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
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Etapa Padrão
            </Button>
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
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etapa Padrão</DialogTitle>
          </DialogHeader>
          {addError && <p className="text-xs text-destructive px-1">{addError}</p>}
          <TemplateForm
            onSubmit={(data) => addTemplateMutation.mutate(data)}
            isLoading={addTemplateMutation.isPending}
            onCancel={() => { setAddOpen(false); setAddError(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(o) => { if (!o) { setEditTemplate(null); setEditError(null) } }}>
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
                ordem: editTemplate.ordem,
              }}
              onSubmit={(data) => editTemplateMutation.mutate(data)}
              isLoading={editTemplateMutation.isPending}
              onCancel={() => { setEditTemplate(null); setEditError(null) }}
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
