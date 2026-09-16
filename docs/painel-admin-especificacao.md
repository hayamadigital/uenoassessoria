# Especificação — Painel Principal (Dashboard Admin)

Referência: `docs/raio-x-especificacao.md`, item 20 (🟡 melhoria).

Contexto: o dono da UENO (Alexandre) quer, ao abrir o painel, entender em segundos o que precisa de atenção **hoje** — sem precisar navegar por Agenda, Financeiro e Clientes separadamente. Também pediu explicitamente (retorno sobre item 26) que não quer telas novas dedicadas para "quem está atrasado" — prefere que essa informação apareça aqui, no painel que ele já usa.

Depende de:
- `docs/multa-lembretes-especificacao.md` — fornece o valor de multa já somado por parcela atrasada, usado no bloco de Alertas e no resumo financeiro.
- `docs/agenda-aulas-especificacao.md` — fornece o conceito de "aula com horário pendente", usado no alerta de "clientes aguardando horário".

---

## 1. O que já existe e o que falta

Levantamento em `apps/web/src/pages/dashboard/DashboardPage.tsx`.

| Peça | Status |
|---|---|
| KPIs de topo (Etapas da Assessoria, Clientes Ativos, Processos Ativos, Próximos Agendamentos) | ✅ já existe (`MetricCard`, linhas 426-451) |
| Lista "Etapas Pendentes da Assessoria" com troca de status inline | ✅ já existe (`PendingAssessmentSteps`, linha 176) |
| Lista "Clientes Ativos" e "Processos Ativos por Serviço" | ✅ já existe (`ActiveClientsList`, `ProcessSummaryByService`) |
| Lista "Próximos Agendamentos" (8 mais próximos, todos os tipos misturados) | ✅ já existe (`UpcomingAppointments`, linha 350) |
| Contagem de "hoje" separada por tipo (compromissos × aulas × provas) | 🔴 não existe — hoje só tem "próximos agendamentos" genérico, sem filtrar por dia nem por tipo |
| Resumo financeiro do mês (a receber / recebido / atrasado) no painel | 🔴 não existe — esse dado só aparece em `/financeiro`, com botões e filtros que o Alexandre não precisa no dia a dia |
| Seção de Alertas (pagamentos vencidos, provas nos próximos 2 dias, clientes aguardando horário de aula) | 🔴 não existe |

`getResumoMultiplosMeses` e `getPrevisaoProximosMeses` já existem em `packages/firebase/src/queries/financeiro.ts:191,222` mas **não são usados em nenhuma tela** — são a base pronta para o card financeiro deste painel.

---

## 2. Layout proposto

```
┌─────────────────────────────────────────────────────────────┐
│ HOJE                                                         │
│ 8 compromissos · 5 aulas · 3 provas                          │
├─────────────────────────────────┬─────────────────────────────┤
│ FINANCEIRO — Setembro            │ ALERTAS                     │
│ A receber   ¥850.000             │ ⚠️ 5 pagamentos vencidos     │
│ Recebido    ¥620.000             │ ⚠️ 4 provas nos próx. 2 dias │
│ Atrasado    ¥75.000              │ ⚠️ 7 aguardando horário aula │
├───────────────────────────────────────────────────────────────┤
│ [ KPIs existentes: Etapas / Clientes Ativos / Processos ... ] │
│ [ Etapas Pendentes da Assessoria | Próximos Agendamentos ]     │
│ [ Clientes Ativos | Processos Ativos por Serviço ]             │
└─────────────────────────────────────────────────────────────┘
```

As duas seções novas (`HOJE` e `FINANCEIRO + ALERTAS`) entram **acima** do que já existe — nada do layout atual é removido, só ganha um cabeçalho operacional.

---

## 3. Modelo de dados e queries

### 3.1 Contagem de "hoje" por tipo

Não precisa de campo novo — é uma nova query que filtra `agendamentos` do dia corrente (já existe `listAgendamentosByDate` em `packages/firebase/src/queries/agendamentos.ts`, usado hoje só no mobile admin) e agrupa por `tipo_evento`/categoria do serviço associado:

```ts
// packages/firebase/src/queries/dashboard.ts (novo arquivo, ou função adicional em financeiro.ts)
export interface ResumoHoje {
  total_compromissos: number
  total_aulas: number      // servico.categoria === 'aula' (ver seção 3.3 do doc agenda-aulas)
  total_provas: number     // servico.categoria === 'prova' | tipo_evento indica prova
}

export async function getResumoHoje(db: Firestore): Promise<ResumoHoje>
```

A distinção "aula" vs "prova" depende de como `docs/agenda-aulas-especificacao.md` tipifica o agendamento — usar o mesmo campo/enum definido lá para não duplicar taxonomia.

### 3.2 Financeiro do mês

Reaproveitar `getDashboardFinanceiro(db, mes)` (já existe) e somar o bucket "Atrasado" especificado em `docs/pagamentos-atrasados-especificacao.md` (esse doc estende `DashboardFinanceiro` com `total_atrasado`). Não criar lógica nova aqui — só consumir.

### 3.3 Alertas

```ts
export interface AlertasDashboard {
  pagamentos_vencidos: number      // parcelas/pagamentos com status "atrasado" (ver pagamentos-atrasados-especificacao.md)
  provas_proximos_2_dias: number   // agendamentos tipo prova com data_hora_inicio entre agora e +48h
  aguardando_horario_aula: number  // agendamentos no estado "horario_pendente" (ver agenda-aulas-especificacao.md)
}

export async function getAlertasDashboard(db: Firestore): Promise<AlertasDashboard>
```

Cada número do card de Alertas é clicável e leva para a lista filtrada correspondente (`/financeiro?status=atrasado`, `/agendamentos?tipo=prova&...`, `/agendamentos?status=horario_pendente`) — evita construir telas novas, só passa filtros por querystring para as telas que já existem.

---

## 4. Mudanças em `DashboardPage.tsx`

- Nova query `['dashboard', 'hoje-financeiro-alertas', mes]` rodando em paralelo com a query operacional existente (mesmo padrão de `useQuery` + `Promise.all` já usado em `fetchDashboardOperacional`).
- Dois novos componentes: `TodaySummaryBar` (a faixa "8 compromissos · 5 aulas · 3 provas") e `FinanceAlertsRow` (dois cards lado a lado: financeiro do mês + alertas), inseridos antes do grid de `MetricCard` existente.
- Manter o `refetchInterval: 60_000` já usado — o painel precisa continuar "vivo" sem o Alexandre precisar dar refresh manual.

---

## 5. Ordem sugerida de implementação

1. Garantir que `docs/pagamentos-atrasados-especificacao.md` e `docs/agenda-aulas-especificacao.md` estejam implementados (ou ao menos os campos/estados novos que eles introduzem), já que este painel só consome dados deles.
2. `getResumoHoje` e `getAlertasDashboard` em `packages/firebase/src/queries/`.
3. Componentes `TodaySummaryBar` e `FinanceAlertsRow` no web.
4. Ligar os cliques dos alertas às rotas filtradas existentes.

---

## 6. Critérios de aceite

- [ ] A faixa "HOJE" mostra a contagem correta de compromissos, aulas e provas do dia corrente (conferir com dados de teste).
- [ ] O card financeiro mostra a receber/recebido/atrasado do mês selecionado (mês atual por padrão), batendo com os valores de `/financeiro`.
- [ ] Alertas mostram as contagens corretas e cada um navega para a lista filtrada certa ao clicar.
- [ ] Painel continua atualizando automaticamente a cada 60s sem exigir reload manual.
- [ ] Nenhum dos cards/seções existentes (Etapas Pendentes, Clientes Ativos, Processos por Serviço, Próximos Agendamentos) foi removido ou quebrado.

---

## 7. Fora de escopo agora

- Painel equivalente no mobile admin (hoje o mobile admin já tem sua própria Agenda; o dashboard operacional detalhado fica só no web por enquanto).
- Customização do painel por usuário (ex. Atendimento vendo um recorte diferente) — depende de `docs/usuarios-permissoes-especificacao.md` estar implementado primeiro; quando existir, os cards financeiros deste painel devem respeitar a mesma flag de visibilidade financeira definida lá.
- Gráficos históricos/tendência — o pedido do Alexandre foi sobre o "agora", não sobre análise de série temporal.
