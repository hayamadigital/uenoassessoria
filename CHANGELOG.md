# CHANGELOG — UENO ASSESSORIA

Histórico de alterações e implementações do projeto.
Formato: `[DATA] Área — O que mudou`

---

## [2026-08-25] — Deploy Vercel via GitHub + Recuperação de Senha + Sincronização do main

### Infraestrutura / Deploy
- Projeto Vercel oficial definido: `hayama-digital-s-projects/ueno-assessoria`, conectado ao GitHub (`hayamadigital/uenoassessoria`, branch `main`)
- Fluxo de deploy passou a ser **git push → build automático na Vercel** (antes não havia nenhum deploy publicado)
- `vercel.json` — passou a ser versionado (nunca tinha sido commitado) e ganhou `rewrites` para SPA (corrige 404 em rotas acessadas diretamente, ex: refresh em `/clientes/novo`)
- Projeto antigo `hayama-digital-s-projects/web` — Git desconectado e aliases removidos (mantido como referência histórica, mas sem deploy nem domínio ativo)
- `main` estava ~90 arquivos atrás do código local funcional (refatoração de schema nunca commitada) — sincronizado em 4 commits (`7fca933`, `902fc44`, `b3c7bf4`, `9fde56e`)

### Web — Auth
- `apps/web/src/pages/auth/ForgotPasswordPage.tsx` (novo) — página dedicada de recuperação de senha em `/esqueci-senha`, com campo de email e botão de envio próprios
- `apps/web/src/pages/auth/LoginPage.tsx` — link "Esqueceu a senha?" agora navega para a página dedicada em vez de resetar inline na tela de login
- `packages/utils/src/validators.ts` — `forgotPasswordSchema` adicionado

### Infraestrutura / Deploy (continuação)
- `package.json` — `postinstall` de `patch-package` passou a ser tolerante a falha (`|| true`). Causa: o cache de build do Vercel restaurou um `node_modules/expo-image` já com o patch aplicado, e a reaplicação quebrava o `npm install` inteiro (bloqueando o deploy do web, que nem usa `expo-image`). Resolvido com `vercel --force` (descarta cache) para o build imediato + esse fix para não repetir.

### Firebase Auth
- Domínio `ueno-assessoria.vercel.app` estava **ausente da lista de domínios autorizados** do Firebase Auth (só tinha `localhost`, `.firebaseapp.com` e `.web.app`) — isso quebrava qualquer fluxo que passasse `continueUrl`/`url` apontando para o domínio de produção com `UNAUTHORIZED_DOMAIN`. Era o caso do botão "Esqueceu a senha?" (antigo, inline na tela de login, e o novo em `/esqueci-senha`). Corrigido adicionando o domínio via API do Identity Toolkit.

### Pendências identificadas nesta sessão
- Fluxo de convite de cliente/usuário (`createCliente`/`inviteUser`) gera `reset_link` mas **não envia automaticamente** por e-mail/WhatsApp — depende do admin copiar/colar manualmente. Campo `whatsapp_url` esperado pelo frontend nunca é retornado pelo backend (código morto)
- `createCliente`/`inviteUser` chamam `generatePasswordResetLink` sem `continueUrl` (usam o domínio padrão `.firebaseapp.com`, que já está autorizado), então **não** são afetados pelo bug de `UNAUTHORIZED_DOMAIN` acima — mas qualquer nova tela que passe `url`/`continueUrl` apontando para um domínio de produção precisa lembrar de autorizá-lo antes em Firebase Auth (Authentication → Settings → Authorized domains, ou via API do Identity Toolkit)
- Teste ponta a ponta do fluxo de criação de clientes ainda pendente (aguardando credenciais de admin)
- Domínio próprio (`.com.br` ou similar) ainda não configurado — só `uenoassessoria.vercel.app`, cujo alias precisa ser reatribuído manualmente após cada deploy até um domínio real ser configurado

---

## [2026-05-19] — Mobile Admin (Modal de Usuários)

### Mobile (admin)
- `apps/mobile/app/(admin)/(hidden)/configuracoes/usuarios.tsx` — modal de convidar usuário ajustada para subir com o teclado e manter os campos visíveis

---

## [2026-05-09] — Mobile Admin + Web Materiais + Firebase Core

### Mobile (admin)
- `apps/mobile/app/(admin)/(tabs)/clientes/[id].tsx` — tela de detalhe do cliente (admin), implementada/refatorada
- `apps/mobile/app/(admin)/(tabs)/clientes/relacionados.tsx` — tela de clientes relacionados
- `apps/mobile/app/(admin)/(tabs)/modulos/index.tsx` — index de módulos admin
- `apps/mobile/app/(admin)/(tabs)/modulos/materias/index.tsx` — listagem de matérias
- `apps/mobile/app/(admin)/(tabs)/modulos/materias/[id].tsx` — detalhe de matéria

### Mobile (cliente)
- `apps/mobile/app/(cliente)/(tabs)/simulados/index.tsx` — tela de simulados para cliente

### Web (dashboard)
- `apps/web/src/pages/materiais/MateriaisPage.tsx` — página de materiais (web dashboard)

### Firebase / Packages
- `packages/firebase/src/types.ts` — atualização de tipos Firestore
- `packages/firebase/src/queries/materiais.ts` — queries de materiais
- `packages/firebase/src/queries/questoes.ts` — queries de questões
- `packages/utils/src/validators.ts` — validators Zod atualizados

---

## [2026-05-08] — Web Dashboard + Mobile Admin (Módulos e Layouts)

### Web (dashboard)
- `apps/web/src/pages/materiais/QuestoesPage.tsx` — página de questões
- `apps/web/src/pages/materiais/MaterialDetailPage.tsx` — detalhe de material
- `apps/web/src/pages/servicos/ServicosDetailPage.tsx` — detalhe de serviços
- `apps/web/src/pages/faq/FaqPage.tsx` — página de FAQ
- `apps/web/src/routes/index.tsx` — rotas atualizadas
- `apps/web/src/components/layout/Sidebar.tsx` — sidebar atualizada

### Mobile (admin)
- `apps/mobile/app/(admin)/(tabs)/inicio/index.tsx` — tela inicial admin
- `apps/mobile/app/(admin)/(tabs)/inicio/notificacoes/index.tsx` — notificações admin
- `apps/mobile/app/(admin)/(tabs)/clientes/novo.tsx` — formulário de novo cliente
- `apps/mobile/app/(admin)/(tabs)/clientes/index.tsx` — listagem de clientes
- `apps/mobile/app/(admin)/(tabs)/modulos/avaliacoes/index.tsx` — avaliações
- `apps/mobile/app/(admin)/(tabs)/modulos/catalogo/index.tsx` — catálogo
- `apps/mobile/app/(admin)/(tabs)/modulos/documentos/index.tsx` — documentos
- `apps/mobile/app/(admin)/(tabs)/modulos/simulados/index.tsx` — simulados
- `apps/mobile/app/(admin)/(tabs)/modulos/faq/index.tsx` — FAQ

### Layouts
- `apps/mobile/app/_layout.tsx` — root layout mobile
- `apps/mobile/app/(admin)/_layout.tsx` — layout admin
- `apps/mobile/app/(admin)/(tabs)/_layout.tsx` — tabs admin
- `apps/mobile/app/(admin)/(tabs)/clientes/_layout.tsx` — stack clientes
- `apps/mobile/app/(admin)/(tabs)/modulos/_layout.tsx` — stack módulos
- `apps/mobile/app/(admin)/(tabs)/inicio/_layout.tsx` — stack início
- `apps/mobile/app/(cliente)/_layout.tsx` — layout cliente
- `apps/mobile/app/(cliente)/(tabs)/_layout.tsx` — tabs cliente

### Firebase
- `firestore.indexes.json` — índices compostos atualizados
- `packages/firebase/src/queries/faq.ts` — queries de FAQ

---

## [2026-05-07] — Mobile Cliente + Auth + Cloud Functions

### Mobile (auth)
- `apps/mobile/app/(auth)/login.tsx` — tela de login
- `apps/mobile/app/(auth)/register.tsx` — tela de cadastro/convite
- `apps/mobile/app/(auth)/onboarding.tsx` — onboarding

### Mobile (cliente)
- `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx` — home do cliente
- `apps/mobile/app/(cliente)/(tabs)/processos/index.tsx` — processos do cliente
- `apps/mobile/app/(cliente)/(tabs)/catalogos/index.tsx` — catálogo de materiais
- `apps/mobile/app/(cliente)/(tabs)/perfil/index.tsx` — perfil do cliente

### Mobile (admin)
- `apps/mobile/app/(admin)/(tabs)/agenda/index.tsx` — agenda admin

### Firebase / Packages
- `functions/src/index.ts` — Cloud Functions (createCliente, inviteUser, generateContractPdf, sendNotification, otimizarRota, setRoleClaim)
- `packages/firebase/src/queries/perfis.ts` — queries de perfis

---

## [2026-04-28] — MIGRAÇÃO SUPABASE → FIREBASE (CONCLUÍDA)

- `packages/supabase` — REMOVIDO
- `supabase/` — REMOVIDO (migrations, config, edge functions)
- `packages/firebase` — criado com client factory, tipos, 21 módulos de queries, storage helpers, auth helpers
- `functions/` — Cloud Functions Node.js iniciais
- `firestore.rules` — Security Rules equivalentes ao RLS do Supabase
- `storage.rules` — Regras para 6 pastas no bucket
- `firestore.indexes.json` — 17 índices compostos
- `firebase.json` — configuração completa com emuladores
- `apps/web` — todos os imports migrados para `@ueno/firebase`
- `apps/mobile` — `lib/firebase.ts` com EXPO_PUBLIC_FIREBASE_* vars
- Firebase MCP adicionado; Supabase MCP removido

---

<!-- INSTRUÇÕES PARA ATUALIZAÇÃO MANUAL:
Ao finalizar uma feature ou correção, adicione uma entrada no topo neste formato:

## [YYYY-MM-DD] — Título curto

### Área (web/mobile/firebase/packages)
- `caminho/do/arquivo.tsx` — o que mudou
-->
