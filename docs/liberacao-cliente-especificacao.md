# Especificação — Liberação do Cliente pela UENO

Ver `docs/raio-x-especificacao.md`, item 9.

**Contexto:** o raio-x original descrevia esse ponto como "liberação implícita" (só a troca de `status_processo`/`status` para `ativo`, sem ação administrativa explícita). Ao investigar o código pra escrever esta spec, encontrei algo melhor do que o raio-x assumia: **já existe uma ação explícita de aprovação por processo** — só falta uma peça específica (auditoria: quem aprovou e quando). Esta spec corrige o diagnóstico e propõe só o que realmente falta, em vez de reconstruir um fluxo que já existe.

---

## 1. O que já existe (e é mais do que o raio-x original registrou)

Em `apps/web/src/pages/clientes/ProcessoDetailPage.tsx`, quando um `ClienteProcesso` está com `status: 'analise'`, a tela já mostra uma decisão explícita para quem tem permissão (`canManageProcesso`):

- **"Acordar processo"** (linha ~1279): abre um modal pedindo valor total e parcelas, e ao confirmar (`acordarProcessoMutation`, linha ~788-846):
  - cria o `Pagamento` + `Parcela`s;
  - muda `ClienteProcesso.status` para `'ativo'` e grava `valor_acordado_jpy`, `data_inicio`;
  - cria as `ProcessoEtapa`s a partir dos templates do serviço.
- **"Recusar análise"** (linha ~859-865): muda `status` para `'cancelado'` e anexa "Análise recusada." em `notas`.

Isso já cobre, na prática, exatamente o que a especificação original pedia — inclusive já é o lugar onde a UENO lança as parcelas manualmente, que é a decisão confirmada por Alexandre no item 6 do raio-x ("eu mesmo coloco as parcelas manualmente"). **Não é necessário criar uma tela nova de aprovação.**

`functions/src/index.ts:setUserActive` (linha 392) é uma função diferente e **não deve ser confundida com isso**: ela ativa/desativa a conta inteira do usuário no Firebase Auth (`auth.disabled`), usada para banir/reativar um usuário — não tem relação com aprovar um processo específico.

---

## 2. O que falta de verdade: auditoria

`acordarProcessoMutation` e `recusarProcessoMutation` chamam `updateProcesso(db, processoId, { status: ..., ... })` sem registrar **quem** tomou a decisão nem **quando**. Hoje, se dois administradores usam a conta, não dá pra saber depois quem acordou ou recusou um processo específico — só o `updated_at` genérico do documento.

### Modelo de dados

```ts
// packages/firebase/src/types.ts — ClienteProcesso
export interface ClienteProcesso {
  // ...campos existentes
  decidido_por: string | null   // uid do admin/atendimento que acordou ou recusou
  decidido_em: string | null    // ISO timestamp da decisão
}
```

### Mudança nas duas mutations (`ProcessoDetailPage.tsx`)

```ts
const userId = useAuthStore.getState().session?.userId // já usado em acordarProcessoMutation hoje

await updateProcesso(db, processoId!, {
  status: 'ativo',
  data_inicio: processo!.data_inicio ?? new Date().toISOString().slice(0, 10),
  valor_acordado_jpy: data.valor_jpy,
  notas: processo!.notas ?? 'Processo acordado após análise dos dados e documentos.',
  decidido_por: userId,
  decidido_em: new Date().toISOString(),
})
```

Mesma coisa em `recusarProcessoMutation`. Os dois já têm acesso a `userId`/à sessão no escopo (o `acordarProcessoMutation` já usa `userId` para `registrado_por` do pagamento) — é reaproveitar o mesmo dado, não buscar nada novo.

### Exibição

Na `ProcessoDetailPage.tsx`, quando `status !== 'analise'` (processo já decidido), mostrar quem decidiu e quando junto do badge de status já existente (linha ~1572) — texto pequeno tipo "Acordado por {nome} em {data}" / "Recusado por {nome} em {data}", resolvendo `decidido_por` (uid) para nome via o mesmo padrão de `ClienteHistoricoWithResponsavel` já usado em `ClienteHistoricoTab.tsx`.

---

## 3. Critérios de aceite

- [ ] Ao clicar "Acordar processo" e confirmar, o documento do processo grava `decidido_por` (uid de quem clicou) e `decidido_em` (timestamp).
- [ ] Ao clicar "Recusar análise", mesma gravação.
- [ ] A tela do processo já acordado/recusado mostra o nome de quem decidiu e a data, não só o badge de status.
- [ ] Processos acordados antes dessa mudança continuam funcionando normalmente (campos novos ficam `null`, sem quebrar nada).

---

## 4. Fora de escopo agora

- Uma tela de "aprovar cadastro" separada da aprovação por processo — o fluxo já existente (Acordar/Recusar por processo) é suficiente e já é o que a UENO usa; não duplicar.
- Aprovação em lote de múltiplos processos de uma vez.
- Qualquer mudança em `setUserActive` — ele resolve um problema diferente (banir/reativar conta) e não deve ganhar responsabilidades de aprovação de processo.
