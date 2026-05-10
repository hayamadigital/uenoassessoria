import { useQuery } from '@tanstack/react-query'
import { Users, CalendarDays, FileText, CreditCard, ScrollText, TrendingUp } from 'lucide-react'
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import { formatJPY } from '@ueno/utils/currency'
import { formatDateJST, getTodayJST, getJSTDayStartUTC, getJSTDayEndUTC } from '@ueno/utils/date'
import type { DashboardKPIs } from '@ueno/types'

async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const todayJST = getTodayJST()
  const mesAtual = todayJST.slice(0, 7)
  const inicioMes = new Date(`${mesAtual}-01T00:00:00Z`)

  const [
    clientesAtivos,
    agendamentosHoje,
    docsPendentes,
    pagamentosMes,
    contratosPendentes,
    novosMes,
  ] = await Promise.all([
    getCountFromServer(
      query(
        collection(db, 'clientes'),
        where('status_processo', 'in', ['contato', 'documentacao', 'agendado', 'em_andamento']),
      ),
    ),
    getCountFromServer(
      query(
        collection(db, 'agendamentos'),
        where('data_hora_inicio', '>=', getJSTDayStartUTC(todayJST)),
        where('data_hora_inicio', '<=', getJSTDayEndUTC(todayJST)),
      ),
    ),
    getCountFromServer(
      query(
        collection(db, 'clientes'),
        // documentos is a subcollection — count pending via top-level collection group approximation
        // For now count clientes with status 'documentacao' as proxy
        where('status_processo', '==', 'documentacao'),
      ),
    ),
    getDocs(
      query(
        collection(db, 'pagamentos'),
        where('status', '==', 'pago'),
        where('created_at', '>=', inicioMes),
      ),
    ),
    getCountFromServer(
      query(collection(db, 'contratos'), where('status', '==', 'enviado')),
    ),
    getCountFromServer(
      query(collection(db, 'clientes'), where('created_at', '>=', inicioMes)),
    ),
  ])

  const receitaMes = pagamentosMes.docs.reduce(
    (acc, doc) => acc + ((doc.data().valor_jpy as number) ?? 0),
    0,
  )

  return {
    clientes_ativos: clientesAtivos.data().count,
    agendamentos_hoje: agendamentosHoje.data().count,
    documentos_pendentes: docsPendentes.data().count,
    receita_mes_jpy: receitaMes,
    contratos_pendentes: contratosPendentes.data().count,
    novos_clientes_mes: novosMes.data().count,
  }
}

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle?: string
}

function KPICard({ title, value, icon: Icon, color, subtitle }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: fetchDashboardKPIs,
    refetchInterval: 60_000,
  })

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral — ${formatDateJST(new Date().toISOString())}`}
      />

      <div className="p-8 space-y-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KPICard
                title="Clientes Ativos"
                value={kpis?.clientes_ativos ?? 0}
                icon={Users}
                color="bg-blue-500"
                subtitle="Em processo"
              />
              <KPICard
                title="Agendamentos Hoje"
                value={kpis?.agendamentos_hoje ?? 0}
                icon={CalendarDays}
                color="bg-violet-500"
              />
              <KPICard
                title="Docs Pendentes"
                value={kpis?.documentos_pendentes ?? 0}
                icon={FileText}
                color="bg-orange-500"
                subtitle="Aguardando revisão"
              />
              <KPICard
                title="Receita do Mês"
                value={formatJPY(kpis?.receita_mes_jpy ?? 0)}
                icon={CreditCard}
                color="bg-green-500"
              />
              <KPICard
                title="Contratos Pendentes"
                value={kpis?.contratos_pendentes ?? 0}
                icon={ScrollText}
                color="bg-pink-500"
                subtitle="Aguardando assinatura"
              />
              <KPICard
                title="Novos Clientes"
                value={kpis?.novos_clientes_mes ?? 0}
                icon={TrendingUp}
                color="bg-teal-500"
                subtitle="Este mês"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
