import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { SortableTh } from '@/components/ui/sortable-th'
import { db } from '@/lib/firebase'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { formatDateJST } from '@ueno/utils/date'
import type { StatusProcesso } from '@ueno/firebase'
import { includesText, isWithinDateRange, nextSort, sortBy, type ActiveFilter, type SortState } from '@/utils/table'

const statusBadgeVariant: Record<StatusProcesso, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  prospect: 'outline',
  contato: 'secondary',
  documentacao: 'warning',
  agendado: 'default',
  em_andamento: 'default',
  aprovado: 'success',
  concluido: 'success',
  cancelado: 'destructive',
}

const statusLabel: Record<StatusProcesso, string> = {
  prospect: 'Prospecto',
  contato: 'Em Contato',
  documentacao: 'Documentação',
  agendado: 'Agendado',
  em_andamento: 'Em Andamento',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

function ClienteAvatar({ name, url }: { name: string; url?: string | null }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CL'

  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
      {url && !failed ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}

export function ClientesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusProcesso | ''>('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sort, setSort] = useState<SortState<'nome' | 'email' | 'cpf' | 'status' | 'cidade' | 'created_at'>>({
    key: 'created_at',
    direction: 'desc',
  })

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes', { search, status: statusFilter }],
    queryFn: () => {
      const filters: { status?: StatusProcesso; search?: string } = {}
      if (statusFilter) filters.status = statusFilter
      if (search) filters.search = search
      return listClientes(db, filters)
    },
    staleTime: 0,
  })

  const clientesFiltrados = useMemo(() => {
    const activeStatuses: StatusProcesso[] = ['prospect', 'contato', 'documentacao', 'agendado', 'em_andamento', 'aprovado']
    const filtered = (clientes ?? []).filter((cliente) => {
      const isActive = activeStatuses.includes(cliente.status_processo)
      if (activeFilter === 'active' && !isActive) return false
      if (activeFilter === 'inactive' && isActive) return false
      if (!includesText(
        [
          cliente.profile.full_name,
          cliente.profile.email,
          cliente.cpf,
          cliente.cidade_jp,
          cliente.nacionalidade,
          statusLabel[cliente.status_processo],
        ].join(' '),
        search,
      )) return false
      return isWithinDateRange(cliente.created_at, createdFrom, createdTo)
    })

    return sortBy(filtered, sort, {
      nome: (cliente) => cliente.profile.full_name,
      email: (cliente) => cliente.profile.email,
      cpf: (cliente) => cliente.cpf,
      status: (cliente) => statusLabel[cliente.status_processo],
      cidade: (cliente) => cliente.cidade_jp,
      created_at: (cliente) => cliente.created_at,
    })
  }, [activeFilter, clientes, createdFrom, createdTo, search, sort])

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientesFiltrados.length} cliente(s) encontrado(s)`}
        actions={
          <Link to="/clientes/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </Link>
        }
      />

      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Ativos e inativos</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusProcesso | '')}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabel).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
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

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <SortableTh sort={sort} sortKey="nome" onSort={(key) => setSort(nextSort(sort, key))}>Nome</SortableTh>
                  <SortableTh sort={sort} sortKey="email" onSort={(key) => setSort(nextSort(sort, key))}>Email</SortableTh>
                  <SortableTh sort={sort} sortKey="cpf" onSort={(key) => setSort(nextSort(sort, key))}>CPF</SortableTh>
                  <SortableTh sort={sort} sortKey="status" onSort={(key) => setSort(nextSort(sort, key))}>Status</SortableTh>
                  <SortableTh sort={sort} sortKey="cidade" onSort={(key) => setSort(nextSort(sort, key))}>Cidade (JP)</SortableTh>
                  <SortableTh sort={sort} sortKey="created_at" onSort={(key) => setSort(nextSort(sort, key))}>Cadastrado em</SortableTh>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : null}
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClienteAvatar
                          name={cliente.profile.full_name ?? 'Cliente'}
                          url={cliente.profile.avatar_url}
                        />
                        <span className="font-medium">{cliente.profile.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cliente.profile.email}</td>
                    <td className="px-4 py-3">{cliente.cpf ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant[cliente.status_processo]}>
                        {statusLabel[cliente.status_processo]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{cliente.cidade_jp ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateJST(cliente.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/clientes/${cliente.id}/processo`}
                        className="text-primary underline-offset-4 hover:underline text-xs"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
