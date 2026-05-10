import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { listHistoricoByCliente, createHistorico } from '@ueno/firebase/queries/historico'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

export function ClienteHistoricoTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [acao, setAcao] = useState('')
  const [descricao, setDescricao] = useState('')

  const { data: historico, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'historico'],
    queryFn: () => listHistoricoByCliente(db, cliente.id),
  })

  const mutation = useMutation({
    mutationFn: () =>
      createHistorico(db, {
        cliente_id: cliente.id,
        acao,
        descricao: descricao || null,
        responsavel_id: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'historico'] })
      setOpen(false)
      setAcao('')
      setDescricao('')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {historico?.length ?? 0} registro(s)
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Nota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nota ao Histórico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Ação <span className="text-destructive">*</span></Label>
                <Input
                  value={acao}
                  onChange={(e) => setAcao(e.target.value)}
                  placeholder="Ex: Contato realizado, Documento recebido..."
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                isLoading={mutation.isPending}
                disabled={!acao.trim()}
                onClick={() => mutation.mutate()}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : historico?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum registro no histórico.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Ação</th>
                <th className="px-4 py-3 text-left font-medium">Descrição</th>
                <th className="px-4 py-3 text-left font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {historico?.map((h) => (
                <tr key={h.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDateJST(h.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium">{h.acao}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.descricao ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {h.responsavel?.full_name ?? 'Sistema'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
