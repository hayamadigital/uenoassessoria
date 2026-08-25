import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FileText, Layers } from 'lucide-react'
import DOMPurify from 'dompurify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { SecaoContratoBuilder } from '@/components/ui/SecaoContratoBuilder'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import {
  listContratoTemplates,
  createContratoTemplate,
  updateContratoTemplate,
  deleteContratoTemplate,
} from '@ueno/firebase/queries/contrato_templates'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { contratoTemplateSchema, type ContratoTemplateInput } from '@ueno/utils/validators'
import { renderSecoes } from '@ueno/utils/contrato-render'
import type { ContratoTemplate } from '@ueno/firebase'

// ─── Form ─────────────────────────────────────────────────────────────────────

function TemplateForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<ContratoTemplateInput>
  onSubmit: (data: ContratoTemplateInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContratoTemplateInput>({
    resolver: zodResolver(contratoTemplateSchema),
    defaultValues: {
      nome: '',
      corpo_html: '',
      secoes: [],
      servico_id: '',
      is_default: false,
      ...defaultValues,
    },
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => listServicos(db, true),
  })

  return (
    <form id="template-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label>
          Nome do Template <span className="text-destructive">*</span>
        </Label>
        <Input {...register('nome')} placeholder="Ex: Contrato Padrão Habilitação" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Serviço vinculado (opcional)</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register('servico_id')}
        >
          <option value="">Sem vínculo (template global)</option>
          {servicos?.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Se vinculado, este template será sugerido ao criar um processo desse serviço.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          className="h-4 w-4 rounded border-input"
          {...register('is_default')}
        />
        <Label htmlFor="is_default" className="cursor-pointer font-normal">
          Usar como template padrão global
        </Label>
      </div>

      <div className="space-y-2">
        <Label>
          Seções do Contrato <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Cada seção é uma parte do contrato com campos dinâmicos preenchidos no momento da criação.
        </p>
        <Controller
          name="secoes"
          control={control}
          render={({ field }) => (
            <SecaoContratoBuilder
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
        {errors.secoes && (
          <p className="text-xs text-destructive">Adicione ao menos uma seção.</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="template-form" isLoading={isLoading}>
          Salvar Template
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

export function ContratoTemplatesTab() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen]           = useState(false)
  const [editTarget, setEditTarget]     = useState<ContratoTemplate | null>(null)
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const [previewTarget, setPreviewTarget] = useState<ContratoTemplate | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['contrato-templates'],
    queryFn: () => listContratoTemplates(db),
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => listServicos(db, true),
  })

  const servicoNome = (id: string | null) =>
    id ? (servicos?.find((s) => s.id === id)?.nome ?? id) : null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contrato-templates'] })

  const createMutation = useMutation({
    mutationFn: (data: ContratoTemplateInput) =>
      createContratoTemplate(db, {
        nome: data.nome,
        corpo_html: data.corpo_html ?? '',
        secoes: data.secoes ?? [],
        servico_id: data.servico_id || null,
        is_default: data.is_default,
      }),
    onSuccess: () => { invalidate(); setAddOpen(false) },
  })

  const editMutation = useMutation({
    mutationFn: (data: ContratoTemplateInput) =>
      updateContratoTemplate(db, editTarget!.id, {
        nome: data.nome,
        corpo_html: data.corpo_html ?? '',
        secoes: (data.secoes ?? []).map((section) => ({
          ...section,
          servico_id: section.servico_id ?? '',
        })),
        is_default: data.is_default,
      }),
    onSuccess: () => { invalidate(); setEditTarget(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContratoTemplate(db, id),
    onSuccess: () => { invalidate(); setDeleteId(null) },
  })

  const previewHtml = previewTarget?.secoes?.length
    ? DOMPurify.sanitize(renderSecoes(previewTarget.secoes, {
        cliente_nome:    'João da Silva',
        valor_total_jpy: '50000',
        num_parcelas:    '3',
        data_hoje:       new Date().toISOString().split('T')[0] as string,
      }))
    : DOMPurify.sanitize(previewTarget?.corpo_html ?? '')

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Templates de Contrato</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Modelos por seções para geração automática de contratos.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : templates?.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
              Nenhum template cadastrado.
            </div>
          ) : (
            <div className="space-y-3">
              {templates?.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-start justify-between rounded-md border bg-background px-4 py-3 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{tpl.nome}</span>
                      {tpl.is_default && <Badge variant="default">Padrão global</Badge>}
                      {tpl.servico_id && <Badge variant="outline">{servicoNome(tpl.servico_id)}</Badge>}
                      {(tpl.secoes?.length ?? 0) > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Layers className="h-3 w-3" />
                              {tpl.secoes?.length ?? 0} seções
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tpl.secoes?.map((s) => s.titulo).join(' · ') ?? '—'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPreviewTarget(tpl)}>
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditTarget(tpl)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(tpl.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Template de Contrato</DialogTitle>
          </DialogHeader>
          <TemplateForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editTarget} onOpenChange={(o: boolean) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <TemplateForm
              defaultValues={{
                nome:       editTarget.nome,
                corpo_html: editTarget.corpo_html,
                secoes:     (editTarget.secoes ?? []).map((section) => ({
                  ...section,
                  titulo: section.titulo ?? undefined,
                  conteudo_html: section.conteudo_html ?? undefined,
                  servico_id: section.servico_id ?? '',
                })),
                servico_id: editTarget.servico_id ?? '',
                is_default: editTarget.is_default,
              }}
              onSubmit={(data) => editMutation.mutate(data)}
              isLoading={editMutation.isPending}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteId} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja remover este template? Contratos já gerados não serão afetados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewTarget} onOpenChange={(o: boolean) => !o && setPreviewTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview — {previewTarget?.nome}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Visualização com dados de exemplo.</p>
          {/* previewHtml is generated by renderSecoes (controlled output) and sanitized by DOMPurify */}
          <div
            className="rounded-md border bg-white p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
