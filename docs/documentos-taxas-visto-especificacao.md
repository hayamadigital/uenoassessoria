# Especificação — Documentos e Taxas por Etapa + Alerta de Vencimento de Visto

Cobre o item 12 do `docs/raio-x-especificacao.md`.

Decisão do Alexandre (retorno sobre o raio-x): "Dentro das opções de etapa que ela está, tem os documentos que ela precisa apresentar no dia. Estamos tendo muito problema com pessoas que renovam o visto e não levam o novo Jūminhyō. Gostaria que tivesse essa opção de avisar sobre esse documento — se existir a possibilidade de deixar aviso de próximo do vencimento do visto, ou que a data de retorno no menkyou center, o visto estará vencido."

São duas features relacionadas, mas distintas:
- **(A)** checklist estática de "o que levar" + taxa, por etapa de um serviço.
- **(B)** alerta dinâmico cruzando a validade do visto do cliente com a data do próximo compromisso — motivado por um problema real e recorrente (cliente renova visto, esquece de levar o Jūminhyō atualizado).

---

## 1. O que já existe e o que falta

| Peça | Estado atual | Gap |
|---|---|---|
| `EtapaTemplate` (`packages/firebase/src/types.ts:526`) | Nome, descrição, responsável padrão por etapa de um serviço — configurado em `apps/web/src/pages/servicos/ServicosDetailPage.tsx` | 🔴 sem campo de documentos necessários nem taxa |
| `ProcessoEtapa` (`types.ts:512`) | Copiado do `EtapaTemplate` na criação do processo (`ClienteProcessoTab.tsx:146-158`, via `addDoc` direto, sem passar pelo template depois) | 🔴 mesma coisa — precisa dos mesmos 2 campos, copiados no mesmo lugar |
| `DocumentoTemplate` (`types.ts:214`) + `ClienteDocumento` | Já existe um sistema de documento **obrigatório por serviço/variação**, mas é para o cliente **enviar/upload** (`apps/mobile/app/(cliente)/documentos/index.tsx`), com status pendente/enviado/aprovado/reprovado — não é uma checklist de "levar no dia" | 🟡 conceito adjacente, propósito diferente — não reaproveitar diretamente |
| `Cliente.visto_validade` (`types.ts:154`) | Já existe e já é preenchido (perfil do cliente, dados pessoais) | ✅ não precisa de campo novo |
| Cruzamento visto × data de compromisso | Não existe em nenhum lugar do código | 🔴 precisa de um helper novo + UI de aviso |

---

## 2. Parte A — Documentos e taxa por etapa

### 2.1 Modelo de dados

Adicionar 2 campos, tanto no template (nível serviço) quanto na instância (nível processo do cliente) — mesma lista de campos copiados hoje (`nome`, `descricao`, `responsavel_padrao`/`responsavel`, `ordem`):

```ts
// packages/firebase/src/types.ts
export interface EtapaTemplate {
  id: string
  servico_id: string
  nome: string
  descricao: string | null
  responsavel_padrao: ResponsavelEtapa
  variacao_ids: string[]
  ordem: number
  documentos_necessarios: string[]   // novo — ex.: ['Zairyū Card', 'Passaporte', 'Jūminhyō']
  taxa_jpy: number | null            // novo — taxa cobrada nessa etapa, se houver
  created_at: string
}

export interface ProcessoEtapa {
  id: string
  processo_id: string
  nome: string
  descricao: string | null
  status: StatusProcessoEtapa
  agendamento_modo: AgendamentoModoEtapa
  data_agendada: string | null
  responsavel: ResponsavelEtapa
  ordem: number
  documentos_necessarios: string[]   // novo — copiado do template na criação
  taxa_jpy: number | null            // novo — copiado do template na criação
  created_at: string
  updated_at: string
}
```

### 2.2 Onde editar (admin)

- `apps/web/src/pages/servicos/ServicosDetailPage.tsx` — formulário de `EtapaTemplate` (o mesmo `useForm<EtapaTemplateInput>` em torno da linha 175-230): adicionar
  - um campo de lista de documentos (input de texto + "adicionar", ou textarea com 1 documento por linha convertido em array — não existe um componente de tag-input reaproveitável no projeto hoje, textarea por linha é a opção mais simples de construir);
  - um campo numérico de taxa (¥), mesmo padrão de input usado para `preco_jpy` em outros formulários de serviço.
- `EtapaTemplateInput`/`createEtapaTemplate`/`updateEtapaTemplate` (`packages/firebase/src/queries/etapa_templates.ts`) precisam aceitar os 2 campos novos.

### 2.3 Onde copiar (criação do processo)

`apps/web/src/pages/clientes/tabs/ClienteProcessoTab.tsx`, dentro do bloco que copia os templates para `processo_etapas` (linhas 145-158):

```ts
etapaTemplates.map((t) =>
  addDoc(collection(db, 'processo_etapas'), {
    processo_id: processo.id,
    nome: t.nome,
    descricao: t.descricao,
    responsavel: t.responsavel_padrao,
    ordem: t.ordem,
    documentos_necessarios: t.documentos_necessarios ?? [],  // novo
    taxa_jpy: t.taxa_jpy ?? null,                             // novo
    status: 'pendente',
    agendamento_modo: 'nao_aplica',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  }),
)
```

### 2.4 Onde exibir (cliente)

Dentro da timeline de etapas do processo (`apps/mobile/app/(cliente)/(tabs)/processos/[id].tsx`, seção "Etapas", linhas 198-219) — ao tocar numa etapa (ou no resumo de "etapa atual"/"próxima etapa" da spec `docs/home-processo-cliente-especificacao.md`), mostrar, se existirem:
- lista "Documentos e taxas" com os itens de `documentos_necessarios`;
- `taxa_jpy` formatado (`¥ X.XXX`), se não for `null`.

Etapas sem documentos/taxa configurados simplesmente não mostram essa seção (compatível com todas as etapas já existentes, que nascerão com `[]`/`null`).

---

## 3. Parte B — Alerta de vencimento de visto

### 3.1 Lógica

Novo helper puro, sem dependência de Firebase (para poder ser testado e reaproveitado tanto no app quanto, futuramente, nas notificações automáticas do item 13):

```ts
// packages/utils/src/visto-alerta.ts
export type VistoAlertaNivel = 'ok' | 'vence_antes_do_compromisso' | 'vence_em_breve'

const DIAS_AVISO_ANTECIPADO = 30

export function checkVistoAlerta(
  vistoValidade: string | null,       // Cliente.visto_validade, 'YYYY-MM-DD'
  proximoCompromisso: string | null,  // data ISO do próximo Agendamento/ProcessoEtapa.data_agendada
  hoje: Date = new Date(),
): VistoAlertaNivel | null {
  if (!vistoValidade) return null
  const validade = new Date(vistoValidade)

  if (proximoCompromisso && new Date(proximoCompromisso) > validade) {
    return 'vence_antes_do_compromisso' // pior caso: visto já estará vencido na data do compromisso
  }

  const diasParaVencer = Math.floor((+validade - +hoje) / 86_400_000)
  if (diasParaVencer <= DIAS_AVISO_ANTECIPADO) return 'vence_em_breve'

  return 'ok'
}
```

`proximoCompromisso` reaproveita o mesmo cálculo de "próximo compromisso do processo" já especificado em `docs/home-processo-cliente-especificacao.md` (seção 3) — não é uma query nova, é o mesmo dado passado para este helper.

### 3.2 Onde exibir

- **App do cliente**: banner de aviso em `apps/mobile/app/(cliente)/documentos/index.tsx` (topo da tela, acima do resumo de enviados/aprovados) quando `checkVistoAlerta` retornar `'vence_antes_do_compromisso'` (crítico, cor de alerta) ou `'vence_em_breve'` (aviso, cor mais neutra). Mensagem sugerida:
  - `vence_antes_do_compromisso`: "Seu visto vence antes da sua próxima data no menkyou center. Providencie a renovação e leve o Jūminhyō atualizado."
  - `vence_em_breve`: "Seu visto vence em breve. Lembre-se de atualizar o Jūminhyō antes do seu próximo compromisso."
- Mesmo aviso pode aparecer no card de processo da Home (reaproveitando a estrutura da spec de Home) como um badge pequeno, sem duplicar o texto completo.
- **Admin**: mostrar o mesmo nível de alerta ao lado do campo `visto_validade` na ficha do cliente (`apps/web/src/pages/clientes/tabs/ClienteDadosPessoaisTab.tsx` ou `ClienteJapaoVistoTab.tsx` — confirmar qual aba tem esse campo ao implementar), para a equipe também ver sem precisar abrir o app do cliente.

---

## 4. Ordem sugerida de implementação

1. Helper `checkVistoAlerta` isolado (não depende de nada além de datas) — mais fácil de testar sozinho.
2. Campos novos em `EtapaTemplate`/`ProcessoEtapa` + formulário admin (`ServicosDetailPage.tsx`) + cópia na criação do processo (`ClienteProcessoTab.tsx`).
3. Exibição da checklist de documentos/taxa no app do cliente (depende do passo 2 ter dado gravado para testar de verdade).
4. Exibição do alerta de visto no app do cliente e no admin (depende do passo 1).
5. Configurar manualmente os documentos/taxa nas etapas dos serviços já existentes (dado, não código — feito pela UENO no admin depois do deploy).

---

## 5. Critérios de aceite

- [ ] Admin consegue adicionar/editar documentos necessários e taxa numa etapa de um serviço, em `Serviços → [serviço] → Etapas`.
- [ ] Um novo processo criado depois dessa mudança tem as etapas já com `documentos_necessarios`/`taxa_jpy` copiados do template.
- [ ] Cliente vê a lista de documentos + taxa da etapa atual/próxima no app (etapas antigas sem essa config não quebram, só não mostram a seção).
- [ ] Cliente com visto vencendo em ≤30 dias vê o aviso `vence_em_breve` em Documentos.
- [ ] Cliente cujo próximo compromisso é depois da validade do visto vê o aviso mais crítico `vence_antes_do_compromisso`, mesmo que a validade ainda esteja a mais de 30 dias (ex.: compromisso reagendado para muito longe).
- [ ] Cliente sem `visto_validade` preenchido não vê nenhum aviso (não quebra, não gera falso alarme).
- [ ] Admin vê o mesmo alerta na ficha do cliente.

---

## 6. Fora de escopo agora

- Reaproveitar/alterar o fluxo existente de `DocumentoTemplate`/`ClienteDocumento` (upload de documento pelo cliente) — é um sistema separado, não mexer.
- Notificação push automática do alerta de visto — a lógica de cálculo (`checkVistoAlerta`) fica pronta para ser chamada pelo job de notificações do item 13, mas o agendamento/disparo em si é escopo daquele item, não deste.
- Painel administrativo agregando todos os clientes com visto vencendo (isso pertence aos "alertas" do painel principal, item 20 do raio-x) — aqui é só o cálculo + aviso individual na ficha/app.
