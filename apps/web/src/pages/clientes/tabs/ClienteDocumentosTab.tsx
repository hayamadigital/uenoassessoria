import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Upload, Send, Trash2 } from 'lucide-react'
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
import { db, storage } from '@/lib/firebase'
import {
  getClienteDocumentos,
  listDocumentoTemplates,
  uploadDocumento,
  createClienteDocumento,
} from '@ueno/firebase/queries/documentos'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteDocumentoWithTemplate, StatusDocumento, ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

const statusLabel: Record<StatusDocumento, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  expirado: 'Expirado',
}

const statusVariant: Record<
  StatusDocumento,
  'default' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'
> = {
  pendente: 'warning',
  enviado: 'secondary',
  aprovado: 'success',
  reprovado: 'destructive',
  expirado: 'outline',
}

export function ClienteDocumentosTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'upload' | 'solicitar'>('upload')
  const [nomeDoc, setNomeDoc] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['clientes', cliente.id, 'documentos'],
    queryFn: () => getClienteDocumentos(db, cliente.id),
  })

  const { data: templates } = useQuery({
    queryKey: ['documento-templates'],
    queryFn: () => listDocumentoTemplates(db),
  })

  const soliciarMutation = useMutation({
    mutationFn: () =>
      createClienteDocumento(db, {
        cliente_id: cliente.id,
        template_id: templateId || null,
        nome_custom: nomeDoc || null,
        status: 'pendente',
        arquivo_url: null,
        arquivo_nome: null,
        arquivo_tamanho: null,
        arquivo_tipo: null,
        data_validade: null,
        observacao: null,
        revisado_por: null,
        revisado_em: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'documentos'] })
      handleClose()
    },
  })

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const filePath = await uploadDocumento(storage, cliente.id, file, file.name)
      await createClienteDocumento(db, {
        cliente_id: cliente.id,
        template_id: templateId || null,
        nome_custom: nomeDoc || file.name,
        status: 'enviado',
        arquivo_url: filePath,
        arquivo_nome: file.name,
        arquivo_tamanho: file.size,
        arquivo_tipo: file.type,
        data_validade: null,
        observacao: null,
        revisado_por: null,
        revisado_em: null,
      })
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id, 'documentos'] })
      handleClose()
    } finally {
      setUploading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setNomeDoc('')
    setTemplateId('')
    setFile(null)
    setMode('upload')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {documentos?.length ?? 0} documento(s)
        </h2>
        <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) handleClose(); else setOpen(true) }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Documento</DialogTitle>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  mode === 'upload'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-accent'
                }`}
                onClick={() => setMode('upload')}
              >
                <Upload className="inline mr-2 h-4 w-4" />
                Upload Manual
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  mode === 'solicitar'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-accent'
                }`}
                onClick={() => setMode('solicitar')}
              >
                <Send className="inline mr-2 h-4 w-4" />
                Solicitar
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Pasta / Categoria</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">Sem categoria</option>
                  {templates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Arquivo</Label>
                <Input
                  value={nomeDoc}
                  onChange={(e) => setNomeDoc(e.target.value)}
                  placeholder={mode === 'upload' ? 'Deixe em branco para usar o nome do arquivo' : 'Ex: Passaporte 2024'}
                />
              </div>
              {mode === 'upload' && (
                <div className="space-y-2">
                  <Label>Arquivo <span className="text-destructive">*</span></Label>
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancelar
              </Button>
              {mode === 'upload' ? (
                <Button
                  type="button"
                  isLoading={uploading}
                  disabled={!file}
                  onClick={handleUpload}
                >
                  Enviar
                </Button>
              ) : (
                <Button
                  type="button"
                  isLoading={soliciarMutation.isPending}
                  onClick={() => soliciarMutation.mutate()}
                >
                  Solicitar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : documentos?.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum documento cadastrado.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documentos?.map((doc) => (
            <DocumentoCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentoCard({ doc }: { doc: ClienteDocumentoWithTemplate }) {
  const nome = doc.nome_custom ?? doc.template?.nome ?? 'Documento'
  const categoria = doc.template?.nome

  return (
    <div className="rounded-md border p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{nome}</span>
        </div>
        <Badge variant={statusVariant[doc.status]}>{statusLabel[doc.status]}</Badge>
      </div>
      {categoria && (
        <p className="text-xs text-muted-foreground">Pasta: {categoria}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {formatDateJST(doc.created_at)}
      </p>
      {doc.arquivo_url && (
        <a
          href={doc.arquivo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Ver arquivo
        </a>
      )}
    </div>
  )
}
