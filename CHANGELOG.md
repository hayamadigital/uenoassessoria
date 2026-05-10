# CHANGELOG — UENO ASSESSORIA

Histórico de alterações e implementações do projeto.
Formato: `[DATA] Área — O que mudou`

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
