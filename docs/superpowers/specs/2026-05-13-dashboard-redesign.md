# Dashboard Redesign — Spec

**Data:** 2026-05-13  
**Status:** Aprovado

---

## Objetivo

Substituir o dashboard atual (6 KPI cards simples, sem gráfico) por uma visão gerencial com 4 KPIs com tendência, gráfico de receita mensal e ações rápidas.

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Page Header: "Dashboard" + data JST                    │
├──────────┬──────────┬──────────┬──────────┐
│ Receita  │ Receita  │ Clientes │ Agend.   │  ← KPI row
│ do Mês   │ Pendente │ Ativos   │ Hoje     │
├────────────────────────────┬────────────────┤
│  Gráfico — Receita Mensal  │  Ações Rápidas │  ← main row
│  (6 meses, recharts)       │  (4 links)     │
└────────────────────────────┴────────────────┘
```

Proporção main row: gráfico `1.6fr` / ações `1fr`.

---

## KPI Cards

Cada card tem: borda esquerda colorida, label, valor grande, subtítulo colorido.

| # | Label | Cor | Valor | Subtítulo |
|---|-------|-----|-------|-----------|
| 1 | Receita do Mês | verde `#22c55e` | `formatJPY(total_pago_mes)` | `↑/↓ X% vs mês anterior` (verde/vermelho) |
| 2 | Receita Pendente | laranja `#f97316` | `formatJPY(total_pendente)` | `N pagtos com vencimento próximo` (laranja) / `N em atraso` (vermelho se houver atrasados) |
| 3 | Clientes Ativos | azul `#3b82f6` | count | `↑ N novos este mês` |
| 4 | Agendamentos Hoje | violeta `#8b5cf6` | count | `Próximo às HH:MM` (ou "Nenhum hoje" se count = 0) |

### Fontes de dados

**KPI 1 — Receita do Mês:**
- `getDashboardFinanceiro(db, mesAtual)` → `total_pago_mes`
- Tendência: `getDashboardFinanceiro(db, mesAnterior)` → calcular `%` delta

**KPI 2 — Receita Pendente:**
- Query direta: `pagamentos` onde `status == 'pendente'` (sem filtro de mês — todos os pendentes)
- Soma de `valor_jpy` de todos os docs retornados
- Subtítulo: contar pagamentos com `data_vencimento < hoje` → se > 0, mostrar `N em atraso` em vermelho; senão contar com vencimento nos próximos 7 dias → mostrar `N com vencimento próximo` em laranja
- **Nota:** NÃO usar `getDashboardFinanceiro` aqui — aquela função filtra por `created_at` do mês atual e retornaria apenas pendentes criados no mês, não o total real pendente

**KPI 3 — Clientes Ativos:**
- `getCountFromServer` em `clientes` onde `status_processo in ['contato','documentacao','agendado','em_andamento']`
- Subtítulo: count de clientes com `created_at >= inicioMes`

**KPI 4 — Agendamentos Hoje:**
- `getCountFromServer` em `agendamentos` filtrado por dia JST atual
- Subtítulo: buscar o primeiro agendamento do dia ordenado por `data_hora_inicio` → formatar hora `HH:MM`

---

## Gráfico — Receita Mensal

- **Biblioteca:** `recharts` (já instalado)
- **Componente:** `BarChart` com `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`
- **Dados:** `getResumoMultiplosMeses(db, últimos6Meses)` → `total_pago_mes` por mês
- **Eixo X:** mês abreviado em PT-BR (DEZ, JAN, FEV…)
- **Eixo Y:** oculto; valores no `Tooltip`
- **Cor:** barras históricas `#ddd6fe`, mês atual `#8b5cf6`
- **Header do card:** título "Receita Mensal" + subtítulo "Últimos 6 meses (¥)" + link `Ver financeiro →` → `/financeiro`
- `Tooltip` formata valor com `formatJPY`

---

## Ações Rápidas

4 links estilizados como botões outline coloridos:

| Label | Cor | Destino |
|-------|-----|---------|
| + Novo Cliente | azul | `/clientes/novo` |
| + Novo Agendamento | violeta | `/agendamentos/novo` |
| + Novo Contrato | rosa | `/contratos` |
| Ver Pendências | laranja | `/financeiro` |

---

## Implementação

### Arquivo principal
`apps/web/src/pages/dashboard/DashboardPage.tsx` — reescrita completa.

### Estrutura interna
Componentes locais no mesmo arquivo (não extrair — página simples o suficiente):
- `KPICard` — props: `label`, `value`, `color`, `subtitleText`, `subtitleColor`
- `RevenueChart` — recebe array de `{ mes, total_pago_mes }`
- `QuickActions` — lista de links estáticos
- `fetchDashboardKPIs()` — função async que agrega todas as queries em `Promise.all`

### Query `fetchDashboardKPIs`
```ts
async function fetchDashboardKPIs(): Promise<DashboardData>
```
Paralleliza:
1. `getDashboardFinanceiro(db, mesAtual)` — receita paga do mês atual (`total_pago_mes`)
2. `getDashboardFinanceiro(db, mesAnterior)` — para calcular delta %
3. `getCountFromServer(clientes ativos)`
4. `getCountFromServer(novos clientes este mês)`
5. `getCountFromServer(agendamentos hoje)`
6. `getDocs(primeiro agendamento hoje ordenado por hora)`
7. `getDocs(pagamentos pendentes com data_vencimento)` — para subtítulo Receita Pendente
8. `getResumoMultiplosMeses(db, últimos6Meses)` — para o gráfico

### Tipos
```ts
interface DashboardData {
  receita_mes_jpy: number
  receita_pendente_jpy: number
  pendentes_atrasados: number      // data_vencimento < hoje
  pendentes_proximos: number       // data_vencimento entre hoje e hoje+7d
  delta_receita_pct: number        // pode ser negativo
  clientes_ativos: number
  novos_clientes_mes: number
  agendamentos_hoje: number
  proximo_agendamento_hora: string | null  // "09:00" ou null
  historico_receita: { mes: string; valor: number }[]
}
```

---

## Considerações

- `refetchInterval: 60_000` mantido (igual ao atual)
- Nenhuma dependência nova — recharts já está em `apps/web/package.json`
- `formatJPY` de `@ueno/utils/currency` (já importado no dashboard atual)
- Queries de contagem usam `getCountFromServer` (sem trazer docs) sempre que possível
- Exceção: agendamentos do dia precisam de `getDocs` para pegar a hora do primeiro
