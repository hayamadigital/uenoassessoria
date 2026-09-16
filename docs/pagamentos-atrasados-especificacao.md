# Especificação — Pagamentos Atrasados (sem tela nova)

Referência: `docs/raio-x-especificacao.md`, itens 25 (detalhe do bucket "Atrasado") e 26.

Decisão do Alexandre (já registrada no raio-x, item 26): **"não precisa de uma tela específica, só eu saber quem são os atrasados e como o sistema está cobrando."** Esta spec propositalmente NÃO cria uma tela nova — estende o Financeiro (`/financeiro`) e o Painel (`docs/painel-admin-especificacao.md`) que o Alexandre já usa.

Depende de `docs/multa-lembretes-especificacao.md` para o cálculo da multa (¥100/dia) — este documento só especifica onde e como essa informação aparece para o admin, não o cálculo em si.

---

## 1. O que já existe e o que falta

Levantamento em `apps/web/src/pages/financeiro/FinanceiroPage.tsx` e `packages/firebase/src/queries/financeiro.ts`.

| Peça | Status |
|---|---|
| KPIs "Pago no mês" / "Pendente" / "Cancelado" / "Cobranças" | ✅ já existe (`FinanceiroPage.tsx:310-332`, `getDashboardFinanceiro`) |
| Bucket "Atrasado" separado nos KPIs | 🔴 não existe — hoje uma parcela vencida continua contando como "Pendente" |
| `StatusPagamento` tem o valor `atrasado` | 🔴 não tem — só `pendente \| pago \| cancelado \| estornado` (`packages/firebase/src/types.ts`, ver `Pagamento`) |
| `StatusParcela` tem o valor `atrasado` | ✅ já tem (`packages/firebase/src/types.ts:30`) — mas nada seta esse status automaticamente hoje (é manual, botão "Atrasar" na aba financeira do cliente, segundo levantamento anterior) |
| Cálculo de dias de atraso e multa acumulada | 🔴 não existe (ver `docs/multa-lembretes-especificacao.md`) |
| Lista "quem está atrasado" em algum lugar visível | 🔴 não existe em nenhuma tela hoje |

---

## 2. O que muda

### 2.1 `StatusPagamento` ganha `atrasado`

```ts
// packages/firebase/src/types.ts
export type StatusPagamento = 'pendente' | 'pago' | 'cancelado' | 'estornado' | 'atrasado'
```

Um `Pagamento` (ou uma `Parcela`, dependendo de qual granularidade `docs/multa-lembretes-especificacao.md` escolher para aplicar a multa) passa a `atrasado` automaticamente quando `data_vencimento < hoje` e `status === 'pendente'` — calculado pela mesma Cloud Function agendada (`onSchedule`) especificada no doc de multa/lembretes, não por ação manual do admin. O botão "Atrasar" manual que existe hoje na aba financeira do cliente pode ser removido nesse momento (deixa de fazer sentido com o cálculo automático).

### 2.2 `DashboardFinanceiro` ganha `total_atrasado`

```ts
// packages/firebase/src/queries/financeiro.ts
export interface DashboardFinanceiro {
  total_pago_mes: number
  total_pendente: number
  total_cancelado: number
  total_atrasado: number        // novo — soma valor_jpy + multa acumulada das parcelas/pagamentos atrasados
  quantidade_pagamentos: number
  quantidade_atrasados: number  // novo — para o alerta do painel
}
```

`getDashboardFinanceiro` passa a somar separadamente `status === 'atrasado'` (hoje esses registros ficam misturados em "pendente" porque o status nem existe).

### 2.3 Novo card de KPI em `/financeiro`

Ao lado dos 4 cards existentes (`FinanceiroPage.tsx:314-331`), adicionar um 5º card "Atrasado" (cor de alerta, mesmo padrão visual dos outros — ver `MetricCard`/estilo já usado). Clicar no card filtra a tabela existente por `status === 'atrasado'` (reaproveita o `select` de status que já existe na página, só adiciona a opção).

### 2.4 Coluna de dias de atraso + multa na tabela

Na tabela de cobranças já existente (`FinanceiroPage.tsx:342-421`), quando `status === 'atrasado'`, mostrar abaixo do valor original a multa acumulada e o total atualizado:

```
¥20.000
+ ¥400 (multa · 4 dias)
= ¥20.400
```

Não é uma coluna nova — é um detalhe extra dentro da célula "Valor" já existente, só quando aplicável.

### 2.5 Alerta no Painel

Conforme `docs/painel-admin-especificacao.md`, o card de Alertas mostra a contagem de pagamentos vencidos e um clique leva para `/financeiro` já filtrado por atrasados (usa o mesmo filtro da seção 2.3).

---

## 3. Ordem sugerida de implementação

1. Adicionar `atrasado` a `StatusPagamento` (types.ts) — mudança de schema, sem quebrar nada existente (é um valor a mais no union).
2. Implementar a Cloud Function agendada de `docs/multa-lembretes-especificacao.md` primeiro (ela é quem seta `status: 'atrasado'` e calcula a multa) — este documento depende dela.
3. Estender `getDashboardFinanceiro` com `total_atrasado`/`quantidade_atrasados`.
4. Card de KPI + filtro + detalhe de multa na tabela em `FinanceiroPage.tsx`.
5. Ligar o alerta do Painel Admin ao filtro.
6. Remover o botão manual "Atrasar" da aba financeira do cliente (fica redundante).

---

## 4. Critérios de aceite

- [ ] Uma parcela/pagamento com `data_vencimento` no passado e `status: 'pendente'` vira `atrasado` automaticamente (sem ação manual), dentro de 24h da execução da function agendada.
- [ ] O card "Atrasado" em `/financeiro` mostra o valor correto (soma de valor original + multa) e a quantidade de cobranças atrasadas.
- [ ] Clicar no card filtra a tabela para mostrar só os atrasados.
- [ ] A tabela mostra, para cada linha atrasada, o valor original, a multa e o total atualizado.
- [ ] O alerta "X pagamentos vencidos" no Painel Admin bate com a mesma contagem de `/financeiro`.

---

## 5. Fora de escopo agora

- Qualquer tela nova dedicada a "pagamentos atrasados" — decisão explícita do Alexandre de não construir isso.
- Régua de cobrança automatizada (ex. WhatsApp automático para o cliente atrasado) — os lembretes de pagamento de `docs/multa-lembretes-especificacao.md` cobrem push/notificação in-app, não WhatsApp.
- Negociação/parcelamento de dívida atrasada pelo admin — continua sendo tratado manualmente fora do sistema por enquanto.
