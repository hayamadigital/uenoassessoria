import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  listDocumentoTemplates,
  createDocumentoTemplate,
  updateDocumentoTemplate,
  deleteDocumentoTemplate,
} from '@ueno/firebase/queries/documentos'
import { listServicos } from '@ueno/firebase/queries/servicos'
import type { DocumentoTemplate } from '@ueno/firebase'
import { includesText, isWithinDateRange, nextSort, sortBy, type SortState } from '@/utils/table'

const templateSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  obrigatorio: z.boolean(),
  servico_id: z.string().optional(),
  ordem: z.coerce.number().int().min(0),
})
type TemplateInput = z.infer<typeof templateSchema>

interface TemplateFormProps {
  defaultValues?: Partial<TemplateInput>
  servicos: { id: string; nome: string }[]
  onSubmit: (data: TemplateInput) => void
  isPending: boolean
  onCancel: () => void
  formId: string
}

function TemplateForm({
  defaultValues,
  servicos,
  onSubmit,
  isPending,
  onCancel,
  formId,
}: TemplateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      obrigatorio: false,
      servico_id: '',
      ordem: 0,
      ...defaultValues,
    },
  })

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input {...register('nome')} placeholder="Ex: CNH Brasileira (original)" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <textarea
          {...register('descricao')}
          rows={2}
          placeholder="Instruções ou observações para o cliente"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Serviço associado</Label>
          <select
            {...register('servico_id')}
            defaultValue=""
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Nenhum</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Ordem</Label>
          <Input type="number" {...register('ordem')} min={0} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="obrigatorio"
          type="checkbox"
          {...register('obrigatorio')}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="obrigatorio" className="cursor-pointer font-normal">
          Documento obrigatório
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form={formId} isLoading={isPending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

export function TemplatesDocumentosTab() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DocumentoTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentoTemplate | null>(null)
  const [busca, setBusca] = useState('')
  const [obrigatorioFiltro, setObrigatorioFiltro] = useState<'all' | 'required' | 'optional'>('all')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sort, setSort] = useState<SortState<'ordem' | 'nome' | 'descricao' | 'obrigatorio' | 'created_at'>>({
    key: 'ordem',
    direction: 'asc',
  })

  const formOpen = createOpen || !!editingTemplate

  const { data: templates, isLoading } = useQuery({
    queryKey: ['documento-templates'],
    queryFn: () => listDocumentoTemplates(db),
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos', 'list'],
    queryFn: () => listServicos(db, false),
    enabled: formOpen,
  })

  const createMutation = useMutation({
    mutationFn: (data: TemplateInput) =>
      createDocumentoTemplate(db, {
        nome: data.nome,
        descricao: data.descricao || null,
        obrigatorio: data.obrigatorio,
        servico_id: data.servico_id || null,
        ordem: data.ordem,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documento-templates'] })
      setCreateOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: TemplateInput) =>
      updateDocumentoTemplate(db, editingTemplate!.id, {
        nome: data.nome,
        descricao: data.descricao || null,
        obrigatorio: data.obrigatorio,
        servico_id: data.servico_id || null,
        ordem: data.ordem,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documento-templates'] })
      setEditingTemplate(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocumentoTemplate(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documento-templates'] })
      setDeleteTarget(null)
    },
  })

  const servicosOptions = servicos ?? []
  const templatesFiltrados = useMemo(() => {
    const rows = (templates ?? []).filter((template) => {
      if (obrigatorioFiltro === 'required' && !template.obrigatorio) return false
      if (obrigatorioFiltro === 'optional' && template.obrigatorio) return false
      if (!includesText([template.nome, template.descricao, template.obrigatorio ? 'obrigatorio' : 'opcional'].join(' '), busca)) return false
      return isWithinDateRange(template.created_at, createdFrom, createdTo)
    })

    return sortBy(rows, sort, {
      ordem: (template) => template.ordem,
      nome: (template) => template.nome,
      descricao: (template) => template.descricao,
      obrigatorio: (template) => template.obrigatorio,
      created_at: (template) => template.created_at,
    })
  }, [busca, createdFrom, createdTo, obrigatorioFiltro, sort, templates])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templatesFiltrados.length} template(s) exibido(s)
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={obrigatorioFiltro}
          onChange={(e) => setObrigatorioFiltro(e.target.value as 'all' | 'required' | 'optional')}
        >
          <option value="all">Obrigatórios e opcionais</option>
          <option value="required">Obrigatórios</option>
          <option value="optional">Opcionais</option>
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
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : templatesFiltrados.length === 0 ? (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhum template cadastrado.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <SortableTh sort={sort} sortKey="ordem" onSort={(key) => setSort(nextSort(sort, key))} className="w-12">#</SortableTh>
                <SortableTh sort={sort} sortKey="nome" onSort={(key) => setSort(nextSort(sort, key))}>Nome</SortableTh>
                <SortableTh sort={sort} sortKey="descricao" onSort={(key) => setSort(nextSort(sort, key))}>Descrição</SortableTh>
                <SortableTh sort={sort} sortKey="obrigatorio" onSort={(key) => setSort(nextSort(sort, key))}>Obrigatório</SortableTh>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {templatesFiltrados.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">{t.ordem}</td>
                  <td className="px-4 py-3 font-medium">{t.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.descricao ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.obrigatorio ? (
                      <Badge variant="destructive">Obrigatório</Badge>
                    ) : (
                      <Badge variant="outline">Opcional</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(t)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o: boolean) => { if (!o) setCreateOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Template</DialogTitle>
          </DialogHeader>
          <TemplateForm
            formId="template-create-form"
            servicos={servicosOptions}
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(o: boolean) => { if (!o) setEditingTemplate(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              key={editingTemplate.id}
              formId="template-edit-form"
              servicos={servicosOptions}
              defaultValues={{
                nome: editingTemplate.nome,
                descricao: editingTemplate.descricao ?? '',
                obrigatorio: editingTemplate.obrigatorio,
                servico_id: editingTemplate.servico_id ?? '',
                ordem: editingTemplate.ordem,
              }}
              onSubmit={(data) => updateMutation.mutate(data)}
              isPending={updateMutation.isPending}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o template{' '}
            <strong className="text-foreground">{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
