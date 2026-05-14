# Módulo Avisos — Design Spec

**Data:** 2026-05-14  
**Status:** Aprovado

---

## Visão Geral

Módulo para publicar comunicados gerais (avisos de logística, promoções, datas comemorativas, geral) visíveis como banners horizontais na tela Início do app mobile cliente. Gerenciado pelo admin via web dashboard.

---

## Modelo de Dados

### Coleção Firestore: `/avisos/{id}`

```ts
interface Aviso {
  id: string
  titulo: string
  descricao: string
  tipo: 'logistica' | 'promocao' | 'data_comemorativa' | 'geral'
  banner_url: string                 // Firebase Storage: avisos/{id}/banner/{filename}
  imagens_carrossel: string[]        // Firebase Storage: avisos/{id}/carrossel/{filename} — até 5
  data_publicacao: Timestamp
  data_encerramento: Timestamp
  broadcast: boolean                 // true = todos os clientes
  tipos_processo: string[]           // usado quando broadcast=false; ex: ['Carteira A', 'Carteira B']
  created_at: Timestamp
  updated_at: Timestamp
  created_by: string                 // uid do admin
}
```

**Status computado (não armazenado):**
- `data_publicacao > now` → `agendado`
- `data_publicacao ≤ now ≤ data_encerramento` → `ativo`
- `data_encerramento < now` → `encerrado`

**Firebase Storage paths:**
- `avisos/{id}/banner/{filename}` — imagem de capa
- `avisos/{id}/carrossel/{filename}` — galeria (máx. 5)

---

## Segmentação

- `broadcast: true` → aviso visível para todos os clientes ativos
- `broadcast: false` → visível apenas para clientes cujo tipo de processo está em `tipos_processo`
- Admin pode marcar broadcast OU selecionar um ou mais tipos de processo (não ambos simultaneamente)
- Validação: se `broadcast=false`, `tipos_processo` deve ter ao menos 1 item

**Tipos de processo disponíveis** (checkboxes no formulário): derivados dos processos cadastrados no sistema — não hardcoded, buscados de `/servicos`.

---

## Web Admin

### Rota e Sidebar
- Rota: `/avisos`, `/avisos/novo`, `/avisos/:id/editar`
- Sidebar: grupo "Conteúdo" → item "Avisos" (ícone `Megaphone` do lucide-react), entre Materiais e FAQ

### `AvisosPage` (`/avisos`)
- PageHeader: título "Avisos", subtítulo com contagem de ativos, botão "+ Novo Aviso"
- Filtros: busca por título (input), select de tipo, select de status
- Tabela colunas:
  | # | Campo | Detalhe |
  |---|-------|---------|
  | 1 | Banner | thumbnail 40×28px |
  | 2 | Título | link para edição |
  | 3 | Tipo | badge colorido |
  | 4 | Segmento | "Todos" ou lista de tipos |
  | 5 | Publicação | data formatada |
  | 6 | Encerramento | data formatada |
  | 7 | Status | badge agendado/ativo/encerrado |
  | 8 | Ações | ✏️ editar, 🗑️ excluir |
- Ordenação padrão: `data_publicacao` desc

**Cores dos badges por tipo:**
| Tipo | Cor |
|------|-----|
| `logistica` | vermelho (`fee2e2 / 991b1b`) |
| `promocao` | roxo (`ede9fe / 5b21b6`) |
| `data_comemorativa` | amarelo (`fef9c3 / 854d0e`) |
| `geral` | cinza (`f1f5f9 / 475569`) |

**Cores dos badges por status:**
| Status | Cor |
|--------|-----|
| `agendado` | cinza |
| `ativo` | verde |
| `encerrado` | vermelho apagado |

### `NovoAvisoPage` / `EditarAvisoPage`
Layout 2 colunas (coluna esquerda maior, coluna direita 300px):

**Coluna esquerda — card "Informações":**
- Título (input, obrigatório)
- Tipo (select: Logística / Promoção / Data Comemorativa / Geral, obrigatório)
- Descrição (textarea, obrigatório)

**Coluna esquerda — card "Imagens":**
- Banner principal (upload único, obrigatório, preview após upload)
- Carrossel de imagens (upload múltiplo, opcional, até 5, ordem = ordem de upload)
- Em edição: exibe previews das imagens já enviadas com botão de remover individualmente

**Coluna direita — card "Publicação":**
- Data de publicação (datepicker, obrigatório)
- Data de encerramento (datepicker, obrigatório, deve ser > data_publicacao)

**Coluna direita — card "Segmentação":**
- Checkbox "Broadcast — todos os clientes"
- Se broadcast desmarcado: checkboxes por tipo de processo (buscados de `/servicos`)
- Validação: ao menos um segmento obrigatório quando broadcast=false

**Validação Zod:**
```ts
z.object({
  titulo: z.string().min(1),
  descricao: z.string().min(1),
  tipo: z.enum(['logistica', 'promocao', 'data_comemorativa', 'geral']),
  banner_url: z.string().url(),
  imagens_carrossel: z.array(z.string().url()).max(5),
  data_publicacao: z.date(),
  data_encerramento: z.date(),
  broadcast: z.boolean(),
  tipos_processo: z.array(z.string()),
}).refine(d => d.data_encerramento > d.data_publicacao, {
  message: 'Data de encerramento deve ser após data de publicação',
  path: ['data_encerramento'],
}).refine(d => d.broadcast || d.tipos_processo.length > 0, {
  message: 'Selecione ao menos um tipo de processo ou marque broadcast',
  path: ['tipos_processo'],
})
```

---

## Firebase Queries (`packages/firebase/src/queries/avisos.ts`)

```ts
// Funções exportadas:
listAvisos(db, filters?: AvisoFilters)     // admin — sem filtro de data
listAvisosAtivos(db, tipoProcesso?: string) // mobile — filtro por data + segmentação client-side
getAviso(db, id)
createAviso(db, input)
updateAviso(db, id, input)
deleteAviso(db, id)
```

**Query mobile (`listAvisosAtivos`):**
```ts
query(collection(db, 'avisos'),
  where('data_publicacao', '<=', Timestamp.now()),
  where('data_encerramento', '>=', Timestamp.now()),
  orderBy('data_publicacao', 'desc')
)
// client-side filter:
// aviso.broadcast === true || aviso.tipos_processo.includes(tipoProcesso)
```

**Índice composto necessário (`firestore.indexes.json`):**
```json
{
  "collectionGroup": "avisos",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "data_publicacao", "order": "DESCENDING" },
    { "fieldPath": "data_encerramento", "order": "ASCENDING" }
  ]
}
```

---

## Firestore Rules

```
match /avisos/{avisoId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.role == 'admin';
}
```

---

## App Mobile Cliente

### `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx` — modificação

Adiciona seção "AVISOS" com `FlatList` horizontal após o header, antes do conteúdo existente:
- Chama `listAvisosAtivos(db, processoAtivo?.nomeServico)` via React Query — `nomeServico` vem do primeiro processo ativo do cliente em `cliente_processos`; se não houver, passa `undefined` (mostra apenas broadcast)
- Se resultado vazio → seção não renderiza (sem espaço em branco)
- Cada item: `AvisoBannerCard` (componente novo)

**`AvisoBannerCard`:**
- Dimensões: 160×80px
- `ImageBackground` com `banner_url`
- Overlay: `LinearGradient` transparente → `rgba(0,0,0,0.55)` na base
- Tag de tipo (badge colorido) + título branco
- `onPress` → navega para `/(cliente)/(hidden)/aviso/[id]`

### `apps/mobile/app/(cliente)/(hidden)/aviso/[id].tsx` — novo

Estrutura da tela (ScrollView):
1. **Área de imagem** — `FlatList` horizontal paginada altura 260px, topo tela cheia (sem safe area top)
   - Páginas: `[banner_url, ...imagens_carrossel]` — sempre ao menos 1 página
   - Botão voltar sobreposto (top-left, safe area)
   - Dots indicator na base da área (oculto se apenas 1 imagem)
2. **Conteúdo** — padding lateral 16px:
   - Badge de tipo (mesma cor do web)
   - Título (bold, 20px)
   - Datas: "📅 14 mai → 20 mai 2026"
   - Descrição (texto corrido, 14px)

**Navegação:** rota `(hidden)` — não aparece em tab bar, acessada via `router.push`.

---

## Arquivos a Criar/Modificar

### Criar
| Arquivo | Descrição |
|---------|-----------|
| `packages/firebase/src/queries/avisos.ts` | CRUD + queries |
| `apps/web/src/pages/avisos/AvisosPage.tsx` | listagem admin |
| `apps/web/src/pages/avisos/NovoAvisoPage.tsx` | formulário criação |
| `apps/web/src/pages/avisos/EditarAvisoPage.tsx` | formulário edição |
| `apps/mobile/app/(cliente)/(hidden)/aviso/[id].tsx` | tela detalhe |

### Modificar
| Arquivo | Mudança |
|---------|---------|
| `apps/web/src/components/layout/Sidebar.tsx` | add item Avisos no grupo Conteúdo |
| `apps/web/src/App.tsx` | add rotas `/avisos`, `/avisos/novo`, `/avisos/:id/editar` |
| `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx` | add FlatList horizontal de banners |
| `firestore.rules` | add regra `/avisos` |
| `firestore.indexes.json` | add índice composto |
