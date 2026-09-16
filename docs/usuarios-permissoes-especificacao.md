# Especificação — Papel "Atendimento" e Permissões Granulares

Referência: `docs/raio-x-especificacao.md`, item 28 (🔴 precisa implementar).

Contexto: hoje o sistema só reconhece dois papéis de equipe — `admin` (vê tudo) e `instrutor` (só o necessário para dar aula, e só no mobile). A especificação pede um terceiro papel, **Atendimento**, que vê clientes/cadastro/documentos/etapas/agenda/compromissos/notificações, mas cujo acesso a financeiro é **opcional**, decidido pelo admin.

---

## 1. O que já existe e o que falta

| Peça | Status |
|---|---|
| `UserRole` = `'admin' \| 'instrutor' \| 'cliente'` | 🔴 falta o valor `'atendimento'` (`packages/firebase/src/types.ts:6`) |
| Custom claim `role` no Firebase Auth, usado nas regras do Firestore | ✅ já existe o mecanismo (`setCustomUserClaims`, `functions/src/index.ts:208,251,341`) — só falta o valor novo passar pela mesma validação |
| `firestore.rules` — `isAdmin()`/`isInstrutor()`/`isCliente()` | ✅ padrão já estabelecido (`firestore.rules:17-29`) — falta `isAtendimento()` e regras por coleção considerando esse papel |
| Tela de convite de usuário (`UsuariosTab.tsx`) | ✅ já existe, mas só oferece Admin/Instrutor no seletor (`UsuariosTab.tsx:396-399`) e no schema `inviteUserSchema` |
| Controle de "admin decide se atendimento vê financeiro" | 🔴 não existe nenhum mecanismo de flag granular hoje |
| Acesso ao painel web restrito a `admin` | ✅ hoje é assim (`AppShell.tsx` usa `useRequireAuth(['admin'])`, segundo levantamento anterior) — precisa passar a aceitar `atendimento` também, com menu reduzido |

---

## 2. Modelo de permissões

### 2.1 `UserRole` (types.ts)

```ts
export type UserRole = 'admin' | 'atendimento' | 'instrutor' | 'cliente'
```

### 2.2 Flag de visibilidade financeira

A forma mais simples (evita uma tabela de permissões genérica que ninguém vai manter) é um campo booleano direto no perfil do usuário, editável só pelo admin:

```ts
// Profile (packages/firebase/src/types.ts)
export interface Profile {
  // ...campos existentes
  pode_ver_financeiro: boolean | null  // só relevante quando role === 'atendimento'; admin sempre true, instrutor/cliente sempre false
}
```

Por padrão `false` ao criar um usuário de Atendimento (acesso explícito, não implícito) — o admin liga depois se quiser, na própria tela de usuários (toggle na linha do usuário, mesmo padrão do botão "Ativar/Desativar" que já existe em `UsuariosTab.tsx:269-284`).

### 2.3 `firestore.rules`

Novo helper:

```
function isAtendimento() {
  return isSignedIn() && request.auth.token.role == 'atendimento';
}

function podeVerFinanceiro() {
  return isAdmin()
    || (isAtendimento()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.pode_ver_financeiro == true);
}
```

Coleções a ajustar (adicionar `isAtendimento()` com o mesmo nível de acesso do que a especificação pede):

| Coleção | Hoje | Com Atendimento |
|---|---|---|
| `clientes` (`firestore.rules:109-120`) | admin / instrutor designado / próprio cliente | + `isAtendimento()` em `allow read` e `allow update` com os mesmos campos que admin edita (dados, documentos, etapas) — **não** inclui campos financeiros diretamente na doc de cliente, então não precisa de checagem extra aqui |
| `agendamentos` (`firestore.rules:188-`) | admin / instrutor dono / cliente dono | + `isAtendimento()` em `allow read`/`allow create`/`allow update` (agenda e compromissos fazem parte do escopo de Atendimento) |
| `pagamentos` (`firestore.rules:224-228`) | admin / cliente dono (read); só admin (write) | `allow read: if isAdmin() || podeVerFinanceiro() || (cliente dono)`; `allow write` continua só admin — Atendimento nunca edita financeiro, só visualiza quando liberado |
| `notificacoes` (`firestore.rules:383-391`) | admin / dono | + `isAtendimento()` em `allow create` (pode disparar notificações, conforme escopo do item 27) |
| `processo_etapas` (não mostrado no trecho lido, seguir o mesmo padrão de `clientes`) | admin / instrutor / cliente dono | + `isAtendimento()` leitura e escrita, já que "etapas" está no escopo dele |
| `documentos`/`cliente_documentos` | seguir padrão de `clientes` | + `isAtendimento()` leitura e escrita |
| `users/{uid}` (`firestore.rules:99-106`) | admin only para create/delete | manter — Atendimento não gerencia outros usuários |

### 2.4 Cloud Functions

- `inviteUser` (`functions/src/index.ts:323-346`): aceitar `'atendimento'` na validação de role (linha 329-330) e no tipo do parâmetro (linha 326).
- `updateUserRole`/trecho de `functions/src/index.ts:199-209`: mesma validação de enum de roles atualizada.
- Nova callable `setPodeVerFinanceiro({ uid, valor })`, restrita a `isAdmin()`, que atualiza `users/{uid}.pode_ver_financeiro` — separada de `setUserActive` para manter cada function com uma responsabilidade só.

---

## 3. Mudanças no frontend web

- `UsuariosTab.tsx`: seletor de perfil passa a ter 3 opções (Admin, Atendimento, Instrutor) em vez de 2 (linha 396-399 e `roleLabels`/`roleFilters`, linhas 36-44). Quando o perfil listado for `atendimento`, mostrar um toggle extra "Pode ver financeiro" na linha da tabela (reaproveita o padrão de botão de ação já usado para Ativar/Desativar).
- `AppShell.tsx`/roteamento: `useRequireAuth(['admin'])` passa a ser `useRequireAuth(['admin', 'atendimento'])` nas rotas que fazem parte do escopo de Atendimento (Clientes, Documentos, Agenda/Agendamentos, Notificações/Avisos). Rotas fora do escopo (Financeiro, Configurações de usuários, Relatórios) continuam `['admin']`, exceto Financeiro que passa a checar `pode_ver_financeiro` no próprio componente (esconder o menu lateral do item quando não tiver acesso, e bloquear a rota diretamente também, não só esconder o link).
- `Sidebar.tsx`: itens de menu renderizados condicionalmente por role — Atendimento não vê "Financeiro" no menu a menos que `pode_ver_financeiro === true`, e nunca vê "Configurações → Usuários".

---

## 4. Ordem sugerida de implementação

1. `UserRole` + `pode_ver_financeiro` no schema (`types.ts`).
2. Atualizar `inviteUser` e a função de troca de role nas Cloud Functions para aceitar `'atendimento'`.
3. Nova callable `setPodeVerFinanceiro`.
4. `firestore.rules`: `isAtendimento()`, `podeVerFinanceiro()`, e os ajustes por coleção da tabela da seção 2.3 — testar cada coleção isoladamente com o emulador (`firebase.emulators.json` já existe no repo) antes de subir.
5. `UsuariosTab.tsx`: terceiro papel no seletor + toggle de financeiro.
6. `AppShell.tsx`/`Sidebar.tsx`: liberar rotas e itens de menu para Atendimento, com Financeiro condicionado à flag.

---

## 5. Critérios de aceite

- [ ] Convidar um usuário como "Atendimento" cria a conta com `role: 'atendimento'` e `pode_ver_financeiro: false` por padrão.
- [ ] Usuário Atendimento consegue logar no web e ver Clientes, Documentos, Agenda e Notificações, mas não vê "Financeiro" nem "Configurações → Usuários" no menu.
- [ ] Tentar acessar `/financeiro` diretamente pela URL, sem a flag ligada, é bloqueado (não só escondido do menu).
- [ ] Admin liga "Pode ver financeiro" para um usuário Atendimento específico → esse usuário passa a ver `/financeiro` (leitura, sem poder editar/registrar cobranças).
- [ ] Usuário Instrutor e Cliente continuam com o comportamento de hoje, sem nenhuma regressão.
- [ ] Regras do Firestore testadas no emulador para as 4 combinações relevantes (admin, atendimento sem flag, atendimento com flag, instrutor) nas coleções da tabela da seção 2.3.

---

## 6. Fora de escopo agora

- Sistema de permissões totalmente granular por ação (ex. "pode editar mas não excluir") — o pedido do Alexandre foi especificamente sobre visibilidade de financeiro, não uma reforma completa de ACL.
- Papel Atendimento no app mobile — por enquanto o mobile continua com as áreas `(admin)`, `(cliente)`, `(instrutor)`; Atendimento usa o web, como o próprio time de escritório já faz hoje.
- Múltiplas flags de permissão por módulo (a única flag desta primeira versão é financeiro, que foi o caso citado explicitamente na especificação).
