import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { formatDateJST } from '@ueno/utils/date'
import type { StatusProcesso } from '@ueno/firebase'

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

export function ClientesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusProcesso | ''>('')

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

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes?.length ?? 0} cliente(s) encontrado(s)`}
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
        <div className="flex gap-3">
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
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">CPF</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Cidade (JP)</th>
                  <th className="px-4 py-3 text-left font-medium">Cadastrado em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientes?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : null}
                {clientes?.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{cliente.profile.full_name}</td>
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
