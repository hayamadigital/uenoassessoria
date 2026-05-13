# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o DashboardPage atual por visão gerencial com 4 KPI cards com tendência, gráfico de receita mensal (recharts) e ações rápidas.

**Architecture:** Um único arquivo `DashboardPage.tsx` com componentes locais (`KPICard`, `RevenueChart`, `QuickActions`) e uma função `fetchDashboardKPIs` que paraleliza 8 queries Firestore via `Promise.all`. Sem novos arquivos ou dependências.

**Tech Stack:** React 19, TanStack Query v5, recharts 2.x, Firebase Firestore, Tailwind CSS, TypeScript

---

## Files

- **Modify:** `apps/web/src/pages/dashboard/DashboardPage.tsx` — reescrita completa

---

## Task 1: Implementar o DashboardPage completo

**Files:**
- Modify: `apps/web/src/pages/dashboard/DashboardPage.tsx`

### Contexto das queries existentes

Antes de escrever, leia rapidamente as assinaturas:

- `getDashboardFinanceiro(db, mes: string)` em `packages/firebase/src/queries/financeiro.ts` → `{ total_pago_mes, total_pendente, ... }` — filtra por `created_at` do mês
- `getResumoMultiplosMeses(db, meses: string[])` no mesmo arquivo → array de `{ mes, total_pago_mes, ... }`
- `getTodayJST()`, `getJSTDayStartUTC(date)`, `getJSTDayEndUTC(date)`, `formatTimeJST(iso)`, `formatDateJST(iso)` em `@ueno/utils/date`
- `formatJPY(value)` em `@ueno/utils/currency`

- [ ] **Step 1: Escrever o arquivo completo**

Substitua todo o conteúdo de `apps/web/src/pages/dashboard/DashboardPage.tsx` pelo seguinte:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore'
import { CreditCard, AlertCircle, Users, CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import {
  getDashboardFinanceiro,
  getResumoMultiplosMeses,
} from '@ueno/firebase/queries/financeiro'
import {
  getTodayJST,
  getJSTDayStartUTC,
  getJSTDayEndUTC,
  formatTimeJST,
  formatDateJST,
} from '@ueno/utils/date'
import { formatJPY } from '@ueno/utils/currency'

// ── Types ─────────────────────────────────────────────────────────────

interface DashboardData {
  receita_mes_jpy: number
  receita_pendente_jpy: number
  pendentes_atrasados: number
  pendentes_proximos: number
  delta_receita_pct: number
  clientes_ativos: number
  novos_clientes_mes: number
  agendamentos_hoje: number
  proximo_agendamento_hora: string | null
  historico_receita: { mes: string; valor: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────

function getLast6Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    )
  }
  return months
}

function getPrevMonth(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Data fetch ────────────────────────────────────────────────────────

async function fetchDashboardKPIs(): Promise<DashboardData> {
  const todayJST = getTodayJST() // 'YYYY-MM-DD'
  const mesAtual = todayJST.slice(0, 7)
  const mesAnterior = getPrevMonth(mesAtual)
  const inicioMes = new Date(`${mesAtual}-01T00:00:00Z`).toISOString()

  const em7Dias = new Date()
  em7Dias.setDate(em7Dias.getDate() + 7)
  const em7DiasStr = em7Dias.toISOString().slice(0, 10)

  const [
    finAtual,
    finAnterior,
    clientesAtivosSnap,
    novosClientesSnap,
    agendHojeCountSnap,
    primeiroAgendSnap,
    pagPendentesSnap,
    historicoMeses,
  ] = await Promise.all([
    getDashboardFinanceiro(db, mesAtual),
    getDashboardFinanceiro(db, mesAnterior),
    getCountFromServer(
      query(
        collection(db, 'clientes'),
        where('status_processo', 'in', [
          'contato',
          'documentacao',
          'agendado',
          'em_andamento',
        ]),
      ),
    ),
    getCountFromServer(
      query(
        collection(db, 'clientes'),
        where('created_at', '>=', inicioMes),
      ),
    ),
    getCountFromServer(
      query(
        collection(db, 'agendamentos'),
        where('data_hora_inicio', '>=', getJSTDayStartUTC(todayJST)),
        where('data_hora_inicio', '<=', getJSTDayEndUTC(todayJST)),
      ),
    ),
    getDocs(
      query(
        collection(db, 'agendamentos'),
        where('data_hora_inicio', '>=', getJSTDayStartUTC(todayJST)),
        where('data_hora_inicio', '<=', getJSTDayEndUTC(todayJST)),
        orderBy('data_hora_inicio', 'asc'),
        limit(1),
      ),
    ),
    getDocs(
      query(
        collection(db, 'pagamentos'),
        where('status', '==', 'pendente'),
      ),
    ),
    getResumoMultiplosMeses(db, getLast6Months()),
  ])

  const pagamentos = pagPendentesSnap.docs.map(
    (d) => d.data() as { valor_jpy: number; data_vencimento?: string },
  )

  const receitaPendenteJpy = pagamentos.reduce(
    (acc, p) => acc + (p.valor_jpy ?? 0),
    0,
  )

  const pendentesAtrasados = pagamentos.filter(
    (p) => p.data_vencimento && p.data_vencimento < todayJST,
  ).length

  const pendentesProximos = pagamentos.filter(
    (p) =>
      p.data_vencimento &&
      p.data_vencimento >= todayJST &&
      p.data_vencimento <= em7DiasStr,
  ).length

  const deltaPct =
    finAnterior.total_pago_mes > 0
      ? Math.round(
          ((finAtual.total_pago_mes - finAnterior.total_pago_mes) /
            finAnterior.total_pago_mes) *
            100,
        )
      : 0

  const primeiroDoc = primeiroAgendSnap.docs[0]?.data() as
    | { data_hora_inicio: string }
    | undefined
  const proximaHora = primeiroDoc
    ? formatTimeJST(primeiroDoc.data_hora_inicio)
    : null

  return {
    receita_mes_jpy: finAtual.total_pago_mes,
    receita_pendente_jpy: receitaPendenteJpy,
    pendentes_atrasados: pendentesAtrasados,
    pendentes_proximos: pendentesProximos,
    delta_receita_pct: deltaPct,
    clientes_ativos: clientesAtivosSnap.data().count,
    novos_clientes_mes: novosClientesSnap.data().count,
    agendamentos_hoje: agendHojeCountSnap.data().count,
    proximo_agendamento_hora: proximaHora,
    historico_receita: historicoMeses.map((m) => ({
      mes: m.mes,
      valor: m.total_pago_mes,
    })),
  }
}

// ── KPICard ───────────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: string | number
  borderColor: string
  iconBg: string
  icon: React.ElementType
  subtitleText: string
  subtitleColor: string
}

function KPICard({
  label,
  value,
  borderColor,
  iconBg,
  icon: Icon,
  subtitleText,
  subtitleColor,
}: KPICardProps) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      style={{ borderLeftColor: borderColor, borderLeftWidth: 4 }}
    >
      <div className="mb-2.5 flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <div className="rounded-md p-1.5" style={{ background: iconBg }}>
          <Icon className="h-3.5 w-3.5" style={{ color: borderColor }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="mt-1 text-[11px]" style={{ color: subtitleColor }}>
        {subtitleText}
      </p>
    </div>
  )
}

// ── RevenueChart ──────────────────────────────────────────────────────

const MONTH_LABELS: Record<string, string> = {
  '01': 'JAN',
  '02': 'FEV',
  '03': 'MAR',
  '04': 'ABR',
  '05': 'MAI',
  '06': 'JUN',
  '07': 'JUL',
  '08': 'AGO',
  '09': 'SET',
  '10': 'OUT',
  '11': 'NOV',
  '12': 'DEZ',
}

interface RevenueChartProps {
  data: { mes: string; valor: number }[]
}

function RevenueChart({ data }: RevenueChartProps) {
  const currentMes = getTodayJST().slice(0, 7)
  const chartData = data.map((d) => ({
    name: MONTH_LABELS[d.mes.slice(5, 7)] ?? d.mes.slice(5, 7),
    valor: d.valor,
    isCurrent: d.mes === currentMes,
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Receita Mensal
          </p>
          <p className="text-xs text-muted-foreground">Últimos 6 meses (¥)</p>
        </div>
        <Link
          to="/financeiro"
          className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          Ver financeiro →
        </Link>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} barSize={32}>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <Tooltip
            formatter={(value: number) => [formatJPY(value), 'Receita']}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          />
          <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isCurrent ? '#8b5cf6' : '#ddd6fe'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── QuickActions ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: '+ Novo Cliente',
    to: '/clientes/novo',
    color: '#1e40af',
    border: '#eff6ff',
    dot: '#3b82f6',
  },
  {
    label: '+ Novo Agendamento',
    to: '/agendamentos/novo',
    color: '#6d28d9',
    border: '#f5f3ff',
    dot: '#8b5cf6',
  },
  {
    label: '+ Novo Contrato',
    to: '/contratos',
    color: '#be185d',
    border: '#fdf2f8',
    dot: '#ec4899',
  },
  {
    label: 'Ver Pendências',
    to: '/financeiro',
    color: '#c2410c',
    border: '#fff7ed',
    dot: '#f97316',
  },
] as const

function QuickActions() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3.5 text-sm font-semibold text-foreground">
        Ações Rápidas
      </p>
      <div className="flex flex-col gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-medium transition-opacity hover:opacity-75"
            style={{ borderColor: a.border, color: a.color }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: a.dot }}
            />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── DashboardPage ─────────────────────────────────────────────────────

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'kpis-v2'],
    queryFn: fetchDashboardKPIs,
    refetchInterval: 60_000,
  })

  const deltaPct = data?.delta_receita_pct ?? 0
  const atrasados = data?.pendentes_atrasados ?? 0

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral — ${formatDateJST(new Date().toISOString())}`}
      />

      <div className="space-y-5 p-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-4">
              <KPICard
                label="Receita do Mês"
                value={formatJPY(data?.receita_mes_jpy ?? 0)}
                borderColor="#22c55e"
                iconBg="#f0fdf4"
                icon={CreditCard}
                subtitleText={
                  deltaPct >= 0
                    ? `↑ ${deltaPct}% vs mês anterior`
                    : `↓ ${Math.abs(deltaPct)}% vs mês anterior`
                }
                subtitleColor={deltaPct >= 0 ? '#22c55e' : '#ef4444'}
              />
              <KPICard
                label="Receita Pendente"
                value={formatJPY(data?.receita_pendente_jpy ?? 0)}
                borderColor="#f97316"
                iconBg="#fff7ed"
                icon={AlertCircle}
                subtitleText={
                  atrasados > 0
                    ? `${atrasados} em atraso`
                    : `${data?.pendentes_proximos ?? 0} com vencimento próximo`
                }
                subtitleColor={atrasados > 0 ? '#ef4444' : '#f97316'}
              />
              <KPICard
                label="Clientes Ativos"
                value={data?.clientes_ativos ?? 0}
                borderColor="#3b82f6"
                iconBg="#eff6ff"
                icon={Users}
                subtitleText={`↑ ${data?.novos_clientes_mes ?? 0} novos este mês`}
                subtitleColor="#3b82f6"
              />
              <KPICard
                label="Agendamentos Hoje"
                value={data?.agendamentos_hoje ?? 0}
                borderColor="#8b5cf6"
                iconBg="#f5f3ff"
                icon={CalendarDays}
                subtitleText={
                  data?.proximo_agendamento_hora
                    ? `Próximo às ${data.proximo_agendamento_hora}`
                    : 'Nenhum hoje'
                }
                subtitleColor="#8b5cf6"
              />
            </div>

            {/* Main Row */}
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: '1.6fr 1fr' }}
            >
              <RevenueChart data={data?.historico_receita ?? []} />
              <QuickActions />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd /path/to/ueno-assessoria && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep "DashboardPage"
```

Esperado: nenhuma linha de erro referenciando `DashboardPage.tsx`.

Se aparecer erro de import (ex.: `formatTimeJST` não encontrado), verifique as exports em `packages/utils/src/date.ts` e ajuste o nome da função importada.

- [ ] **Step 3: Verificar no browser**

```bash
cd apps/web && npm run dev
```

Abrir `http://localhost:5173/dashboard`. Verificar:
- 4 KPI cards aparecem na primeira linha com bordas coloridas
- Gráfico de barras aparece com 6 meses (mês atual em roxo)
- Ações rápidas aparecem à direita do gráfico
- Nenhum erro no console

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): redesign gerencial com KPIs, gráfico receita e ações rápidas"
```

---

## Task 2: Verificar type check global

**Files:**
- Nenhum arquivo modificado — apenas verificação

- [ ] **Step 1: Rodar type check completo**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep -v "AvaliacoesPage\|ProcessoDetailPage\|NovoClientePage\|ClienteContratosTab\|ClienteDocumentosTab\|ClienteFinanceiroTab\|ClienteHabilitacoesTab\|ClienteJapaoVistoTab\|supabase" | head -20
```

O `grep -v` filtra erros pré-existentes não relacionados a esta tarefa. Esperado: nenhuma nova linha de erro.

- [ ] **Step 2: Confirmar implementação completa**

Checar visualmente no browser:
- KPI "Receita do Mês": mostra valor em ¥ com delta % vs mês anterior
- KPI "Receita Pendente": mostra valor em ¥, subtítulo vermelho se houver atrasados
- KPI "Clientes Ativos": mostra count com "↑ N novos este mês"
- KPI "Agendamentos Hoje": mostra count com "Próximo às HH:MM" ou "Nenhum hoje"
- Gráfico: 6 barras, mês atual mais escuro
- Ações rápidas: 4 links funcionando (navegam para as rotas corretas)
