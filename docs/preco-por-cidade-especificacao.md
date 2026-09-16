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

Retorna **todas** as combinações válidas para a cidade do cliente (pode ser mais de um centro — ver seção 6), não uma única resposta. A tela decide o que mostrar.

Uso no fluxo de contratação (`apps/mobile/app/(cliente)/servicos/[id].tsx`): quando a variação selecionada tem `transmissao` preenchido e o cliente já tem `cidade_jp` cadastrada, chamar `resolveMenkyouOptions(cliente.cidade_jp, menkyouCenters)` e filtrar pela transmissão da variação. Se houver exatamente 1 resultado, mostrar o preço resolvido no lugar do `preco_jpy` estático da variação. Se houver mais de um centro elegível, mostrar as opções para o cliente escolher (ex.: "Shizuoka — ¥75.000" vs "Hamakita — ¥85.000"). Se não houver nenhum resultado (cidade não coberta por nenhum centro para essa transmissão), cair no preço estático da variação como fallback e sinalizar "sob consulta".

---

## 4. Admin — tela de edição das regras

Nova aba em Configurações, seguindo o mesmo padrão de `apps/web/src/pages/configuracoes/tabs/LocaisTab.tsx` (que já lista/edita `DestinoFixo` num formato de tabela + dialog de edição, mas é outro domínio — pontos de rota, não menkyou centers; **não reaproveitar o componente**, só o padrão visual):

- `apps/web/src/pages/configuracoes/tabs/MenkyouCentersTab.tsx` — tabela com nome, preço AT, preço MT, quantidade de cidades elegíveis, ativo/inativo.
- Dialog de edição: nome, preço AT, preço MT, lista de cidades elegíveis (multi-select ou textarea de uma cidade por linha — mais simples de editar rápido do que um combobox), toggle "fora da lista, só manual", lista de cidades da zona de busca, campo de observação livre.
- `packages/firebase/src/queries/menkyou_centers.ts` — CRUD padrão (`listMenkyouCenters`, `createMenkyouCenter`, `updateMenkyouCenter`, `toggleMenkyouCenterAtivo`), mesmo formato de `queries/servicos.ts`.

Isso é o que resolve o "regra muda de novo no futuro" — quando Alexandre quiser mudar um preço ou adicionar uma cidade, é editar aqui, sem precisar de deploy.

---

## 5. Zona de busca (transporte)

A regra "busca de Shimizu até Iwata" é geográfica (um trecho contínuo do litoral, não só essas duas cidades nomeadas — Shimizu e Iwata são os limites). Modelar como lista fechada de cidades (`zona_busca_cidades`) é uma simplificação deliberada: cobre as cidades já presentes em `packages/utils/src/cidades-japao.ts` na faixa entre Shimizu e Iwata (aproximadamente Shizuoka/Shimizu, Fuji, Fujieda, Yaizu, Shimada, Makinohara, Kakegawa, Fukuroi, Iwata — todas já existem no dataset). Pedir para Alexandre confirmar a lista exata antes de cadastrar, em vez de assumir todas as cidades "no meio do mapa" — é só texto informativo pro cliente por enquanto, não afeta o preço, então o risco de errar uma cidade é baixo, mas vale confirmar.

Fora de escopo agora: geolocalização real ou cálculo de distância — é uma lista estática editável pelo admin, igual ao resto deste modelo.

---

## 6. A confirmar com Alexandre antes de implementar

- **Quais cidades o Hamakita atende.** A mensagem original não especifica — só diz "estamos atendendo também em Hamakita" com os preços. Sem essa lista, `cidades_elegiveis` do Hamakita fica vazio e ele não aparece pra nenhum cliente automaticamente; a UENO ficaria dependendo de cadastro manual do processo por enquanto.
- **Se Hamakita também é "só manual fora da lista" como Shizuoka, ou se atende irrestrito.** O texto de Alexandre diz "nos outros menkyou center somente carro automático" — o que sugere que Hamakita talvez só ofereça **AT**, não os dois. Mas ele também deu um preço de MT (¥85.000) pra Hamakita, o que contradiz essa leitura. Preciso desse esclarecimento antes de fixar `preco_mt_jpy` do Hamakita como ativo — ver se ele quis dizer "os *outros* centros que não são Shizuoka nem Hamakita" (ou seja, só automático em centros menores/futuros, com Hamakita sendo uma segunda exceção com os dois tipos).
- **Se um cliente fora da zona de Shizuoka mas coberto por Hamakita deve ver as duas opções, ou só a mais barata/mais perto.** O modelo acima (seção 3) mostra todas as opções válidas por padrão — confirmar se é isso que a UENO quer ou se prefere esconder a opção mais cara.

---

## 7. Ordem sugerida de implementação

1. `packages/firebase/src/types.ts` — adicionar `MenkyouCenter`, `MenkyouCenterInsert`, campo `transmissao` em `ServicoVariacao`.
2. `packages/firebase/src/queries/menkyou_centers.ts` — CRUD.
3. `packages/firebase/src/pricing.ts` — `resolveMenkyouOptions`.
4. Admin: `MenkyouCentersTab.tsx`, cadastrar os 2 centros com os valores confirmados (Hamakita com `cidades_elegiveis` vazio até a resposta da seção 6).
5. Admin: marcar `transmissao: 'AT' | 'MT'` nas variações de carro já existentes no catálogo.
6. Mobile: consumir `resolveMenkyouOptions` em `apps/mobile/app/(cliente)/servicos/[id].tsx`, substituindo o preço estático quando aplicável.
7. Testar com cidades reais (Makinohara → ¥60k/¥75k; uma cidade fora da lista, ex. Fuji → só ¥75k manual em Shizuoka, mais o que resultar de Hamakita quando definido).

---

## 8. Critérios de aceite

- [ ] Admin consegue cadastrar/editar um menkyou center com preço AT, preço MT, cidades elegíveis e a flag de "só manual fora da lista", sem precisar de deploy.
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
