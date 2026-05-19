import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, X, Eye, User, FileText, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { SortableTh } from '@/components/ui/sortable-th'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { db, storage } from '@/lib/firebase'
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
import { includesText, nextSort, sortBy, type SortState } from '@/utils/table'

export function RevisaoDocumentosTab() {
  const queryClient = useQueryClient()
  const revisorId = useAuthStore((s) => s.session?.userId ?? '')

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [previewDoc, setPreviewDoc] = useState<ClienteDocumentoWithTemplateAndCliente | null>(null)

  const [filterClienteId, setFilterClienteId] = useState('')
  const [filterTemplateId, setFilterTemplateId] = useState('')
  const [busca, setBusca] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sort, setSort] = useState<SortState<'cliente' | 'documento' | 'template' | 'created_at' | 'arquivo'>>({
    key: 'created_at',
    direction: 'desc',
  })

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
    queryFn: () => getDocumentoSignedUrl(storage, previewDoc!.arquivo_url!),
    enabled: !!previewDoc?.arquivo_url,
    staleTime: 1000 * 60 * 50,
  })

  const approveMutation = useMutation({
    mutationFn: (doc: ClienteDocumentoWithTemplateAndCliente) =>
      updateDocumentoStatus(db, doc.cliente_id, doc.id, 'aprovado', revisorId),
    onMutate: async (doc) => {
      await queryClient.cancelQueries({ queryKey: ['documentos', 'pending'] })
      const previous = queryClient.getQueryData<ClienteDocumentoWithTemplateAndCliente[]>(['documentos', 'pending'])
      queryClient.setQueryData<ClienteDocumentoWithTemplateAndCliente[]>(
        ['documentos', 'pending'],
        (old) => old?.filter((d) => d.id !== doc.id) ?? [],
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
    mutationFn: ({ doc, reason }: { doc: ClienteDocumentoWithTemplateAndCliente; reason: string }) =>
      updateDocumentoStatus(db, doc.cliente_id, doc.id, 'reprovado', revisorId, reason),
    onMutate: async ({ doc }) => {
      await queryClient.cancelQueries({ queryKey: ['documentos', 'pending'] })
      const previous = queryClient.getQueryData<ClienteDocumentoWithTemplateAndCliente[]>(['documentos', 'pending'])
      queryClient.setQueryData<ClienteDocumentoWithTemplateAndCliente[]>(
        ['documentos', 'pending'],
        (old) => old?.filter((d) => d.id !== doc.id) ?? [],
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

  const filtered = useMemo(() => {
    const rows = (documentos ?? []).filter((doc) => {
      if (filterClienteId && doc.cliente_id !== filterClienteId) return false
      if (filterTemplateId && doc.template_id !== filterTemplateId) return false
      if (filterDateFrom && doc.created_at < filterDateFrom) return false
      if (filterDateTo && doc.created_at > filterDateTo + 'T23:59:59') return false
      return includesText(
        [
          doc.cliente?.profile?.full_name,
          doc.nome_custom,
          doc.template?.nome,
          doc.arquivo_nome,
        ].join(' '),
        busca,
      )
    })

    return sortBy(rows, sort, {
      cliente: (doc) => doc.cliente?.profile?.full_name,
      documento: (doc) => doc.nome_custom ?? doc.template?.nome,
      template: (doc) => doc.template?.nome,
      created_at: (doc) => doc.created_at,
      arquivo: (doc) => doc.arquivo_nome,
    })
  }, [busca, documentos, filterClienteId, filterDateFrom, filterDateTo, filterTemplateId, sort])

  const isPreviewable = (tipo: string | null) =>
    tipo?.includes('pdf') || tipo?.includes('image')

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, documento ou arquivo..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
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
        {(filterClienteId || filterTemplateId || filterDateFrom || filterDateTo || busca) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterClienteId('')
              setFilterTemplateId('')
              setBusca('')
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
                <SortableTh sort={sort} sortKey="cliente" onSort={(key) => setSort(nextSort(sort, key))}>Cliente</SortableTh>
                <SortableTh sort={sort} sortKey="documento" onSort={(key) => setSort(nextSort(sort, key))}>Documento</SortableTh>
                <SortableTh sort={sort} sortKey="template" onSort={(key) => setSort(nextSort(sort, key))}>Template</SortableTh>
                <SortableTh sort={sort} sortKey="created_at" onSort={(key) => setSort(nextSort(sort, key))}>Enviado em</SortableTh>
                <SortableTh sort={sort} sortKey="arquivo" onSort={(key) => setSort(nextSort(sort, key))}>Arquivo</SortableTh>
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
                          onClick={() => approveMutation.mutate(doc)}
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
                                rejectMutation.mutate({ doc, reason: rejectReason.trim() })
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
      <Dialog open={!!previewDoc} onOpenChange={(o: boolean) => { if (!o) setPreviewDoc(null) }}>
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
