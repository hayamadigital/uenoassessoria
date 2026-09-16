# Especificação — Multa por Atraso e Lembretes Automáticos

Itens 8 + 13 do `docs/raio-x-especificacao.md`, combinados porque o Alexandre confirmou que resolvem o mesmo problema ("a pessoa não esquecer os pagamentos") com o mesmo mecanismo: uma rotina agendada diária.

Decisões já tomadas com o Alexandre (2026-09-15):
- Multa de **¥100 por dia de atraso**, calculada automaticamente — sem intervenção manual.
- Três lembretes automáticos: (a) pagamento perto do vencimento, (b) pagamento já atrasado, (c) prova/compromisso em 2 dias (este último já estava na especificação original, item 13).
- Sem tela nova dedicada a atrasados (ver item 26 do raio-x) — a informação de quem está atrasado e a multa já calculada só precisa aparecer nas telas que a UENO já usa.

---

## 1. O que já existe e o que falta

| Peça | Status |
|---|---|
| `Parcela.status` inclui `'atrasado'` | ✅ já existe (`packages/firebase/src/types.ts:30`) — mas nada muda esse status automaticamente hoje |
| Campo de multa em `Parcela`/`Pagamento` | 🔴 não existe |
| Cálculo de dias de atraso / multa | 🔴 não existe em nenhum lugar do repositório (busca por "multa" não retorna nada) |
| `sendNotification` (grava notificação + push Expo) | ✅ já existe (`functions/src/index.ts:532`), mas é `onCall` — só dispara quando **um admin chama manualmente** |
| Alguma rotina agendada (`onSchedule`) já rodando | ✅ existe 1 precedente: `purgeExpiredRetainedAccounts` (`functions/src/index.ts:714`, `onSchedule('every 24 hours', ...)`) — nenhuma outra function agendada no projeto |
| Lembrete de compromisso 2 dias antes | 🔴 não existe |
| Config administrável (valor da multa, dias de antecedência) | 🔴 não existe — mas já existe o padrão `app_config/public` (`packages/firebase/src/queries/public-config.ts`) pra esse tipo de ajuste sem precisar de deploy |

Conclusão: é uma feature nova de ponta a ponta, mas com bastante estrutura pra se apoiar (`sendNotification`, o precedente de `onSchedule`, e o doc de config pública).

---

## 2. Modelo de dados

### `packages/firebase/src/types.ts` — `Parcela`

```ts
export interface Parcela {
  id: string
  pagamento_id: string
  numero: number
  valor_original_jpy: number
  valor_pago_jpy: number
  status: StatusParcela
  data_vencimento: string | null
  data_pagamento: string | null
  notas: string | null
  // novo:
  multa_jpy: number                          // recalculado diariamente enquanto estiver vencida e não paga
  multa_atualizada_em: string | null         // data (YYYY-MM-DD) do último recálculo, evita reprocessar 2x no mesmo dia
  lembrete_vencimento_enviado_em: string | null  // data (YYYY-MM-DD) do último lembrete de "vence em breve"
  lembrete_atraso_enviado_em: string | null      // idem, para o lembrete de atraso
  created_at: string
  updated_at: string
}
```

`valor_total_devido_jpy` **não** vira campo persistido — é sempre `valor_original_jpy - valor_pago_jpy + multa_jpy`, calculado na UI/query, pra nunca ficar dessincronizado do que a UENO realmente lançou.

### `packages/firebase/src/types.ts` — `Agendamento`

```ts
export interface Agendamento {
  // ...campos existentes
  lembrete_enviado_em: string | null   // data (YYYY-MM-DD) do lembrete "faltam 2 dias", evita duplicar
}
```

### `packages/firebase/src/types.ts` — `PublicAppConfig`

Estender o doc `app_config/public` que já existe, pra deixar os parâmetros ajustáveis pelo admin sem precisar de deploy:

```ts
export interface PublicAppConfig {
  // ...campos existentes (support_whatsapp, home_material_category_id, simulado_passing_percentage)
  multa_jpy_por_dia: number             // default 100
  lembrete_vencimento_dias_antes: number // default 3
  lembrete_compromisso_dias_antes: number // default 2 (já estava na especificação original)
}
```

Ajustar `getPublicAppConfig`/`updatePublicAppConfig` (`packages/firebase/src/queries/public-config.ts`) pra normalizar e ter esses defaults, seguindo o mesmo padrão de `normalizePassingPercentage`. Nenhuma mudança em `firestore.rules` — `app_config/public` já é `allow get` público e `allow write` só admin.

---

## 3. Cloud Function agendada

### `functions/src/index.ts` — `dailyReminders`

Primeiro, extrair a lógica interna de `sendNotification` (linhas 555–593) para uma função auxiliar reaproveitável, já que `sendNotification` hoje é `onCall` e exige `assertAdmin(request)` — uma function agendada não tem `request.auth`, não pode chamar o callable diretamente:

```ts
async function notifyUser(params: {
  destinatarioId: string
  titulo: string
  corpo: string
  tipo: string
  referenciaId?: string
  referenciaTipo?: string
}) {
  // mesmo corpo que hoje está dentro de sendNotification: grava em `notificacoes`
  // e dispara push via Expo pros tokens em `push_tokens`
}

export const sendNotification = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'sendNotification', 30)
  // ...validação dos campos, igual hoje...
  return notifyUser({ destinatarioId, titulo, corpo, tipo, referenciaId: referencia_id, referenciaTipo: referencia_tipo })
})
```

Nova function:

```ts
export const dailyReminders = onSchedule(
  { schedule: 'every day 08:00', timeZone: 'Asia/Tokyo' },
  async () => {
    const config = await getConfig() // lê app_config/public com os defaults (100 / 3 / 2)
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD, em JST

    await processarMultaEAtrasos(today, config.multa_jpy_por_dia)
    await enviarLembretesDeVencimento(today, config.lembrete_vencimento_dias_antes)
    await enviarLembretesDeAtraso(today)
    await enviarLembretesDeCompromisso(today, config.lembrete_compromisso_dias_antes)
  },
)
```

**`processarMultaEAtrasos`** — para cada `Parcela` com `status` em `['pendente', 'atrasado']`, `data_vencimento < today` e `multa_atualizada_em !== today`:
- `diasAtraso = diffEmDias(today, data_vencimento)`
- `multa_jpy = diasAtraso * multa_jpy_por_dia`
- se `status === 'pendente'`, muda para `'atrasado'`
- grava `multa_atualizada_em = today`

**`enviarLembretesDeVencimento`** — para cada `Parcela` com `status === 'pendente'`, `data_vencimento` caindo exatamente em `today + N dias` e `lembrete_vencimento_enviado_em !== today`:
- busca o `Pagamento` pai (`pagamento_id`) → `cliente_id` → `Cliente.profile_id`
- `notifyUser({ tipo: 'pagamento', titulo: 'Pagamento próximo do vencimento', corpo: '...vence em N dias', referenciaId: parcela.id, referenciaTipo: 'parcela' })`
- grava `lembrete_vencimento_enviado_em = today`

**`enviarLembretesDeAtraso`** — para cada `Parcela` com `status === 'atrasado'` e (`lembrete_atraso_enviado_em == null` OU passaram 7 dias desde o último lembrete): mesmo fluxo de notificação, mencionando o valor da multa já acumulada; grava `lembrete_atraso_enviado_em = today`. Recorrência semanal escolhida para lembrar sem virar spam diário — ajustável depois se o Alexandre preferir outra cadência.

**`enviarLembretesDeCompromisso`** — para cada `Agendamento` com `status` fora de `['cancelado', 'faltou', 'concluido']`, `data_hora_inicio` caindo no dia `today + N dias` e `lembrete_enviado_em !== today`: notifica o cliente (via `cliente_id` → `Cliente.profile_id`) sobre o compromisso, grava `lembrete_enviado_em = today`.

Todas as consultas usam `where('status', 'in', [...])` + filtro de data em memória (o volume de parcelas/agendamentos da UENO não justifica índices compostos extras agora); revisar se crescer muito.

---

## 4. Mudanças de UI

### Mobile — `apps/mobile/app/(cliente)/financeiro/index.tsx`

No `installmentRow` de cada parcela com `status === 'atrasado'`, mostrar o detalhamento da multa (mesmo formato do exemplo da especificação original):

```
Valor original:  ¥20.000
Atraso: 4 dias
Multa: ¥400
Total atual: ¥20.400
```

`Total atual` = `valor_original_jpy - valor_pago_jpy + multa_jpy`.

### Admin — `apps/web/src/pages/financeiro/FinanceiroPage.tsx`

Sem tela nova (decisão do item 26). Duas mudanças pontuais nessa página que já existe:
- Somar `multa_jpy` no KPI de "Pendente" (ou separar visualmente um sub-total "dos quais em multa"), pra o valor bater com o que o cliente realmente deve.
- Na tabela de cobranças do período, quando a linha for uma parcela `atrasado`, mostrar os dias de atraso e a multa ao lado do valor — o suficiente pro Alexandre "saber quem são os atrasados e como o sistema está cobrando" sem precisar abrir cada cliente.

### Admin — `apps/web/src/pages/clientes/tabs/ClienteFinanceiroTab.tsx`

Remover (ou manter só como override manual raro) o botão "Atrasar" que hoje seta a parcela pra `atrasado` na mão — depois desta spec, o status muda sozinho todo dia às 08:00 JST. Mostrar `multa_jpy` na linha da parcela.

---

## 5. Ordem sugerida de implementação

1. `PublicAppConfig` (types + `public-config.ts`) com os 3 campos novos e defaults.
2. Campos novos em `Parcela` e `Agendamento` (`types.ts`) — todos opcionais/com default, não quebra nada existente.
3. Extrair `notifyUser` de dentro de `sendNotification`, sem mudar o comportamento do callable.
4. Escrever `dailyReminders` (as 4 sub-rotinas) e testar localmente com o emulador do Firestore, criando parcelas/agendamentos de teste com datas forçadas.
5. Deploy da function agendada (`firebase deploy --only functions:dailyReminders` — lembrar que `firebase deploy` é manual neste projeto).
6. UI: financeiro do cliente (mobile) e financeiro do admin (web) mostrando a multa.
7. Remover/ajustar o botão manual "Atrasar" no admin.

---

## 6. Critérios de aceite

- [ ] Uma parcela `pendente` com `data_vencimento` no passado vira `atrasado` sozinha após a rotina rodar, com `multa_jpy` correto (`dias × 100`).
- [ ] No dia seguinte, a multa da mesma parcela aumenta em ¥100 (recálculo incremental, não reseta).
- [ ] Cliente recebe notificação + push quando faltam N dias pro vencimento de uma parcela pendente (N configurável em `app_config/public`).
- [ ] Cliente recebe notificação quando uma parcela vira atrasada, e de novo a cada 7 dias enquanto continuar atrasada.
- [ ] Cliente recebe notificação 2 dias antes de um agendamento futuro (não cancelado/concluído).
- [ ] Nenhum lembrete é enviado duas vezes no mesmo dia para a mesma parcela/agendamento, mesmo se a function rodar mais de uma vez.
- [ ] Tela financeira do cliente (mobile) mostra o detalhamento "valor original + multa = total" para parcelas atrasadas.
- [ ] Tela financeira do admin (web) reflete a multa nos totais e permite ver dias de atraso por linha, sem precisar de uma tela nova.

---

## 7. Fora de escopo agora

- Tela dedicada de "Pagamentos atrasados" (descartada — ver item 26 do raio-x).
- Multa configurável por serviço/cidade (hoje é um valor único de ¥100/dia pra toda a UENO).
- Canal de lembrete diferente de push/notificação in-app (ex.: e-mail, SMS, WhatsApp automático).
- Perdão/isenção de multa pelo sistema — se precisar zerar a multa de um cliente específico, continua sendo edição manual da UENO no admin.
