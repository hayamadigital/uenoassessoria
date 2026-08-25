import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Pencil, Trash2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { listAvisos, deleteAviso, computeStatusAviso } from '@ueno/firebase/queries/avisos'
import { formatDateJST } from '@ueno/utils/date'
import type { Aviso, TipoAviso, StatusAviso, ConteudoAvisoTipo } from '@ueno/firebase'

const tipoLabel: Record<TipoAviso, string> = {
  logistica: 'Logística',
  promocao: 'Promoção',
  data_comemorativa: 'Data Comemorativa',
  geral: 'Geral',
}

const tipoVariant: Record<TipoAviso, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  logistica: 'destructive',
  promocao: 'default',
  data_comemorativa: 'warning',
  geral: 'secondary',
}

const statusLabel: Record<StatusAviso, string> = {
  agendado: 'Agendado',
  ativo: 'Ativo',
  encerrado: 'Encerrado',
}

const statusVariant: Record<StatusAviso, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  agendado: 'secondary',
  ativo: 'success',
  encerrado: 'outline',
}

const conteudoLabel: Record<ConteudoAvisoTipo, string> = {
  texto: 'Texto',
  imagens: 'Imagens',
}

const conteudoVariant: Record<ConteudoAvisoTipo, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  texto: 'outline',
  imagens: 'secondary',
}

export function AvisosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoAviso | ''>('')
  const [statusFiltro, setStatusFiltro] = useState<StatusAviso | ''>('')

  const { data: avisos = [], isLoading } = useQuery({
    queryKey: ['avisos'],
    queryFn: () => listAvisos(db),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAviso(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['avisos'] }),
  })

  const avisosComStatus = useMemo(
    () => avisos.map((a) => ({ ...a, _status: computeStatusAviso(a) })),
    [avisos],
  )

  const filtered = useMemo(() => {
    return avisosComStatus.filter((a) => {
      if (busca) {
        const q = busca.toLowerCase()
        if (!a.titulo.toLowerCase().includes(q) && !a.descricao.toLowerCase().includes(q)) return false
      }
      if (tipoFiltro && a.tipo !== tipoFiltro) return false
      if (statusFiltro && a._status !== statusFiltro) return false
      return true
    })
  }, [avisosComStatus, busca, tipoFiltro, statusFiltro])

  const ativos = avisosComStatus.filter((a) => a._status === 'ativo').length

  function handleDelete(aviso: Aviso) {
    if (!confirm(`Excluir aviso "${aviso.titulo}"?`)) return
    deleteMutation.mutate(aviso.id)
  }

  if (isLoading) return <Spinner className="m-auto mt-20" />

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Avisos"
        subtitle={`${ativos} ativo${ativos !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => navigate('/avisos/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Aviso
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar avisos..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-56"
        />
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value as TipoAviso | '')}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os tipos</option>
          {(Object.keys(tipoLabel) as TipoAviso[]).map((t) => (
            <option key={t} value={t}>{tipoLabel[t]}</option>
          ))}
        </select>
        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as StatusAviso | '')}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os status</option>
          {(Object.keys(statusLabel) as StatusAviso[]).map((s) => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum aviso encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-14">Banner</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Formato</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Segmento</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Publicação</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Encerramento</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((aviso) => (
                <tr key={aviso.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="w-10 h-7 rounded overflow-hidden bg-muted">
                      <img
                        src={aviso.banner_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      to={`/avisos/${aviso.id}/editar`}
                      className="hover:underline"
                    >
                      {aviso.titulo}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={tipoVariant[aviso.tipo]}>{tipoLabel[aviso.tipo]}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={conteudoVariant[aviso.conteudo_tipo ?? 'texto']}>
                      {conteudoLabel[aviso.conteudo_tipo ?? 'texto']}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">
                    {aviso.broadcast ? 'Todos' : aviso.tipos_processo.join(', ')}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatDateJST(aviso.data_publicacao)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatDateJST(aviso.data_encerramento)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={statusVariant[aviso._status]}>{statusLabel[aviso._status]}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/avisos/${aviso.id}/editar`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(aviso)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
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
