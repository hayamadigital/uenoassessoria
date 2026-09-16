# Especificação — Agenda Administrativa no Web

Referência: `docs/raio-x-especificacao.md`, item 24 (🟡 melhoria).

Contexto: a equipe da UENO já tem, no **mobile admin**, uma experiência de calendário validada (semana + seleção de dia + lista de compromissos daquele dia + criação de evento). No **web admin**, a Agenda é só uma tabela plana filtrável — sem a visão "clique num dia, veja quem está marcado naquele dia" que a especificação original pede. Esta spec porta a experiência já validada no mobile para o web, sem inventar um padrão novo.

---

## 1. O que já existe e o que falta

| Peça | Mobile admin | Web admin |
|---|---|---|
| Tira de semana navegável (7 dias, seleção de dia) | ✅ `apps/mobile/app/(admin)/(tabs)/agenda/index.tsx:242-264` (`weekStrip`) | 🔴 não existe |
| Lista de compromissos do dia selecionado, com status colorido | ✅ linhas 290-397 (`agendamentos` por `listAgendamentosByDate`) | 🔴 hoje é tabela plana com filtros de data/status/instrutor, sem agrupar por dia |
| Contagem de compromissos por dia (dot no calendário) | ✅ `countForDay`, linha 168 | 🔴 não existe |
| Criar evento (UENO ou pessoal) com cliente/instrutor/serviço/data/hora/local/observação | ✅ modal `isCreateOpen`, linhas 400-597 | ✅ existe, mas em página própria (`NovoAgendamentoPage.tsx`), não como modal a partir do dia clicado |
| Ações rápidas (confirmar, concluir, cancelar, marcar falta) | ✅ linhas 351-391 | ✅ existe na tabela (`statusTransitions`, `AgendamentosPage.tsx:43-47`), mas sem o contexto "desse dia" |
| Query de agendamentos por data (`listAgendamentosByDate`) | ✅ já usada | ✅ já existe em `packages/firebase/src/queries/agendamentos.ts` (reaproveitável, só não é chamada pelo web hoje) |

Conclusão: a lógica de dados (`listAgendamentosByDate`, `listAgendamentos` com range de datas, `updateAgendamentoStatus`, `createAgendamento`) já existe e é **a mesma** usada pelo mobile — não precisa de nada novo em `packages/firebase`. O trabalho é 100% de UI no web: construir a visão de calendário reaproveitando essas funções.

---

## 2. Fluxo do usuário (equipe UENO no web)

```
Equipe abre /agendamentos
  → vê uma tira de semana (ou mês, ver seção 4) com contagem de compromissos por dia
  → clica num dia
      → painel lateral/inferior mostra a lista de compromissos daquele dia
      → cada item mostra cliente, serviço, instrutor, horário, status
      → equipe pode: confirmar / concluir / cancelar / marcar falta (ações já existentes)
      → equipe pode clicar "+ Novo compromisso" já pré-preenchido com a data do dia selecionado
  → equipe define horário, local e observação no formulário (já existe em NovoAgendamentoPage,
    só passa a receber a data via querystring/state em vez de só manual)
```

Mantém a tabela antiga como visão alternativa (toggle "Calendário / Lista") em vez de substituir — times que preferem a tabela plana (ex. para exportar ou revisar em lote) não perdem a opção.

---

## 3. Estrutura de componentes (web)

Novos arquivos em `apps/web/src/pages/agendamentos/`:

- `components/WeekStrip.tsx` — mesma lógica de `getWeekDays`/`countForDay` do mobile (`apps/mobile/app/(admin)/(tabs)/agenda/index.tsx:39-41,168-173`), reescrita em React web (sem `StyleSheet`/`TouchableOpacity`, usando os componentes `@/components/ui/*` já padronizados no web).
- `components/DayAgendaList.tsx` — lista de compromissos do dia selecionado, reaproveitando `statusVariant`/`statusLabel` já definidos em `AgendamentosPage.tsx:22-41`.
- `AgendaCalendarPage.tsx` — página que compõe `WeekStrip` + `DayAgendaList`, com toggle para a `AgendamentosPage.tsx` (tabela) existente.

Rota: manter `/agendamentos` como está (aponta para a nova visão de calendário por padrão) e adicionar `/agendamentos/lista` para a tabela antiga — ou um switch de view dentro da mesma página, com preferência salva em `localStorage` (mais simples, sem rota nova). Recomenda-se o switch dentro da mesma página para não duplicar o botão "Novo Agendamento" do `PageHeader`.

### Query de contagem por dia (para o `WeekStrip`)

Reaproveitar `listAgendamentos(db, { data_inicio, data_fim })` com o range da semana visível (mesmo padrão de `semanaAll` no mobile, `apps/mobile/app/(admin)/(tabs)/agenda/index.tsx:114-120`) e contar client-side por dia — não precisa de agregação no backend, o volume de agendamentos por semana é pequeno.

---

## 4. Semana vs. mês

O mobile usa tira de semana (7 dias) porque a tela é estreita. No web há espaço para um calendário de **mês inteiro** (grid 7 colunas × ~5 linhas), o que se aproxima mais do exemplo da especificação original ("18/09 disponível, 19/09 lotado"). Recomendação: usar mês no web (mais informação visível de uma vez, sem precisar rolar semana a semana), mantendo a mesma lógica de contagem por dia — é só trocar `getWeekDays` por um `getMonthDays` equivalente.

---

## 5. Ordem sugerida de implementação

1. `getMonthDays` (helper local, sem necessidade de nova query) + `WeekStrip`/`components/MonthGrid.tsx` no web, alimentado por `listAgendamentos` com range do mês.
2. `DayAgendaList`, reaproveitando os componentes de linha/badge já existentes em `AgendamentosPage.tsx`.
3. Compor `AgendaCalendarPage.tsx`, com o botão "Novo compromisso" abrindo `NovoAgendamentoPage` (ou modal equivalente) pré-preenchido com a data clicada.
4. Adicionar o toggle Calendário/Lista, com a tabela atual (`AgendamentosPage.tsx`) acessível sem perda de funcionalidade.

---

## 6. Critérios de aceite

- [ ] Ao abrir `/agendamentos`, o calendário mostra o mês atual com contagem de compromissos por dia.
- [ ] Clicar num dia mostra a lista de compromissos daquele dia (cliente, serviço, instrutor, horário, status).
- [ ] Ações de confirmar/concluir/cancelar/marcar falta funcionam a partir dessa lista, sem precisar ir para a tabela.
- [ ] "Novo compromisso" a partir de um dia selecionado já vem com a data preenchida.
- [ ] A visão de tabela (lista) continua acessível e funcional, sem regressão nos filtros existentes.

---

## 7. Fora de escopo agora

- Drag-and-drop de compromissos entre dias.
- Visão de calendário por instrutor (um calendário por pessoa) — o pedido foi sobre visão geral do dia, não por instrutor.
- Sincronização com Google Calendar/iCal.
