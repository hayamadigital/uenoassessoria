import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, PlaneLanding, PlaneTakeoff } from 'lucide-react'
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
  listEntradasSaidasByCliente,
  createEntradaSaida,
  updateEntradaSaida,
  deleteEntradaSaida,
} from '@ueno/firebase/queries/entradas_saidas'
import { entradaSaidaSchema, type EntradaSaidaInput } from '@ueno/utils/validators'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteEntradaSaida, ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

function EntradaSaidaForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<EntradaSaidaInput>
  onSubmit: (data: EntradaSaidaInput) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EntradaSaidaInput>({
    resolver: zodResolver(entradaSaidaSchema),
    defaultValues: { tipo: 'entrada', ...defaultValues },
  })

  return (
    <form id="es-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Tipo <span className="text-destructive">*</span></Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register('tipo')}
        >
          <option value="entrada">Entrada no Japão</option>
          <option value="saida">Saída do Japão</option>
        </select>
        {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Data <span className="text-destructive">*</span></Label>
        <Input type="date" {...register('data_viagem')} />
        {errors.data_viagem && (
          <p className="text-xs text-destructive">{errors.data_viagem.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Observação</Label>
        <textarea
          {...register('observacao')}
          className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Motivo, voo, etc."
        />
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="es-form" isLoading={isLoading}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ClienteJapaoVistoTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<ClienteEntradaSaida | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: registros, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'entradas-saidas'],
    queryFn: () => listEntradasSaidasByCliente(db, cliente.id),
  })

  const addMutation = useMutation({
    mutationFn: (data: EntradaSaidaInput) =>
      createEntradaSaida(db, {
        ...data,
        cliente_id: cliente.id,
        observacao: data.observacao || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'entradas-saidas'] })
      setAddOpen(false)
    },
  })

  const editMutation = useMutation({
    mutationFn: (data: EntradaSaidaInput) =>
      updateEntradaSaida(db, cliente.id, editItem!.id, { ...data, observacao: data.observacao || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'entradas-saidas'] })
      setEditItem(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEntradaSaida(db, cliente.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'entradas-saidas'] })
      setDeleteId(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {registros?.length ?? 0} registro(s)
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Registro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Entrada / Saída</DialogTitle>
            </DialogHeader>
            <EntradaSaidaForm
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
      ) : registros?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum registro de entrada ou saída.
        </div>
      ) : (
        <div className="space-y-2">
          {registros?.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {r.tipo === 'entrada' ? (
                  <PlaneLanding className="h-5 w-5 text-green-600" />
                ) : (
                  <PlaneTakeoff className="h-5 w-5 text-orange-500" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{formatDateJST(r.data_viagem)}</span>
                    <Badge
                      variant={r.tipo === 'entrada' ? 'success' : 'warning'}
                    >
                      {r.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </div>
                  {r.observacao && (
                    <p className="text-xs text-muted-foreground mt-0.5">{r.observacao}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditItem(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o: boolean) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          {editItem && (
            <EntradaSaidaForm
              defaultValues={{
                tipo: editItem.tipo,
                data_viagem: editItem.data_viagem,
                observacao: editItem.observacao ?? '',
              }}
              onSubmit={(data) => editMutation.mutate(data)}
              isLoading={editMutation.isPending}
              onCancel={() => setEditItem(null)}
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
            Deseja remover este registro?
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
