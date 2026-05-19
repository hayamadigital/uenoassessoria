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
  listContatosByCliente,
  createContato,
  updateContato,
  deleteContato,
} from '@ueno/firebase/queries/contatos'
import { contatoSchema, type ContatoInput } from '@ueno/utils/validators'
import { PAISES } from '@/lib/paises'
import type { ClienteContato, ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

const tipoLabel = { pessoal: 'Pessoal', parente: 'Parente', terceiros: 'Terceiros' }

function ContatoForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<ContatoInput>
  onSubmit: (data: ContatoInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ContatoInput>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      ddi: '+55',
      tipo_responsavel: 'pessoal',
      tem_whatsapp: false,
      is_principal: false,
      ...defaultValues,
    },
  })

  const tipoResponsavel = watch('tipo_responsavel')

  return (
    <form id="contato-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Número</Label>
        <div className="flex gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            {...register('ddi')}
          >
            {PAISES.map((p) => (
              <option key={p.code} value={p.ddi}>
                {p.flag} {p.ddi}
              </option>
            ))}
          </select>
          <Input className="flex-1" {...register('numero')} placeholder="90 0000-0000" />
        </div>
        {errors.numero && (
          <p className="text-xs text-destructive">{errors.numero.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Responsável pelo número</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register('tipo_responsavel')}
        >
          <option value="pessoal">Pessoal</option>
          <option value="parente">Parente</option>
          <option value="terceiros">Terceiros</option>
        </select>
      </div>
      {tipoResponsavel !== 'pessoal' && (
        <>
          <div className="space-y-2">
            <Label>Nome do responsável</Label>
            <Input {...register('nome_responsavel')} />
          </div>
          <div className="space-y-2">
            <Label>Relação</Label>
            <Input {...register('relacao')} placeholder="Ex: Esposa, Filho, Amigo..." />
          </div>
        </>
      )}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...register('tem_whatsapp')} />
          Tem WhatsApp
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...register('is_principal')} />
          Principal para contato
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="contato-form" isLoading={isLoading}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ClienteContatosTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editContato, setEditContato] = useState<ClienteContato | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: contatos, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'contatos'],
    queryFn: () => listContatosByCliente(db, cliente.id),
  })

  const addMutation = useMutation({
    mutationFn: (data: ContatoInput) =>
      createContato(db, {
        ...data,
        cliente_id: cliente.id,
        nome_responsavel: data.nome_responsavel || null,
        relacao: data.relacao || null,
      }),
    onSuccess: async (created) => {
      queryClient.setQueryData<ClienteContato[]>(
        ['clientes', cliente.id, 'contatos'],
        (current = []) => [created, ...current.filter((c) => c.id !== created.id)],
      )
      await queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'contatos'] })
      await queryClient.refetchQueries({ queryKey: ['clientes', cliente.id, 'contatos'] })
      setAddOpen(false)
    },
  })

  const editMutation = useMutation({
    mutationFn: (data: ContatoInput) =>
      updateContato(db, cliente.id, editContato!.id, {
        ...data,
        nome_responsavel: data.nome_responsavel || null,
        relacao: data.relacao || null,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData<ClienteContato[]>(
        ['clientes', cliente.id, 'contatos'],
        (current = []) => current.map((c) => (c.id === updated.id ? updated : c)),
      )
      await queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'contatos'] })
      await queryClient.refetchQueries({ queryKey: ['clientes', cliente.id, 'contatos'] })
      setEditContato(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContato(db, cliente.id, id),
    onSuccess: async (_, removedId) => {
      queryClient.setQueryData<ClienteContato[]>(
        ['clientes', cliente.id, 'contatos'],
        (current = []) => current.filter((c) => c.id !== removedId),
      )
      await queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'contatos'] })
      await queryClient.refetchQueries({ queryKey: ['clientes', cliente.id, 'contatos'] })
      setDeleteId(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {contatos?.length ?? 0} contato(s)
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Contato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Contato</DialogTitle>
            </DialogHeader>
            <ContatoForm
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
      ) : contatos?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum contato cadastrado.
        </div>
      ) : (
        <div className="space-y-2">
          {contatos?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {c.ddi} {c.numero}
                  </span>
                  {c.is_principal && <Badge variant="default">Principal</Badge>}
                  {c.tem_whatsapp && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      WhatsApp
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tipoLabel[c.tipo_responsavel]}
                  {c.nome_responsavel ? ` — ${c.nome_responsavel}` : ''}
                  {c.relacao ? ` (${c.relacao})` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditContato(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editContato} onOpenChange={(o: boolean) => !o && setEditContato(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
          </DialogHeader>
          {editContato && (
            <ContatoForm
              defaultValues={{
                ddi: editContato.ddi,
                numero: editContato.numero,
                tipo_responsavel: editContato.tipo_responsavel,
                nome_responsavel: editContato.nome_responsavel ?? '',
                relacao: editContato.relacao ?? '',
                tem_whatsapp: editContato.tem_whatsapp,
                is_principal: editContato.is_principal,
              }}
              onSubmit={(data) => editMutation.mutate(data)}
              isLoading={editMutation.isPending}
              onCancel={() => setEditContato(null)}
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
            Deseja remover este contato? Esta ação não pode ser desfeita.
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
