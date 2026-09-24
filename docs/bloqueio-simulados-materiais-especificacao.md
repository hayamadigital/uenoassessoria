# Especificação — Bloqueio Total de Simulados e Materiais (temporário)

> Atualização de 16/09/2026: a proposta de liberação global para todos foi substituída por [Acesso a recursos por cliente](acesso-por-cliente-especificacao.md). Este documento permanece como histórico do bloqueio temporário; não implementar os dois modelos como fontes paralelas de autorização.
>
> Atualização de 24/09/2026: decisão revertida. O acesso por cliente foi desfeito e Estudos/Catálogo voltaram a ficar liberados para todos os clientes autenticados, sem bloqueio nenhum (nem o "bloqueio total" descrito abaixo, nem a concessão individual da spec acima). Ambos os documentos ficam só como histórico.

Cobre o item 19 do `docs/raio-x-especificacao.md`.

Decisão do Alexandre: "A princípio vamos bloquear até fazermos todos os testes, e depois decidimos quem pode ou não acessar esses materiais." Ou seja: bloquear **todo mundo**, independente do status do processo, até a UENO decidir manualmente os critérios reais mais adiante.

Mudança pequena, mas com um achado importante na investigação — ver seção 2.

---

## 1. O que existe hoje (bloqueio só na UI, cliente)

`canViewPrivateMaterials = (processos ?? []).some((p) => p.status === 'ativo' || p.status === 'analise')`, calculado em dois lugares:
- `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx:100`
- `apps/mobile/app/(cliente)/(tabs)/simulados/index.tsx:284`

Esse flag é usado só para decidir **o que aparece nas listas** (`listMateriais(db, undefined, !canViewPrivateMaterials)`, que filtra por `is_public == true` quando `onlyPublic` é `true`).

## 2. Achado: o bloqueio de hoje não é real — é só a lista que filtra

A tela de detalhe de um material, `apps/mobile/app/(cliente)/materiais/index.tsx`, busca o material direto por id via `getMaterial(db, id)` — **sem nenhuma checagem** de `is_public` nem de status do processo. E, mais importante, o `firestore.rules` atual permite:

```
// firestore.rules:262-270
match /materiais/{id} {
  allow read: if isSignedIn() || resource.data.is_public == true;
  ...
}
// firestore.rules:288-294
match /simulado_config/{materialId} {
  allow read: if isSignedIn();     // sem checagem de is_public nem de status
  match /questoes/{qId} {
    allow read: if isSignedIn();   // idem
  }
}
match /questoes/{id} {
  allow read: if isSignedIn();     // idem
}
```

Ou seja: **qualquer cliente autenticado já consegue ler qualquer material ou questão de simulado direto pelo SDK do Firestore hoje**, independente do que a lista mostra na tela — a regra `isSignedIn()` sozinha já libera. O filtro client-side (`canViewPrivateMaterials`) é só uma conveniência de UI, não uma proteção. Para o "bloqueio total" do Alexandre valer de verdade, a regra precisa mudar também, não só a tela.

## 3. Mudança proposta

### 3.1 Config global

Adicionar `simulados_liberado: boolean` (padrão `false`) em `PublicAppConfig`:

```ts
// packages/firebase/src/types.ts
export interface PublicAppConfig {
  id: string
  support_whatsapp: string | null
  home_material_category_id: string | null
  simulado_passing_percentage: number
  simulados_liberado: boolean   // novo — padrão false (bloqueado)
  created_at?: string
  updated_at?: string
}
```

Atualizar `packages/firebase/src/queries/public-config.ts` (`toPublicConfig`, `getPublicAppConfig`, `updatePublicAppConfig`, `subscribePublicAppConfig`) para ler/gravar o campo novo, com fallback `false` quando ausente (documentos existentes de `app_config/public` não têm esse campo ainda).

### 3.2 Firestore rules (a parte que realmente bloqueia)

```
match /materiais/{id} {
  allow read: if resource.data.is_public == true
    || (isSignedIn() && get(/databases/$(database)/documents/app_config/public).data.simulados_liberado == true);
  allow write: if isAdmin();

  match /cards/{cardId} {
    allow read: if get(/databases/$(database)/documents/materiais/$(id)).data.is_public == true
      || (isSignedIn() && get(/databases/$(database)/documents/app_config/public).data.simulados_liberado == true);
    allow write: if isAdmin();
  }
}

match /simulado_config/{materialId} {
  allow read: if isSignedIn() && get(/databases/$(database)/documents/app_config/public).data.simulados_liberado == true;
  allow write: if isAdmin();

  match /questoes/{qId} {
    allow read: if isSignedIn() && get(/databases/$(database)/documents/app_config/public).data.simulados_liberado == true;
    allow write: if isAdmin();
  }
}

match /questoes/{id} {
  allow read: if isSignedIn() && get(/databases/$(database)/documents/app_config/public).data.simulados_liberado == true;
  allow write: if isAdmin();
}
```

`app_config/public` já permite `allow get: if id == 'public' || isAdmin()` (`firestore.rules:273`), então o `get()` cruzado funciona sem mudança adicional nessa parte.

Nota: isso bloqueia **simulados por completo** (inclusive `questoes`, usado por outras telas além de materiais tipo "simulado" — conferir se `questoes` é usado só por simulados antes de aplicar, para não quebrar nada fora de escopo). Materiais com `is_public == true` continuam liberados para todo mundo, como já é hoje — isso não muda.

### 3.3 Client-side (mantém a experiência atual, só troca a condição)

Em `inicio/index.tsx:100` e `simulados/index.tsx:284`, trocar:

```ts
// antes
const canViewPrivateMaterials = (processos ?? []).some((p) => p.status === 'ativo' || p.status === 'analise')

// depois
const canViewPrivateMaterials = publicConfig?.simulados_liberado === true
```

`publicConfig` já é buscado nas duas telas (`getPublicAppConfig`), então não é preciso adicionar nenhuma query nova — só trocar a condição de origem.

### 3.4 Admin

Adicionar um toggle "Liberar simulados e materiais para clientes" em `apps/web/src/pages/configuracoes/tabs/PreferenciasTab.tsx` (mesma tela que já edita `home_material_category_id` e `simulado_passing_percentage`), ligado a `updatePublicAppConfig`. Padrão: desligado.

---

## 4. Ordem sugerida de implementação

1. Campo novo em `PublicAppConfig` + queries (`public-config.ts`).
2. `firestore.rules` (é a parte que efetivamente bloqueia — fazer antes de mexer na UI, para o bloqueio já valer mesmo se alguém acessar direto).
3. Toggle no admin (`PreferenciasTab.tsx`).
4. Trocar a condição no client (`inicio/index.tsx`, `simulados/index.tsx`).
5. Deploy das rules (`firebase deploy --only firestore:rules`, conforme `docs/firebase_functions_deploy` — não sobe sozinho com `git push`).

---

## 5. Critérios de aceite

- [ ] Com o toggle desligado (padrão após o deploy), nenhum cliente consegue ler `materiais` privados, `simulado_config` ou `questoes` — nem pela lista do app, nem tentando acessar direto pelo Firestore SDK (testar simulando uma leitura direta, não só pela UI).
- [ ] Materiais com `is_public: true` continuam acessíveis normalmente para qualquer cliente logado, com o toggle desligado.
- [ ] Ligando o toggle no admin, o acesso volta a funcionar para todos os clientes autenticados (não reintroduz a checagem por status de processo — essa decisão fica para depois, ver seção 6).
- [ ] Toggle é editável em `Configurações → Preferências` por um usuário admin, sem precisar de deploy.

---

## 6. Fora de escopo agora

- Critério real de liberação (por status de processo, por etapa, por cliente específico) — fica para quando a UENO decidir depois de terminar os testes; este spec só entrega o flag on/off global.
- Revisar se a coleção `questoes` é usada em algum outro contexto fora de simulados (checar antes de aplicar a regra, para não bloquear algo que não devia).
- Notificar clientes existentes sobre a mudança de acesso.
