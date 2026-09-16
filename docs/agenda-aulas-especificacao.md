# Especificação — Agenda de Aulas: Reserva de Data, Horário Definido Depois e Pagamento no Dia

Itens 14 + 15 + 16 do `docs/raio-x-especificacao.md`, combinados porque são estados sucessivos da mesma entidade `Agendamento`: o cliente reserva uma **data**, a UENO define **horário + local** depois, e no dia da aula a UENO marca o **pagamento**.

É o spec mais complexo dos três desta rodada — muda o formato de criação de agendamento (hoje: admin cria já com data+hora fechada) para um fluxo em duas pontas (cliente reserva data → admin fecha horário).

---

## 1. O que já existe e o que falta

| Peça | Status |
|---|---|
| `Agendamento` com `data_hora_inicio`/`data_hora_fim` **obrigatórios** desde a criação | ✅ existe, mas é exatamente o oposto do que se precisa — hoje não há como criar um agendamento só com data (`agendamentoSchema` em `packages/utils/src/validators.ts:102` exige `z.string().datetime()` nos dois campos) |
| Tela do cliente pra ver o próximo evento | ✅ `apps/mobile/app/(cliente)/agenda/index.tsx` — mas é **somente leitura** de um agendamento já criado pelo admin; já trata bem os campos nulos ("Local a definir", "Instrutor a definir" — mas não existe hoje um estado de "hora a definir") |
| Tela do cliente pra escolher uma data disponível | 🔴 não existe |
| Conceito de "dias disponíveis" definidos pela UENO | 🔴 não existe — nenhuma coleção de disponibilidade no repositório |
| `ProcessoEtapa.agendamento_modo` (`'definir_dia' \| 'definir_dia_hora'`) | ✅ existe (`packages/firebase/src/types.ts:64,518`) — mas é um campo que só controla se o **formulário do admin** pede `date` ou `datetime-local` ao criar manualmente a etapa (`apps/web/src/pages/clientes/ProcessoDetailPage.tsx:291,399`). Não implementa a reserva pelo cliente nem o fluxo de "horário pendente" — é só um toggle de UI do admin, mas confirma que a ideia de "só dia, sem hora" já existia parcialmente no domínio |
| Tela do admin pra criar agendamento | ✅ `apps/web/src/pages/agendamentos/NovoAgendamentoPage.tsx` — sempre pede data+hora de início e fim na criação; segue existindo para agendamentos que a UENO cria direto (ex. entrevista, prova), só a aula muda de fluxo |
| Tela do admin pra ver quem reservou cada data e organizar o itinerário | 🔴 não existe |
| Valor + status de pagamento da aula | 🔴 não existe em `Agendamento` (só tem `local`, `notas_instrutor`, `notas_admin`) |
| Padrão "cliente só visualiza, UENO confirma pagamento" | ✅ já existe pro financeiro geral (`apps/mobile/app/(cliente)/financeiro/index.tsx`, item 7 do raio-x) — reaproveitar o mesmo princípio aqui |

Conclusão: a leitura do lado do cliente já é sólida e já lida bem com campos nulos — o trabalho real é (1) tornar `data_hora_inicio`/`data_hora_fim` opcionais no modelo, (2) criar o conceito de disponibilidade + reserva, e (3) adicionar valor/pagamento na aula.

---

## 2. Modelo de estados do `Agendamento`

Hoje `Agendamento` não distingui aula de outros compromissos além de `servico_id`/`tipo_evento`. Para este fluxo, introduzir um sub-estado só pra agendamentos do tipo aula:

```ts
export type EstadoReservaAula =
  | 'data_reservada'      // cliente escolheu uma data disponível; hora/local ainda não definidos
  | 'horario_definido'    // UENO já preencheu hora + local
  | 'realizado'           // aula aconteceu (status vira 'concluido' como já existe hoje)
```

`EstadoReservaAula` só se aplica quando `agendamento.eh_reserva_aula === true`; para os demais tipos de compromisso (entrevista, prova, etc.), continua tudo exatamente como é hoje — **nenhuma mudança de comportamento fora do fluxo de aula**.

### `packages/firebase/src/types.ts` — `Agendamento`

```ts
export interface Agendamento {
  id: string
  tipo_evento: TipoEventoAgendamento
  cliente_id: string | null
  instrutor_id: string | null
  servico_id: string | null
  data_hora_inicio: string | null   // era obrigatório; agora nulo enquanto só a data foi reservada
  data_hora_fim: string | null      // idem
  data_reservada: string | null     // novo — YYYY-MM-DD, a data que o cliente escolheu (sempre presente para aulas)
  eh_reserva_aula: boolean          // novo — diferencia "aula reservada pelo cliente" dos agendamentos criados direto pelo admin
  estado_reserva: EstadoReservaAula | null  // novo — null para agendamentos que não são reserva de aula
  valor_jpy: number | null          // novo — valor da aula, puxado do serviço no momento da reserva
  status_pagamento_aula: 'pendente' | 'pago' | null  // novo — null quando não se aplica (não é aula)
  pago_em: string | null            // novo
  confirmado_por: string | null     // novo — uid do admin/instrutor que marcou como pago
  status: StatusAgendamento
  local: string | null
  notas_instrutor: string | null
  notas_admin: string | null
  created_by: string | null
  cliente_nome?: string
  instrutor_nome?: string
  servico_nome?: string
  created_at: string
  updated_at: string
}
```

Reaproveita-se `StatusPagamento`-like só com 2 valores (`'pendente' | 'pago'`) em vez do enum completo de `Pagamento` — a aula não tem "cancelado"/"estornado" própria, isso já é coberto pelo `status` do próprio agendamento.

### Nova coleção `/disponibilidade_aulas/{id}`

A UENO define quais datas estão abertas pra reserva (equivalente ao exemplo da especificação original: "18/09 — disponível, 19/09 — lotado, 20/09 — disponível"):

```ts
export interface DisponibilidadeAula {
  id: string
  data: string        // YYYY-MM-DD
  vagas_total: number  // quantas reservas cabem nessa data
  vagas_ocupadas: number // desnormalizado, atualizado a cada reserva/cancelamento — evita contar toda vez
  servico_id: string | null // null = disponível pra qualquer serviço; ou restrita a um serviço específico
  aberta: boolean      // permite a UENO fechar uma data sem apagar o histórico
  created_at: string
  updated_at: string
}
```

`vagas_ocupadas >= vagas_total` ou `aberta === false` ⇒ data aparece como "lotada"/indisponível na tela do cliente.

---

## 3. Fluxo do usuário

```
CLIENTE (reservar data)
  processo em etapa cujo agendamento_modo indica aula
  → abre "Agendar aula" no app
  → vê lista de datas com vagas (DisponibilidadeAula.aberta && vagas_ocupadas < vagas_total)
  → escolhe uma data (NÃO escolhe horário)
  → chama a Cloud Function reservarDataAula
      → cria Agendamento { eh_reserva_aula: true, data_reservada, estado_reserva: 'data_reservada',
                             data_hora_inicio: null, data_hora_fim: null, valor_jpy: <do serviço>,
                             status_pagamento_aula: 'pendente', status: 'agendado' }
      → incrementa DisponibilidadeAula.vagas_ocupadas (transação, evita overbooking)
  → tela do cliente mostra "Aula marcada para 20/09 — Horário: aguardando definição da UENO"

ADMIN (montar o itinerário)
  → abre "Reservas do dia" (nova visão, filtra Agendamento por data_reservada)
  → vê todos os clientes que reservaram aquela data (equivalente ao "Alexandre, Maria, João..." do exemplo original)
  → define, pra cada um: hora de início/fim, local de encontro, observação
  → chama updateAgendamento (fluxo já existente) preenchendo data_hora_inicio/fim/local
      → sistema muda estado_reserva pra 'horario_definido'
      → dispara notificação ao cliente ("Horário da sua aula foi definido")

DIA DA AULA
  → instrutor dá a aula normalmente (fluxo já existente de agenda do instrutor)
  → UENO marca status_pagamento_aula = 'pago' depois de receber (mobile admin ou web)
  → agendamento pode ser marcado como 'concluido' (fluxo já existente de status)
```

---

## 4. Cloud Function — `reservarDataAula`

Reserva feita via callable (não escrita direta do cliente no Firestore) porque precisa de uma transação atômica pra não estourar `vagas_total` com reservas simultâneas — o mesmo motivo por trás de `enforceRateLimit` já existir no projeto pra outras funções.

```ts
export const reservarDataAula = onCall({ ...CORS }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Não autenticado')
  await enforceRateLimit(db, request, 'reservarDataAula', 10)

  const disponibilidadeId = requiredString(request.data?.disponibilidade_id, 'disponibilidade_id', 128)
  const servicoId = requiredString(request.data?.servico_id, 'servico_id', 128)

  // cliente_id resolvido a partir do request.auth.uid (nunca confiar em cliente_id vindo do client)
  const clienteSnap = await db.collection('clientes').where('profile_id', '==', request.auth.uid).limit(1).get()
  if (clienteSnap.empty) throw new HttpsError('failed-precondition', 'Cadastro de cliente não encontrado')
  const clienteId = clienteSnap.docs[0].id

  return db.runTransaction(async (tx) => {
    const dispRef = db.collection('disponibilidade_aulas').doc(disponibilidadeId)
    const disp = await tx.get(dispRef)
    if (!disp.exists || !disp.data()!.aberta) throw new HttpsError('failed-precondition', 'Data indisponível')
    if (disp.data()!.vagas_ocupadas >= disp.data()!.vagas_total) throw new HttpsError('resource-exhausted', 'Data lotada')

    const servico = await tx.get(db.collection('servicos').doc(servicoId))
    if (!servico.exists) throw new HttpsError('not-found', 'Serviço não encontrado')

    const agRef = db.collection('agendamentos').doc()
    tx.set(agRef, {
      tipo_evento: 'ueno', cliente_id: clienteId, servico_id: servicoId,
      instrutor_id: null, data_hora_inicio: null, data_hora_fim: null,
      data_reservada: disp.data()!.data, eh_reserva_aula: true, estado_reserva: 'data_reservada',
      valor_jpy: servico.data()!.preco_jpy, status_pagamento_aula: 'pendente', pago_em: null, confirmado_por: null,
      status: 'agendado', local: null, notas_instrutor: null, notas_admin: null,
      created_by: request.auth.uid, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    tx.update(dispRef, { vagas_ocupadas: admin.firestore.FieldValue.increment(1) })
    return { id: agRef.id }
  })
})
```

`marcarAgendamentoPago` (callable separado, só admin/instrutor — segue o padrão de `assertStaff`) grava `status_pagamento_aula: 'pago'`, `pago_em`, `confirmado_por: request.auth.uid`. Definir horário/local continua usando o `updateAgendamento` que já existe hoje (via `firestore.rules`, admin já pode dar update em qualquer agendamento) — só precisa disparar a notificação quando `data_hora_inicio` passa de `null` pra preenchido.

### `firestore.rules`

`/disponibilidade_aulas/{id}`: `allow read: if isSignedIn()` (cliente precisa ver as datas abertas), `allow write: if isAdmin()`. Nenhuma mudança em `/agendamentos/{id}` — a criação da reserva passa a ser sempre via `reservarDataAula` (Admin SDK, ignora rules), então a regra atual de `allow create: if isAdmin() || ...` pode continuar como está; cliente nunca ganha `create` direto na coleção.

---

## 5. Mudanças de UI

### Mobile — cliente escolhe a data

Novo componente em `apps/mobile/app/(cliente)/agenda/reservar.tsx` (ou tela dedicada linkada a partir do processo, quando a etapa atual tiver `agendamento_modo` indicando aula): lista `DisponibilidadeAula` futuras, mostrando `vagas_total - vagas_ocupadas` vagas ou "Lotado" quando zerar; ao tocar numa data livre, chama `reservarDataAula` e mostra confirmação.

### Mobile — `apps/mobile/app/(cliente)/agenda/index.tsx`

Hoje já trata bem `local`/`instrutor` nulos com "a definir". Ajustar só a linha de horário: quando `estado_reserva === 'data_reservada'` (ou seja, `data_hora_inicio == null`), mostrar a data reservada (`data_reservada`) com o texto **"Horário: aguardando definição da UENO"** em vez do `formatTimeRange` atual, que quebraria com `data_hora_inicio` nulo.

Quando `status_pagamento_aula` existir, mostrar o valor e status (mesmo padrão visual de `financeiro/index.tsx`, chip "Pagamento no dia da aula" enquanto `pendente`, "Pago" quando `pago`).

### Web — nova visão "Reservas do dia" (admin)

`apps/web/src/pages/agendamentos/ReservasDoDiaPage.tsx`: seletor de data → lista todos os `Agendamento` com `data_reservada` igual à data escolhida e `estado_reserva === 'data_reservada'` (equivalente ao "montar o itinerário" da especificação original) → pra cada linha, um form inline (reaproveitando os campos de `NovoAgendamentoPage.tsx`: hora início, hora fim, local, observação) que ao salvar chama `updateAgendamento` e muda `estado_reserva` pra `'horario_definido'`.

`NovoAgendamentoPage.tsx` continua existindo sem mudanças pra agendamentos que não são aula (entrevista, prova, etc.) — só o formulário de aula muda de fluxo.

---

## 6. Ordem sugerida de implementação

1. Tornar `data_hora_inicio`/`data_hora_fim` opcionais em `Agendamento` e no `agendamentoSchema` (cuidado: telas existentes que assumem esses campos sempre presentes — como `formatTimeRange` na agenda do cliente — precisam de guarda condicional antes de qualquer outra mudança, ou vão quebrar com `null`).
2. Coleção `disponibilidade_aulas` + regras + CRUD simples no admin pra cadastrar datas abertas com `vagas_total`.
3. Cloud Function `reservarDataAula` (transacional) + `marcarAgendamentoPago`.
4. Tela mobile do cliente pra listar datas disponíveis e reservar.
5. Ajustar a agenda do cliente (mobile) pros 3 estados (`data_reservada`, `horario_definido`, `realizado`) e pro valor/status de pagamento.
6. Tela admin "Reservas do dia" com o form de definir horário/local em lote.
7. Notificação automática quando o horário é definido — reaproveitar `notifyUser` da spec de multa/lembretes (`docs/multa-lembretes-especificacao.md`) se ela for implementada antes; senão, chamar `sendNotification` diretamente a partir do `updateAgendamento`/callable de horário.

---

## 7. Critérios de aceite

- [ ] Cliente vê só datas com `aberta: true` e `vagas_ocupadas < vagas_total`; datas lotadas aparecem desabilitadas, não escondidas.
- [ ] Reservar uma data não deixa escolher horário em nenhum momento do fluxo do cliente.
- [ ] Duas reservas simultâneas na última vaga de uma data não estouram `vagas_total` (testar com 2 chamadas concorrentes).
- [ ] Depois de reservar, a agenda do cliente mostra "Horário: aguardando definição da UENO" sem quebrar a tela.
- [ ] Admin vê, numa data escolhida, a lista de todos os clientes que reservaram aquele dia.
- [ ] Ao admin definir hora/local pra uma reserva, o cliente recebe notificação e a tela dele passa a mostrar hora e local normalmente (mesmo formato de hoje).
- [ ] Valor da aula aparece pro cliente com status "Pagamento no dia da aula" até a UENO marcar como pago; cliente não tem nenhuma ação de marcar pagamento (mesma regra do item 7 do raio-x).
- [ ] Agendamentos que não são aula (entrevista, prova, etc.) continuam funcionando exatamente como hoje, sem nenhuma das mudanças acima visíveis.

---

## 8. Fora de escopo agora

- Cancelamento da reserva de aula pelo cliente (é o item 17 do raio-x — ver `docs/cancelamento-especificacao.md`, spec separada).
- Otimização de itinerário/rota a partir das reservas do dia (já existe `otimizarRota` no projeto, mas integrá-lo automaticamente às reservas fica pra depois).
- Reagendamento (trocar de data depois de já ter reservado) — por enquanto, cancelar e reservar de novo.
- Notificação de "2 dias antes da aula" — isso é o lembrete de compromisso já coberto por `docs/multa-lembretes-especificacao.md` (item 13), não precisa ser reimplementado aqui.
