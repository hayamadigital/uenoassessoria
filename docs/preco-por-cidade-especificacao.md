# Especificação — Preço Automático por Cidade e Centro de Exame

Ver `docs/raio-x-especificacao.md`, item 5.

**Contexto:** a UENO atende por mais de um centro de exame (menkyou center), cada um com preço diferente por tipo de transmissão (automático/AT ou manual/MT), e a elegibilidade de transmissão depende da cidade onde o cliente mora. Essa regra **mudou em junho de 2026** e pode mudar de novo — por isso o modelo abaixo é pensado para ser **editável pelo admin**, nunca hardcoded no app.

Regra confirmada por Alexandre (dono da UENO), válida a partir de junho de 2026:

| Menkyou center | Automático (AT) | Manual (MT) | Cidades com direito a escolher AT ou MT |
|---|---|---|---|
| Shizuoka | ¥60.000 | ¥75.000 | Makinohara, Fujieda, Yoshida, Shimada, Yaizu, Shizuoka-shi |
| Hamakita | ¥70.000 | ¥85.000 | (não detalhado — ver seção 6) |

- Fora das 6 cidades listadas, quem ainda assim quiser fazer em **Shizuoka** só pode **manual** — Shizuoka é o único centro que aplica teste prático com carro manual; os demais centros só fazem automático.
- Busca (transporte) inclusa de Shimizu até Iwata; fora dessa faixa, o cliente se desloca até a estação de Shizuoka por conta própria.
- Mesmo valor para clientes filipinos e do Sri Lanka — sem diferenciação por nacionalidade.

---

## 1. O que já existe e o que falta

| Peça | Status | Onde |
|---|---|---|
| Preço fixo ou faixa por serviço/variação | ✅ existe (`preco_jpy` / `preco_min_jpy`+`preco_max_jpy`) | `packages/firebase/src/types.ts` — `Servico`, `ServicoVariacao` |
| Cidade do cliente já capturada no cadastro | ✅ existe (`Cliente.cidade_jp`, texto livre com autocomplete local) | `packages/utils/src/cidades-japao.ts`, `Cliente.cidade_jp` |
| Relação cidade → centro de exame → preço por transmissão | 🔴 não existe em nenhuma coleção | — |
| Campo "transmissão" (AT/MT) na variação de carro | 🔴 não existe — hoje é só o nome da variação (`"Carro AT"`, `"Carro MT"` como texto livre) | `ServicoVariacao.nome` |
| Tela de admin para editar essa regra quando ela mudar de novo | 🔴 não existe | — |

---

## 2. Modelo de dados

### Nova coleção `menkyou_centers`

```ts
// packages/firebase/src/types.ts
export interface MenkyouCenter {
  id: string
  nome: string                     // "Shizuoka", "Hamakita"
  preco_at_jpy: number | null      // null = este centro não faz teste automático
  preco_mt_jpy: number | null      // null = este centro não faz teste manual
  cidades_elegiveis: string[]      // cidades com direito a escolher AT OU MT neste centro
  apenas_manual_fora_da_lista: boolean // true = fora de `cidades_elegiveis`, só pode contratar MT neste centro
  zona_busca_cidades: string[]     // cidades com busca/transporte incluso (fora delas, cliente vai até a estação por conta própria)
  observacao: string | null        // texto livre — ex. explicar a regra de busca, exibido junto do preço
  is_active: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export type MenkyouCenterInsert = Omit<MenkyouCenter, 'id' | 'created_at' | 'updated_at'>
```

Seed inicial (dados reais confirmados por Alexandre):

```ts
{
  nome: 'Shizuoka',
  preco_at_jpy: 60000,
  preco_mt_jpy: 75000,
  cidades_elegiveis: ['Makinohara', 'Fujieda', 'Yoshida', 'Shimada', 'Yaizu', 'Shizuoka'],
  apenas_manual_fora_da_lista: true,
  zona_busca_cidades: ['Shimizu', 'Iwata'], // ver seção 5 — zona é um intervalo geográfico, não só essas 2 cidades
  observacao: 'Busca inclusa de Shimizu até Iwata. Fora dessa área, o cliente vai até a estação de Shizuoka.',
  is_active: true,
  ordem: 0,
}
{
  nome: 'Hamakita',
  preco_at_jpy: 70000,
  preco_mt_jpy: 85000,
  cidades_elegiveis: [],           // ver seção 6 — a confirmar com Alexandre
  apenas_manual_fora_da_lista: false,
  zona_busca_cidades: [],
  observacao: null,
  is_active: true,
  ordem: 1,
}
```

### Novo campo em `ServicoVariacao`

Para o cálculo saber se uma variação de carro é AT ou MT sem depender de parsing de texto no nome (`"Carro AT"` vs `"carro automatico"` etc.):

```ts
// packages/firebase/src/types.ts — ServicoVariacao
export interface ServicoVariacao {
  // ...campos existentes
  transmissao: 'AT' | 'MT' | null // só preenchido em variações de carro elegíveis a este cálculo; null para moto/caminhão/outros
}
```

O admin marca isso manualmente ao cadastrar a variação "Carro AT" / "Carro MT" — não é inferido do nome.

---

## 3. Função de resolução de preço

Nova função pura, sem dependência de UI, em `packages/firebase/src/pricing.ts` (ou `packages/utils`, já que não toca Firestore diretamente — recebe a lista de centros já carregada):

```ts
export interface MenkyouPriceOption {
  center: MenkyouCenter
  transmissao: 'AT' | 'MT'
  preco_jpy: number
  dentro_da_zona_busca: boolean
}

export function resolveMenkyouOptions(
  cidadeCliente: string,
  centers: MenkyouCenter[],
): MenkyouPriceOption[] {
  const cidade = cidadeCliente.trim().toLowerCase()
  const options: MenkyouPriceOption[] = []

  for (const center of centers.filter((c) => c.is_active)) {
    const elegivel = center.cidades_elegiveis.some((c) => c.toLowerCase() === cidade)
    const dentroDaZona = center.zona_busca_cidades.some((c) => c.toLowerCase() === cidade)

    if (elegivel) {
      if (center.preco_at_jpy != null) options.push({ center, transmissao: 'AT', preco_jpy: center.preco_at_jpy, dentro_da_zona_busca: dentroDaZona })
      if (center.preco_mt_jpy != null) options.push({ center, transmissao: 'MT', preco_jpy: center.preco_mt_jpy, dentro_da_zona_busca: dentroDaZona })
    } else if (center.apenas_manual_fora_da_lista && center.preco_mt_jpy != null) {
      options.push({ center, transmissao: 'MT', preco_jpy: center.preco_mt_jpy, dentro_da_zona_busca: dentroDaZona })
    }
  }

  return options
}
```

Aceita uma estratégia de desempate para quando mais de um centro é válido para a mesma cidade — configurável pelo admin (ver seção 4), não fixa no código:

```ts
export type EstrategiaSobreposicao = 'todas' | 'mais_proxima'

export function resolveMenkyouOptions(
  cidadeCliente: string,
  centers: MenkyouCenter[],
  estrategia: EstrategiaSobreposicao = 'todas',
): MenkyouPriceOption[] {
  const cidade = cidadeCliente.trim().toLowerCase()
  const options: MenkyouPriceOption[] = []

  for (const center of centers.filter((c) => c.is_active)) {
    const elegivel = center.cidades_elegiveis.some((c) => c.toLowerCase() === cidade)
    const dentroDaZona = center.zona_busca_cidades.some((c) => c.toLowerCase() === cidade)

    if (elegivel) {
      if (center.preco_at_jpy != null) options.push({ center, transmissao: 'AT', preco_jpy: center.preco_at_jpy, dentro_da_zona_busca: dentroDaZona })
      if (center.preco_mt_jpy != null) options.push({ center, transmissao: 'MT', preco_jpy: center.preco_mt_jpy, dentro_da_zona_busca: dentroDaZona })
    } else if (center.apenas_manual_fora_da_lista && center.preco_mt_jpy != null) {
      options.push({ center, transmissao: 'MT', preco_jpy: center.preco_mt_jpy, dentro_da_zona_busca: dentroDaZona })
    }
  }

  if (estrategia === 'todas') return options

  // 'mais_proxima': mantém só a opção do centro mais próximo por transmissão, quando
  // dois+ centros são válidos ao mesmo tempo para a mesma cidade (ex.: se as áreas de
  // Shizuoka e Hamakita se sobrepuserem numa cidade específica). "Mais próximo" aqui
  // não é cálculo de distância real (fora de escopo, ver seção 5) — é o campo `ordem`
  // que já existe em `MenkyouCenter` (hoje só usado pra ordenar a listagem no admin):
  // o Alexandre organiza os centros na ordem real de proximidade/preferência, e o
  // centro com `ordem` menor é considerado "o mais próximo" para efeito de desempate.
  const maisProximaPorTransmissao = new Map<'AT' | 'MT', MenkyouPriceOption>()
  for (const option of options) {
    const atual = maisProximaPorTransmissao.get(option.transmissao)
    if (!atual || option.center.ordem < atual.center.ordem) maisProximaPorTransmissao.set(option.transmissao, option)
  }
  return [...maisProximaPorTransmissao.values()]
}
```

Sem sobreposição (o caso mais comum, já que hoje só Shizuoka tem `cidades_elegiveis` preenchida), as duas estratégias dão o mesmo resultado — a diferença só aparece se, no futuro, uma cidade for cadastrada como elegível em mais de um centro ao mesmo tempo. Nesse caso, o Alexandre define qual centro é "mais próximo" simplesmente arrastando/reordenando a lista de centros no admin (campo `ordem`), sem precisar de geolocalização nem de cálculo de distância real.

Uso no fluxo de contratação (`apps/mobile/app/(cliente)/servicos/[id].tsx`): quando a variação selecionada tem `transmissao` preenchido e o cliente já tem `cidade_jp` cadastrada, chamar `resolveMenkyouOptions(cliente.cidade_jp, menkyouCenters)` e filtrar pela transmissão da variação. Se houver exatamente 1 resultado, mostrar o preço resolvido no lugar do `preco_jpy` estático da variação. Se houver mais de um centro elegível, mostrar as opções para o cliente escolher (ex.: "Shizuoka — ¥75.000" vs "Hamakita — ¥85.000"). Se não houver nenhum resultado (cidade não coberta por nenhum centro para essa transmissão), cair no preço estático da variação como fallback e sinalizar "sob consulta".

---

## 4. Admin — tela de edição das regras

Nova aba em Configurações, seguindo o mesmo padrão de `apps/web/src/pages/configuracoes/tabs/LocaisTab.tsx` (que já lista/edita `DestinoFixo` num formato de tabela + dialog de edição, mas é outro domínio — pontos de rota, não menkyou centers; **não reaproveitar o componente**, só o padrão visual):

- `apps/web/src/pages/configuracoes/tabs/MenkyouCentersTab.tsx` — tabela com nome, preço AT, preço MT, quantidade de cidades elegíveis, ativo/inativo.
- Dialog de edição: nome, preço AT, preço MT, lista de cidades elegíveis (multi-select ou textarea de uma cidade por linha — mais simples de editar rápido do que um combobox), toggle "fora da lista, só manual", lista de cidades da zona de busca, campo de observação livre.
- `packages/firebase/src/queries/menkyou_centers.ts` — CRUD padrão (`listMenkyouCenters`, `createMenkyouCenter`, `updateMenkyouCenter`, `toggleMenkyouCenterAtivo`), mesmo formato de `queries/servicos.ts`.

Isso é o que resolve o "regra muda de novo no futuro" — quando Alexandre quiser mudar um preço, adicionar/remover uma cidade (inclusive preencher a lista do Hamakita quando ele decidir quais cidades são atendidas — fica vazia até lá, sem bloquear o resto), é editar aqui, sem precisar de deploy.

### Estratégia de sobreposição — nova opção em Preferências

A escolha de "mostrar todas as opções válidas" vs "mostrar só a mais próxima" (ver `EstrategiaSobreposicao` na seção 3) também fica editável pelo Alexandre, não fixa no código. Adicionar em `PublicAppConfig` (`packages/firebase/src/types.ts`, mesmo doc `app_config/public` já usado por `support_whatsapp`, `simulado_passing_percentage` etc.):

```ts
// packages/firebase/src/types.ts — PublicAppConfig
export interface PublicAppConfig {
  // ...campos existentes
  menkyou_estrategia_sobreposicao: 'todas' | 'mais_proxima' // default 'todas'
}
```

E um seletor (dois botões ou um `<Select>`) na aba já existente `apps/web/src/pages/configuracoes/tabs/PreferenciasTab.tsx`, junto dos outros campos de `PublicAppConfig` que essa aba já edita (`support_whatsapp`, `home_material_category_id`, `simulado_passing_percentage`) — mesmo padrão de `updatePublicAppConfig`, sem tela nova.

---

## 5. Zona de busca (transporte)

A regra "busca de Shimizu até Iwata" é geográfica (um trecho contínuo do litoral, não só essas duas cidades nomeadas — Shimizu e Iwata são os limites). Modelar como lista fechada de cidades (`zona_busca_cidades`) é uma simplificação deliberada: cobre as cidades já presentes em `packages/utils/src/cidades-japao.ts` na faixa entre Shimizu e Iwata (aproximadamente Shizuoka/Shimizu, Fuji, Fujieda, Yaizu, Shimada, Makinohara, Kakegawa, Fukuroi, Iwata — todas já existem no dataset). Pedir para Alexandre confirmar a lista exata antes de cadastrar, em vez de assumir todas as cidades "no meio do mapa" — é só texto informativo pro cliente por enquanto, não afeta o preço, então o risco de errar uma cidade é baixo, mas vale confirmar.

Fora de escopo agora: geolocalização real ou cálculo de distância — é uma lista estática editável pelo admin, igual ao resto deste modelo.

---

## 6. Decisões que ficam com o Alexandre, sem bloquear a implementação

Nenhum dos dois pontos abaixo trava o desenvolvimento — o sistema entra no ar com defaults seguros e o Alexandre ajusta depois, direto no admin, sem precisar de deploy nem de rodada de confirmação com o time técnico.

- ~~Se Hamakita oferece AT e MT, ou só AT~~ — **confirmado (2026-09-17): Hamakita oferece os dois**, automático (¥70.000) e manual (¥85.000). A frase original "nos outros menkyou center somente carro automático" se refere a centros *além* de Shizuoka e Hamakita, não a Hamakita em si. `preco_mt_jpy: 85000` do Hamakita fica ativo como já estava no seed da seção 2 — nenhuma mudança de código necessária aqui, só a confirmação.
- **Quais cidades o Hamakita atende.** Fica como campo editável (`cidades_elegiveis` na tela `MenkyouCentersTab`, seção 4), seedado vazio. Enquanto o Alexandre não preencher, o Hamakita simplesmente não aparece automaticamente pra nenhuma cidade (a UENO cadastra o processo manualmente nesse meio-tempo, como já faz hoje) — não impede o resto da funcionalidade de ir ao ar. Quando ele decidir, ele mesmo abre a tela e cadastra a lista, sem precisar de mim.
- **Mostrar todas as opções ou só a mais próxima quando duas áreas se sobrepõem.** Também virou uma configuração editável (`menkyou_estrategia_sobreposicao` em Preferências, seção 4) em vez de uma decisão travada em código. "Mais próxima" é definida pela ordem que o Alexandre organiza os centros no admin (campo `ordem`, já existente), não por cálculo geográfico. Default `'todas'` — que hoje é equivalente a `'mais_proxima'` de qualquer forma, porque ainda não há sobreposição entre as áreas cadastradas. Só passa a fazer diferença de verdade se um dia uma cidade for cadastrada como elegível em mais de um centro ao mesmo tempo — e mesmo aí, o Alexandre troca o comportamento sozinho, sem depender de mim.

---

## 7. Ordem sugerida de implementação

1. `packages/firebase/src/types.ts` — adicionar `MenkyouCenter`, `MenkyouCenterInsert`, campo `transmissao` em `ServicoVariacao`.
2. `packages/firebase/src/queries/menkyou_centers.ts` — CRUD.
3. `packages/firebase/src/pricing.ts` — `resolveMenkyouOptions`.
4. Admin: `MenkyouCentersTab.tsx`, cadastrar os 2 centros com os valores confirmados (Hamakita entra com `cidades_elegiveis` vazio — o Alexandre preenche quando quiser, direto na tela, sem depender de nova rodada de desenvolvimento).
5. Admin: adicionar `menkyou_estrategia_sobreposicao` em `PreferenciasTab.tsx` (default `'todas'`).
6. Admin: marcar `transmissao: 'AT' | 'MT'` nas variações de carro já existentes no catálogo.
7. Mobile: consumir `resolveMenkyouOptions` em `apps/mobile/app/(cliente)/servicos/[id].tsx`, substituindo o preço estático quando aplicável.
8. Testar com cidades reais (Makinohara → ¥60k/¥75k; uma cidade fora da lista, ex. Fuji → só ¥75k manual em Shizuoka; Hamakita só aparece depois que o Alexandre cadastrar as cidades dele).

---

## 8. Critérios de aceite

- [ ] Admin consegue cadastrar/editar um menkyou center com preço AT, preço MT, cidades elegíveis e a flag de "só manual fora da lista", sem precisar de deploy.
- [ ] Admin consegue preencher/alterar a lista de cidades do Hamakita a qualquer momento, e o preço passa a valer pra essas cidades imediatamente (sem deploy).
- [ ] Admin consegue trocar `menkyou_estrategia_sobreposicao` entre "todas" e "mais próxima" em Preferências, sem deploy.
- [ ] Cliente de Makinohara vendo a variação "Carro AT" vê ¥60.000; vendo "Carro MT" vê ¥75.000.
- [ ] Cliente de uma cidade fora da lista de Shizuoka, olhando "Carro AT", **não** vê preço de Shizuoka (só MT é permitido lá) — vê "sob consulta" ou a opção de Hamakita, se aplicável.
- [ ] Alterar um preço no admin reflete no app sem precisar de nova versão do app (é dado, não código).
- [ ] Cliente filipino e do Sri Lanka veem exatamente o mesmo preço que um cliente de qualquer outra nacionalidade na mesma cidade.

---

## 9. Fora de escopo agora

- Geolocalização real / cálculo de distância para a zona de busca — lista estática editável.
- Preço por nacionalidade (a regra atual é explicitamente "sem diferenciação" — não construir esse eixo).
- Exibir o mapa dos menkyou centers no app — só texto e preço.
- Qualquer menkyou center além de Shizuoka e Hamakita — o modelo suporta adicionar mais depois, mas não há dados de outros agora.
