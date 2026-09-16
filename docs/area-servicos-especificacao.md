# Especificação — Área de Serviços: Seleção Múltipla e Requisitos

Ver `docs/raio-x-especificacao.md`, item 4.

**Contexto:** hoje a tela de detalhe do serviço (`apps/mobile/app/(cliente)/servicos/[id].tsx`) só permite escolher **uma** variação por vez (ex.: Carro AT *ou* Moto 1000cc) e não explica elegibilidade antes do botão "Contratar agora". A especificação original pede duas coisas distintas:
1. o cliente poder marcar mais de uma variação na mesma visita (ex.: ☑ Carro AT + ☑ Moto 1000cc);
2. um bloco de "quem pode / requisitos / quem não pode" visível **antes** de contratar.

---

## 1. O que já existe e o que falta

| Peça | Status | Onde |
|---|---|---|
| Seleção de variação (chips horizontais) | ✅ existe, mas é **única** (`selectedVariacaoId: string \| null`) | `apps/mobile/app/(cliente)/servicos/[id].tsx:162` |
| Preço por variação (fixo ou faixa) | ✅ existe | `formatPreco()`, mesmo arquivo |
| Texto livre por variação (hoje usado como "requisito ou condição" segundo o próprio hint do admin: *"Descrição, requisito ou condição"*) | ✅ existe (`ServicoVariacao.descricao`), mas é exibido pequeno e discreto, só depois de já ter selecionado a variação | `apps/web/src/pages/servicos/ServicosDetailPage.tsx:457` (hint do form), `selectedSummaryDesc` no mobile |
| Bloco dedicado "quem pode / requisitos / quem não pode", visível antes do wizard | 🔴 não existe | — |
| Contratar mais de uma variação de uma vez | 🔴 não existe — `createProcesso` é chamado uma única vez com um `variacao_id` | `apps/mobile/app/(cliente)/servicos/[id].tsx:406-414` |

Conclusão: não precisa de infraestrutura de documentos/preço nova — é uma mudança de **UI + fluxo de submit**, mais um campo novo de texto no serviço para os requisitos gerais (a `descricao` da variação já cobre uma coisa parecida, mas no nível da variação, não do serviço como um todo).

---

## 2. Bloco "Quem pode / requisitos / quem não pode"

### Modelo de dados

Adicionar um campo em `Servico` (nível do serviço, não da variação — é o mesmo texto para "Transferência" independente de ser Carro AT ou Moto, como no exemplo da especificação: *"Antes de contratar, o aplicativo precisa explicar... quem pode transferir, quais são os requisitos e quem não pode"*):

```ts
// packages/firebase/src/types.ts — Servico
export interface Servico {
  // ...campos existentes
  elegibilidade_texto: string | null // "Quem pode / requisitos / quem não pode" — texto livre, multi-linha
}
```

Texto livre (mesmo padrão de `descricao`, sem rich text — o projeto não usa `RichTextEditor` para descrições de catálogo, só para cláusulas de contrato em `ProcessoDetailPage.tsx`). Se precisar de estrutura (ex. bullet points), o admin usa quebras de linha normais, igual já faz em `descricao`.

### Admin (`apps/web/src/pages/servicos/ServicosDetailPage.tsx`)

Adicionar um `<textarea>` a mais no form de edição do serviço, ao lado do campo `descricao` já existente (linha ~210, `register('descricao')`), com label "Quem pode / requisitos / quem não pode" e placeholder explicando o propósito (ex.: "Explique quem pode contratar este serviço, os requisitos e quem não pode — aparece para o cliente antes de contratar."). Segue exatamente o padrão do campo `descricao` (mesmo `register`, mesmo `updateServico`).

### Mobile (`apps/mobile/app/(cliente)/servicos/[id].tsx`)

Novo `<View style={s.section}>` chamado "Antes de contratar", posicionado **entre** a seção "Sobre o serviço" (linha 583-588) e a seção "Variações" (linha 590) — antes do cliente escolher a variação, não depois. Só renderiza se `servico.elegibilidade_texto` estiver preenchido; se vazio, a seção simplesmente não aparece (sem quebrar o layout de serviços antigos que ainda não tiverem esse campo preenchido).

Visualmente destacado (ex.: fundo levemente diferente + ícone de alerta/informação), para não se confundir com o texto neutro de "Sobre o serviço" — é informação que muda a decisão do cliente, não só descrição de marketing.

---

## 3. Seleção múltipla de variações

### Estado

Trocar:
```ts
const [selectedVariacaoId, setSelectedVariacaoId] = useState<string | null>(null)
```
por:
```ts
const [selectedVariacaoIds, setSelectedVariacaoIds] = useState<string[]>([])
```

`selectedVariacoes = activeVariacoes.filter(v => selectedVariacaoIds.includes(v.id))` no lugar de `selectedVariacao`.

### Chips (linha ~600-621)

Toggle em vez de substituição:
```ts
onPress={() => setSelectedVariacaoIds((current) =>
  current.includes(variacao.id)
    ? current.filter((id) => id !== variacao.id)
    : [...current, variacao.id]
)}
```

O `useEffect` que auto-seleciona a primeira variação ao carregar (linha 232-236) deve continuar selecionando só uma por padrão — seleção múltipla é uma ação deliberada do cliente, não o estado inicial.

### Preço, etapas e documentos com múltipla seleção

- **Preço**: com 1 variação selecionada, mostra o preço normal. Com 2+, mostrar "A partir de {soma dos preços fixos}" quando todas tiverem `preco_jpy` fixo, ou "Sob consulta" se qualquer uma usar `preco_variavel` (faixa) — somar faixas no rodapé fica confuso, então cai no texto genérico nesse caso.
- **Etapas incluídas** (`visibleEtapas`, linha 437-443): hoje filtra pela variação única. Trocar para união: uma etapa aparece se `etapa.variacao_ids.length === 0` (aplica a todas) **ou** se pelo menos uma das variações selecionadas estiver em `etapa.variacao_ids`.
- **Documentos solicitados** (`documentosSolicitados`, linha 193-197): a query `listDocumentoTemplatesByServico` já aceita um `variacaoId` só (`selectedVariacaoId`). Com múltipla seleção, buscar os templates de cada variação selecionada e unir por `id` (evitar duplicar um documento pedido por mais de uma variação) — troca de uma chamada para `Promise.all` + merge.

### Submit — um processo por variação

Hoje `submitContractMutation` roda os passos pessoais (dados, contato, CNH, visto, endereço, documentos) **e** cria **um** `createProcesso` no final (linha 406-414). Com múltipla seleção, os passos pessoais continuam rodando uma vez só — são do cliente, não da variação — mas o `createProcesso` roda em loop, um por variação selecionada:

```ts
for (const variacao of selectedVariacoes) {
  await createProcesso(db, {
    cliente_id: clienteAtual.id,
    servico_id: serviceId!,
    variacao_id: variacao.id,
    data_inicio: null,
    valor_acordado_jpy: null,
    status: 'analise',
    notas: `Solicitação enviada pelo app para análise.${contractForm.whatsapp.trim() ? ` WhatsApp: ${contractForm.whatsapp.trim()}.` : ''}`,
  })
}
```

Cada variação vira um `ClienteProcesso` independente (mesmo comportamento hoje já confirmado no item 18 do raio-x — "contratar novo serviço cria processo independente" — aqui é só a mesma coisa acontecendo em lote, na mesma sessão do wizard).

`openWizard()` (linha 460-471) passa a validar `selectedVariacaoIds.length > 0` em vez de checar uma única seleção.

---

## 4. Critérios de aceite

- [ ] Serviço sem `elegibilidade_texto` preenchido continua funcionando igual a hoje (seção não aparece, sem erro).
- [ ] Admin consegue editar "Quem pode / requisitos / quem não pode" em `ServicosDetailPage.tsx` e o texto aparece no app antes da lista de variações.
- [ ] Cliente consegue marcar 2+ variações do mesmo serviço (ex.: Carro AT + Moto 1000cc) e ver ambas destacadas nos chips.
- [ ] Etapas e documentos mostrados refletem a união das variações selecionadas, sem duplicar documento repetido em duas variações.
- [ ] Ao enviar, são criados N `cliente_processos` (um por variação selecionada), todos em status `analise`, todos aparecendo depois em "Meus Processos" (mobile) e na lista de processos do cliente (admin).
- [ ] Contratar só 1 variação continua funcionando exatamente como hoje (nenhuma regressão no caminho mais comum).

---

## 5. Fora de escopo agora

- Preço combinado detalhado por variação na tela de contratação (mostra "a partir de" ou "sob consulta", não um checkout item-a-item).
- Estruturar `elegibilidade_texto` em campos tipados (idade mínima, tipo de CNH exigido etc.) — fica texto livre por enquanto, igual a `descricao`.
- Mudar `ServicoVariacao.descricao` de lugar ou de propósito — continua existindo como está, só o novo campo de serviço é adicionado ao lado.
