import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { listContratos, createContrato, updateContratoStatus } from '@ueno/firebase/queries/contratos'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteWithProfile, StatusContrato } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

const statusLabel: Record<StatusContrato, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
}

const statusVariant: Record<
  StatusContrato,
  'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'
> = {
  rascunho: 'secondary',
  enviado: 'warning',
  assinado: 'success',
  cancelado: 'destructive',
}

export function ClienteContratosTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [corpoHtml, setCorpoHtml] = useState('')
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'contratos'],
    queryFn: () => listContratos(db, cliente.id),
  })

  const addMutation = useMutation({
    mutationFn: () =>
      createContrato(db, {
        cliente_id: cliente.id,
        servico_id: null,
        titulo,
        corpo_html: corpoHtml,
        status: 'rascunho',
        assinado_em: null,
        assinatura_url: null,
        ip_assinatura: null,
        pdf_url: null,
        enviado_por: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'contratos'] })
      handleClose()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateContratoStatus(db, id, 'cancelado'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'contratos'] })
      setCancelId(null)
    },
  })

  function handleClose() {
    setAddOpen(false)
    setTitulo('')
    setCorpoHtml('')
  }

  const canSubmit = titulo.trim().length >= 2 && corpoHtml.trim().length >= 10

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {contratos?.length ?? 0} contrato(s)
        </h2>
        <Dialog open={addOpen} onOpenChange={(o) => { if (!o) handleClose(); else setAddOpen(true) }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título <span className="text-destructive">*</span></Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviços"
                />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo do Contrato <span className="text-destructive">*</span></Label>
                <textarea
                  value={corpoHtml}
                  onChange={(e) => setCorpoHtml(e.target.value)}
                  className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="Conteúdo do contrato (HTML ou texto)..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                disabled={!canSubmit}
                isLoading={addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                Criar Rascunho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : contratos?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum contrato cadastrado.
        </div>
      ) : (
        <div className="space-y-2">
          {contratos?.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between rounded-md border px-4 py-3 gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{c.titulo}</span>
                    <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Criado em {formatDateJST(c.created_at)}
                    {c.assinado_em && ` · Assinado em ${formatDateJST(c.assinado_em)}`}
                  </p>
                  {c.pdf_url && (
                    <a
                      href={c.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver PDF
                    </a>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {(c.status === 'rascunho' || c.status === 'enviado') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setCancelId(c.id)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirm */}
      <Dialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Deseja cancelar este contrato? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              isLoading={cancelMutation.isPending}
              onClick={() => cancelId && cancelMutation.mutate(cancelId)}
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
