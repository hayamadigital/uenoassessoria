import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, X, Eye, User, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import {
  listPendingDocumentosWithClientes,
  listDocumentoTemplates,
  updateDocumentoStatus,
  getDocumentoSignedUrl,
} from '@ueno/firebase/queries/documentos'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { formatDateJST } from '@ueno/utils/date'
import { useAuthStore } from '@/stores/auth.store'
import type { ClienteDocumentoWithTemplateAndCliente } from '@ueno/firebase'

export function RevisaoDocumentosTab() {
  const queryClient = useQueryClient()
  const revisorId = useAuthStore((s) => s.session?.userId ?? '')

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [previewDoc, setPreviewDoc] = useState<ClienteDocumentoWithTemplateAndCliente | null>(null)

  const [filterClienteId, setFilterClienteId] = useState('')
  const [filterTemplateId, setFilterTemplateId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['documentos', 'pending'],
    queryFn: () => listPendingDocumentosWithClientes(db),
  })

  const { data: templates } = useQuery({
    queryKey: ['documento-templates'],
    queryFn: () => listDocumentoTemplates(db),
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes', 'list'],
    queryFn: () => listClientes(db),
  })

  const { data: signedUrl, isLoading: loadingUrl } = useQuery({
    queryKey: ['documento-signed-url', previewDoc?.arquivo_url],
    queryFn: () => getDocumentoSignedUrl(db, previewDoc!.arquivo_url!),
    enabled: !!previewDoc?.arquivo_url,
    staleTime: 1000 * 60 * 50,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => updateDocumentoStatus(db, id, 'aprovado', revisorId),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['documentos', 'pending'] })
      const previous = queryClient.getQueryData<ClienteDocumentoWithTemplateAndCliente[]>(['documentos', 'pending'])
      queryClient.setQueryData<ClienteDocumentoWithTemplateAndCliente[]>(
        ['documentos', 'pending'],
        (old) => old?.filter((d) => d.id !== id) ?? [],
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['documentos', 'pending'], ctx.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['documentos', 'pending'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      updateDocumentoStatus(db, id, 'reprovado', revisorId, reason),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['documentos', 'pending'] })
      const previous = queryClient.getQueryData<ClienteDocumentoWithTemplateAndCliente[]>(['documentos', 'pending'])
      queryClient.setQueryData<ClienteDocumentoWithTemplateAndCliente[]>(
        ['documentos', 'pending'],
        (old) => old?.filter((d) => d.id !== id) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['documentos', 'pending'], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', 'pending'] })
      setRejectingId(null)
      setRejectReason('')
    },
  })

  const filtered = (documentos ?? []).filter((doc) => {
    if (filterClienteId && doc.cliente_id !== filterClienteId) return false
    if (filterTemplateId && doc.template_id !== filterTemplateId) return false
    if (filterDateFrom && doc.created_at < filterDateFrom) return false
    if (filterDateTo && doc.created_at > filterDateTo + 'T23:59:59') return false
    return true
  })

  const isPreviewable = (tipo: string | null) =>
    tipo?.includes('pdf') || tipo?.includes('image')

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterClienteId}
          onChange={(e) => setFilterClienteId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os clientes</option>
          {clientes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.profile?.full_name ?? c.id}
            </option>
          ))}
        </select>
        <select
          value={filterTemplateId}
          onChange={(e) => setFilterTemplateId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os tipos</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="De"
        />
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Até"
        />
        {(filterClienteId || filterTemplateId || filterDateFrom || filterDateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterClienteId('')
              setFilterTemplateId('')
              setFilterDateFrom('')
              setFilterDateTo('')
            }}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhum documento aguardando revisão.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Documento</th>
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Enviado em</th>
                <th className="px-4 py-3 text-left font-medium">Arquivo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((doc) => (
                <>
                  <tr key={doc.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {doc.cliente?.profile?.avatar_url ? (
                          <img
                            src={doc.cliente.profile.avatar_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">
                          {doc.cliente?.profile?.full_name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {doc.nome_custom ?? doc.template?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.template?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateJST(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {doc.arquivo_nome ? (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {doc.arquivo_nome}
                          </span>
                          {doc.arquivo_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5"
                              onClick={() => setPreviewDoc(doc)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(doc.id)}
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant={rejectingId === doc.id ? 'destructive' : 'ghost'}
                          onClick={() => {
                            if (rejectingId === doc.id) {
                              setRejectingId(null)
                              setRejectReason('')
                            } else {
                              setRejectingId(doc.id)
                              setRejectReason('')
                            }
                          }}
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Reprovar
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {rejectingId === doc.id && (
                    <tr key={`${doc.id}-reject`} className="bg-destructive/5">
                      <td colSpan={6} className="px-4 pb-3 pt-1">
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-medium text-destructive">
                              Motivo da reprovação
                            </p>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              rows={2}
                              placeholder="Descreva o motivo para o cliente..."
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex gap-1 pb-0.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              isLoading={rejectMutation.isPending}
                              disabled={!rejectReason.trim()}
                              onClick={() =>
                                rejectMutation.mutate({ id: doc.id, reason: rejectReason.trim() })
                              }
                            >
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingId(null)
                                setRejectReason('')
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => { if (!o) setPreviewDoc(null) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewDoc?.nome_custom ?? previewDoc?.template?.nome ?? 'Documento'}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-[400px] rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden">
            {loadingUrl ? (
              <Spinner />
            ) : signedUrl ? (
              isPreviewable(previewDoc?.arquivo_tipo ?? null) ? (
                previewDoc?.arquivo_tipo?.includes('pdf') ? (
                  <iframe
                    src={signedUrl}
                    title="preview"
                    className="h-[500px] w-full"
                  />
                ) : (
                  <img
                    src={signedUrl}
                    alt="preview"
                    className="max-h-[500px] max-w-full object-contain"
                  />
                )
              ) : (
                <div className="text-center space-y-3">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Visualização não disponível para este tipo de arquivo.
                  </p>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Baixar arquivo
                  </a>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Erro ao carregar o arquivo.</p>
            )}
          </div>
          {previewDoc && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Cliente: <strong>{previewDoc.cliente?.profile?.full_name ?? '—'}</strong>
              </span>
              <Badge variant="secondary">Aguardando revisão</Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
