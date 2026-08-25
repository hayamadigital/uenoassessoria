import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import { listProcessosAtivos } from '@ueno/firebase/queries/processos'
import { formatDateJST } from '@ueno/utils/date'
import type { ClienteProcessoWithCliente, StatusClienteProcesso } from '@ueno/firebase'

function formatJpy(valor: number | null) {
  return valor != null ? `¥${valor.toLocaleString('ja-JP')}` : '—'
}

function statusLabel(status: string) {
  if (status === 'analise') return 'Em análise'
  if (status === 'ativo') return 'Ativo'
  return status
}

export function ProcessosPage() {
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [servicoFiltro, setServicoFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusClienteProcesso | ''>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')

  const { data: processos = [], isLoading } = useQuery({
    queryKey: ['processos', 'ativos'],
    queryFn: () => listProcessosAtivos(db),
  })

  const clientesOptions = useMemo(() => {
    const map = new Map<string, string>()
    processos.forEach((processo) => {
      map.set(processo.cliente_id, processo.cliente.profile.full_name)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [processos])

  const servicosOptions = useMemo(() => {
    const map = new Map<string, string>()
    processos.forEach((processo) => {
      map.set(processo.servico_id, processo.servico.nome)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [processos])

  const processosFiltrados = useMemo(() => {
    return processos.filter((processo) => {
      const dataRef = processo.data_inicio ?? processo.created_at.slice(0, 10)
      const valor = processo.valor_acordado_jpy

      if (clienteFiltro && processo.cliente_id !== clienteFiltro) return false
      if (servicoFiltro && processo.servico_id !== servicoFiltro) return false
      if (statusFiltro && processo.status !== statusFiltro) return false
      if (dataInicio && dataRef < dataInicio) return false
      if (dataFim && dataRef > dataFim) return false
      if (valorMin && (valor == null || valor < Number(valorMin))) return false
      if (valorMax && (valor == null || valor > Number(valorMax))) return false

      return true
    })
  }, [clienteFiltro, dataFim, dataInicio, processos, servicoFiltro, statusFiltro, valorMax, valorMin])

  function limparFiltros() {
    setClienteFiltro('')
    setServicoFiltro('')
    setStatusFiltro('')
    setDataInicio('')
    setDataFim('')
    setValorMin('')
    setValorMax('')
  }

  const filtrosAtivos = Boolean(clienteFiltro || servicoFiltro || statusFiltro || dataInicio || dataFim || valorMin || valorMax)

  return (
    <div>
      <PageHeader
        title="Processos"
        subtitle="Acompanhamento dos processos em análise e ativos, com etapas, contratos, documentos e pagamentos."
        actions={<Badge variant="default">{processosFiltrados.length} processo(s)</Badge>}
      />

      <div className="p-8 space-y-4">
        <div className="rounded-md border bg-background p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                value={clienteFiltro}
                onChange={(event) => setClienteFiltro(event.target.value)}
              >
                <option value="">Todos os clientes</option>
                {clientesOptions.map(([id, nome]) => (
                  <option key={id} value={id}>{nome}</option>
                ))}
              </select>
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={servicoFiltro}
              onChange={(event) => setServicoFiltro(event.target.value)}
            >
              <option value="">Todos os serviços</option>
              {servicosOptions.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFiltro}
              onChange={(event) => setStatusFiltro(event.target.value as StatusClienteProcesso | '')}
            >
              <option value="">Todos os status</option>
              <option value="analise">Em análise</option>
              <option value="ativo">Ativo</option>
            </select>

            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Valor mín."
                value={valorMin}
                onChange={(event) => setValorMin(event.target.value)}
              />
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Valor máx."
                value={valorMax}
                onChange={(event) => setValorMax(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <Input
              type="date"
              className="w-auto"
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              title="Data inicial"
            />
            <Input
              type="date"
              className="w-auto"
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              title="Data final"
            />
            {filtrosAtivos && (
              <Button type="button" variant="outline" onClick={limparFiltros}>
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : processos.length === 0 ? (
          <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
            Nenhum processo em análise ou ativo no momento.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Serviço</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Valor</th>
                  <th className="px-4 py-3 text-left font-medium">Criado em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {processosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum processo encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : null}
                {processosFiltrados.map((processo) => (
                  <ProcessoRow key={processo.id} processo={processo} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ProcessoRow({ processo }: { processo: ClienteProcessoWithCliente }) {
  const servicoNome = processo.variacao
    ? `${processo.servico.nome} — ${processo.variacao.nome}`
    : processo.servico.nome

  return (
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="font-medium">{processo.cliente.profile.full_name}</div>
        <div className="text-xs text-muted-foreground">{processo.cliente.profile.email}</div>
      </td>
      <td className="px-4 py-3">
        <Link to={`/processos/${processo.id}`} className="font-medium text-foreground hover:text-primary">
          {servicoNome}
        </Link>
      </td>
      <td className="px-4 py-3">
        <Badge variant={processo.status === 'analise' ? 'warning' : 'outline'}>
          {statusLabel(processo.status)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {processo.data_inicio ? formatDateJST(processo.data_inicio) : '—'}
      </td>
      <td className="px-4 py-3 font-medium">{formatJpy(processo.valor_acordado_jpy)}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDateJST(processo.created_at)}</td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/processos/${processo.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Ver detalhes
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  )
}
