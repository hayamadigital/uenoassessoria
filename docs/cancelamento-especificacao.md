# Especificação — Cancelamento com Aviso de Política e Aceite

Item 17 do `docs/raio-x-especificacao.md`. Spec enxuta — é uma tela de confirmação com registro de aceite, não uma feature com modelo de dados complexo.

---

## 1. O que já existe e o que falta

Busca ampla por "cancelamento" no app do cliente só encontrou botões genéricos "Cancelar" de modais (fecham formulário, não cancelam nada no backend). Não existe hoje:
- Texto de política de cancelamento em nenhum lugar do app ou do admin.
- Nenhuma tela pedindo confirmação com checkbox antes de cancelar processo ou aula.
- Nenhum registro de que o cliente foi avisado da política antes de cancelar.

O que **já existe** e dá pra reaproveitar: `Agendamento.status` já tem o valor `'cancelado'` (`packages/firebase/src/types.ts:23`), e `ClienteProcesso.status` já tem `'cancelado'` (`packages/firebase/src/types.ts:68`) — ou seja, o estado final já existe, só falta o fluxo de chegar nele pelo lado do cliente, com o aviso.

---

## 2. Modelo de dados

### `packages/firebase/src/types.ts` — `PublicAppConfig`

Texto da política, editável pelo admin sem deploy (mesmo padrão de `docs/multa-lembretes-especificacao.md`):

```ts
export interface PublicAppConfig {
  // ...campos existentes
  politica_cancelamento_texto: string  // texto livre, mostrado no aviso antes do checkbox
}
```

### Nova subcoleção `/clientes/{id}/cancelamentos/{id}`

Registro do aceite — existe pra não haver disputa depois sobre "o cliente foi avisado?":

```ts
export interface CancelamentoRegistro {
  id: string
  cliente_id: string
  tipo_alvo: 'processo' | 'agendamento'
  alvo_id: string                 // id do ClienteProcesso ou do Agendamento cancelado
  politica_aceita_texto: string   // snapshot do texto da política no momento do aceite — se o admin editar a política depois, o registro antigo não muda
  aceito_em: string
  aceito_por: string               // uid do cliente (sempre o próprio, nunca staff cancelando em nome dele)
  created_at: string
}
```

Guardar o **snapshot do texto** (não só uma referência à config atual) é o ponto que garante a prova: mesmo que a UENO troque a política no mês seguinte, o registro de um cancelamento de hoje continua mostrando exatamente o texto que o cliente aceitou.

---

## 3. Fluxo do usuário

```
Cliente abre um processo ativo ou um agendamento futuro
  → toca em "Cancelar"
  → tela de confirmação mostra o texto de politica_cancelamento_texto
      ("O cancelamento poderá gerar cobrança de taxa conforme as regras da UENO Assessoria.")
  → checkbox "Li e estou de acordo com a política de cancelamento" (desmarcado por padrão)
  → botão "Confirmar cancelamento" fica desabilitado até o checkbox ser marcado
  → ao confirmar:
      → chama a Cloud Function cancelarComAceite
          → grava CancelamentoRegistro (com snapshot do texto + timestamp)
          → muda o status do alvo (ClienteProcesso ou Agendamento) para 'cancelado'
          → se for agendamento com reserva de aula (ver docs/agenda-aulas-especificacao.md),
            libera a vaga em DisponibilidadeAula (vagas_ocupadas - 1), se aplicável
      → notifica a UENO (notificação interna, tipo 'sistema', pra algum admin acompanhar)
```

---

## 4. Cloud Function — `cancelarComAceite`

Callable (não escrita direta do cliente) — assim o registro do aceite e a mudança de status acontecem atomicamente, e o cliente nunca consegue marcar algo como cancelado sem passar pelo aceite:

```ts
export const cancelarComAceite = onCall({ ...CORS }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Não autenticado')
  await enforceRateLimit(db, request, 'cancelarComAceite', 10)

  const tipoAlvo = request.data?.tipo_alvo as 'processo' | 'agendamento'
  if (!['processo', 'agendamento'].includes(tipoAlvo)) {
    throw new HttpsError('invalid-argument', 'tipo_alvo inválido')
  }
  const alvoId = requiredString(request.data?.alvo_id, 'alvo_id', 128)

  const clienteSnap = await db.collection('clientes').where('profile_id', '==', request.auth.uid).limit(1).get()
  if (clienteSnap.empty) throw new HttpsError('failed-precondition', 'Cadastro de cliente não encontrado')
  const clienteRef = clienteSnap.docs[0].ref
  const clienteId = clienteRef.id

  const alvoRef = db.collection(tipoAlvo === 'processo' ? 'clientes_processos' : 'agendamentos').doc(alvoId)
  const alvo = await alvoRef.get()
  if (!alvo.exists) throw new HttpsError('not-found', 'Registro não encontrado')

  // Garante que o alvo pertence a este cliente antes de cancelar qualquer coisa
  const pertenceAoCliente = tipoAlvo === 'processo'
    ? alvo.data()!.cliente_id === clienteId
    : alvo.data()!.cliente_id === clienteId
  if (!pertenceAoCliente) throw new HttpsError('permission-denied', 'Não autorizado')

  const config = await getConfig() // mesma função de docs/multa-lembretes-especificacao.md
  const now = new Date().toISOString()

  await db.runTransaction(async (tx) => {
    tx.update(alvoRef, { status: 'cancelado', updated_at: now })
    tx.set(clienteRef.collection('cancelamentos').doc(), {
      cliente_id: clienteId, tipo_alvo: tipoAlvo, alvo_id: alvoId,
      politica_aceita_texto: config.politica_cancelamento_texto,
      aceito_em: now, aceito_por: request.auth!.uid, created_at: now,
    })
    if (tipoAlvo === 'agendamento' && alvo.data()!.eh_reserva_aula && alvo.data()!.data_reservada) {
      // libera a vaga, se o fluxo de disponibilidade_aulas (docs/agenda-aulas-especificacao.md) já existir
    }
  })

  return { success: true }
})
```

### `firestore.rules`

`/clientes/{id}/cancelamentos/{id}`: `allow read: if isAdmin() || (isCliente() && dono do cliente)`, `allow write: if false` — a subcoleção só é escrita pela Cloud Function (Admin SDK), nunca direto pelo client, pra manter a garantia de prova.

---

## 5. Mudanças de UI (mobile — cliente)

Novo modal/tela `apps/mobile/src/components/CancelamentoModal.tsx`, reaproveitável tanto no detalhe do processo (`apps/mobile/app/(cliente)/(tabs)/processos/[id].tsx`) quanto na agenda (`apps/mobile/app/(cliente)/agenda/index.tsx`):

- Texto de aviso (`politica_cancelamento_texto`, vindo de `getPublicAppConfig`).
- Checkbox controlado — botão "Confirmar cancelamento" com `disabled` até marcar.
- Estado de loading durante a chamada de `cancelarComAceite`; erro tratado com a mesma UI padrão de erro já usada no resto do app (`safeErrorMessage`).
- Sucesso: fecha o modal, invalida as queries do processo/agenda (`@tanstack/react-query`), mostra confirmação simples.

Admin (web): campo de texto em `apps/web/src/pages/configuracoes/tabs/PreferenciasTab.tsx` (ou aba equivalente onde `support_whatsapp` já é editado hoje) pra editar `politica_cancelamento_texto`.

---

## 6. Ordem sugerida de implementação

1. Campo `politica_cancelamento_texto` em `PublicAppConfig` + edição no admin.
2. Subcoleção `cancelamentos` + regras (`allow write: if false`).
3. Cloud Function `cancelarComAceite`.
4. `CancelamentoModal.tsx` no mobile, plugado no detalhe do processo e na agenda.

---

## 7. Critérios de aceite

- [ ] Botão "Confirmar cancelamento" começa desabilitado e só habilita depois do checkbox marcado.
- [ ] Cancelar sem marcar o checkbox é impossível tanto na UI quanto no backend (a function não recebe esse parâmetro — o aceite é implícito em ter chegado até a chamada, mas o texto snapshot é sempre gravado).
- [ ] Depois de cancelar, o registro em `cancelamentos` mostra o texto exato da política vigente naquele momento, mesmo que a política seja editada depois.
- [ ] Cliente não consegue cancelar processo/agendamento de outro cliente (testar chamando a function com `alvo_id` de outra pessoa).
- [ ] Admin consegue editar o texto da política e o próximo cancelamento já reflete o texto novo.

---

## 8. Fora de escopo agora

- Cobrança automática de taxa de cancelamento — o aviso deixa claro que "poderá gerar cobrança", mas o lançamento da taxa em si continua manual pela UENO, como qualquer outro pagamento hoje.
- Cancelamento pelo admin em nome do cliente usando este mesmo fluxo de aceite (a UENO já pode mudar status manualmente hoje; este fluxo é só para o cliente cancelar pelo app).
- Prazo mínimo de antecedência para cancelar sem multa — não foi definido pelo Alexandre; se vier a ser pedido, encaixa como mais um campo em `PublicAppConfig`.
