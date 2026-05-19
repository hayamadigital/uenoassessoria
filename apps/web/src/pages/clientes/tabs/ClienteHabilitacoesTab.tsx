import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import {
  listHabilitacoesByCliente,
  createHabilitacao,
  updateHabilitacao,
  deleteHabilitacao,
} from '@ueno/firebase/queries/habilitacoes'
import { habilitacaoSchema, type HabilitacaoInput } from '@ueno/utils/validators'
import { PAISES } from '@/lib/paises'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteHabilitacao, ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

function HabilitacaoForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<HabilitacaoInput>
  onSubmit: (data: HabilitacaoInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HabilitacaoInput>({
    resolver: zodResolver(habilitacaoSchema),
    defaultValues: { situacao: 'positiva', ...defaultValues },
  })

  return (
    <form id="hab-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>País <span className="text-destructive">*</span></Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register('pais')}
          >
            <option value="">Selecionar</option>
            {PAISES.map((p) => (
              <option key={p.code} value={p.nome}>
                {p.flag} {p.nome}
              </option>
            ))}
          </select>
          {errors.pais && <p className="text-xs text-destructive">{errors.pais.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Input {...register('categoria')} placeholder="Ex: B, AB, A..." />
        </div>
        <div className="space-y-2">
          <Label>Nome escrito na habilitação</Label>
          <Input {...register('nome_habilitacao')} />
        </div>
        <div className="space-y-2">
          <Label>Número / ID</Label>
          <Input {...register('numero')} />
        </div>
        <div className="space-y-2">
          <Label>Data de Emissão</Label>
          <Input type="date" {...register('data_emissao')} />
        </div>
        <div className="space-y-2">
          <Label>Data de Vencimento</Label>
          <Input type="date" {...register('data_vencimento')} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Observações</Label>
          <textarea
            {...register('observacoes')}
            className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>Situação</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register('situacao')}
          >
            <option value="positiva">Positiva</option>
            <option value="negativa">Negativa</option>
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="hab-form" isLoading={isLoading}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ClienteHabilitacoesTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editHab, setEditHab] = useState<ClienteHabilitacao | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: habilitacoes, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'habilitacoes'],
    queryFn: () => listHabilitacoesByCliente(db, cliente.id),
  })

  const addMutation = useMutation({
    mutationFn: (data: HabilitacaoInput) =>
      createHabilitacao(db, {
        ...data,
        cliente_id: cliente.id,
        categoria: data.categoria || null,
        nome_habilitacao: data.nome_habilitacao || null,
        numero: data.numero || null,
        data_emissao: data.data_emissao || null,
        data_vencimento: data.data_vencimento || null,
        observacoes: data.observacoes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'habilitacoes'] })
      setAddOpen(false)
    },
  })

  const editMutation = useMutation({
    mutationFn: (data: HabilitacaoInput) =>
      updateHabilitacao(db, cliente.id, editHab!.id, {
        ...data,
        categoria: data.categoria || null,
        nome_habilitacao: data.nome_habilitacao || null,
        numero: data.numero || null,
        data_emissao: data.data_emissao || null,
        data_vencimento: data.data_vencimento || null,
        observacoes: data.observacoes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'habilitacoes'] })
      setEditHab(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHabilitacao(db, cliente.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'habilitacoes'] })
      setDeleteId(null)
    },
  })

  const paisFlag = (nome: string) => PAISES.find((p) => p.nome === nome)?.flag ?? ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {habilitacoes?.length ?? 0} habilitação(ões)
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Habilitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Habilitação</DialogTitle>
            </DialogHeader>
            <HabilitacaoForm
              onSubmit={(data) => addMutation.mutate(data)}
              isLoading={addMutation.isPending}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : habilitacoes?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhuma habilitação cadastrada.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">País</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-left font-medium">Número</th>
                <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                <th className="px-4 py-3 text-left font-medium">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {habilitacoes?.map((h) => (
                <tr key={h.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    {paisFlag(h.pais)} {h.pais}
                  </td>
                  <td className="px-4 py-3">{h.categoria ?? '—'}</td>
                  <td className="px-4 py-3">{h.numero ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {h.data_vencimento ? formatDateJST(h.data_vencimento) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={h.situacao === 'positiva' ? 'success' : 'destructive'}
                    >
                      {h.situacao === 'positiva' ? 'Positiva' : 'Negativa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditHab(h)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(h.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editHab} onOpenChange={(o: boolean) => !o && setEditHab(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Habilitação</DialogTitle>
          </DialogHeader>
          {editHab && (
            <HabilitacaoForm
              defaultValues={{
                pais: editHab.pais,
                categoria: editHab.categoria ?? '',
                nome_habilitacao: editHab.nome_habilitacao ?? '',
                numero: editHab.numero ?? '',
                data_emissao: editHab.data_emissao ?? '',
                data_vencimento: editHab.data_vencimento ?? '',
                observacoes: editHab.observacoes ?? '',
                situacao: editHab.situacao,
              }}
              onSubmit={(data) => editMutation.mutate(data)}
              isLoading={editMutation.isPending}
              onCancel={() => setEditHab(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja remover esta habilitação?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
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
    </div>
  )
}
