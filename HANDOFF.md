# HANDOFF — UENO ASSESSORIA

Documento de contexto para quem pegar o projeto a partir daqui. Última atualização: 2026-08-25.

---

## Stack e infraestrutura

- **Monorepo**: Turborepo, `apps/web` (Vite + React), `apps/mobile` (Expo/React Native), `packages/*` compartilhados
- **Backend**: Firebase (Firestore + Cloud Functions + Auth + Storage), projeto `ueno-assessoria-475b9`
- **Deploy web**: Vercel, projeto `hayama-digital-s-projects/ueno-assessoria` — **este é o único projeto Vercel válido** (existe um projeto antigo chamado `web` no mesmo time, desativado/sem git conectado; ignorar)
- **App mobile**: Expo, projeto EAS `@hayama-digital/ueno-assessoria` — **ainda sem nenhum build publicado** (nunca rodou `eas build`)

## Fluxo de deploy (web)

1. Commit + `git push origin main`
2. Vercel builda automaticamente (webhook do GitHub já conectado)
3. URL de produção: **`https://ueno-assessoria.vercel.app`** (com hífen — é o domínio automático baseado no nome do projeto e já segue sozinho o deploy mais recente, sem precisar de nenhum passo manual). Não usar `uenoassessoria.vercel.app` (sem hífen) — é um alias avulso que sobrou de configuração anterior e não é a URL de referência.
4. Não existe domínio próprio (`.com.br` ou similar) configurado ainda.

## Estado do repositório (importante)

Em 2026-08-25 o branch `main` no GitHub estava **~90 arquivos atrás** do que já rodava localmente — uma refatoração grande de schema (serviços/variações, etapas de processo, financeiro, materiais/questões) nunca tinha sido commitada. Isso foi sincronizado nos commits `7fca933`, `902fc44`, `b3c7bf4`, `9fde56e`. **Antes de assumir que algo "nunca foi testado", verifique o histórico recente** — grande parte do trabalho existia só localmente até agora.

## Pendências conhecidas

- **Fluxo de convite/reset de senha para clientes não é automático**: `createCliente` e `inviteUser` (Cloud Functions em `functions/src/index.ts`) geram um `reset_link` via `admin.auth().generatePasswordResetLink()`, mas isso só gera a URL — **não envia e-mail nem WhatsApp**. O admin precisa copiar/colar manualmente o link mostrado na tela (`UsuariosTab.tsx`) ou o que abre automaticamente ao criar um cliente (`NovoClientePage.tsx`). O campo `whatsapp_url`, que o frontend espera para abrir o WhatsApp automaticamente, **nunca é retornado por nenhuma function** — é código morto.
- **Teste ponta a ponta da criação de clientes ainda não foi feito** — o motivo original desta sessão foi um relato de que "criar clientes dá erro". A causa mais provável identificada foi o `main` desatualizado (builds quebrados / funções desalinhadas com o frontend), já corrigido. Falta validar na prática com uma conta admin.
- **Push para o GitHub requer a conta `hayamadigital`** (não `natielly-narumi`) — só ela tem permissão de push no repo `hayamadigital/uenoassessoria`. Se `git push` der 403, rodar:
  ```
  gh auth switch --hostname github.com --user hayamadigital
  gh auth setup-git
  ```

## Contas / acessos usados nesta sessão

- Vercel: `hayamadigital-5045` (time `hayama-digital-s-projects`)
- Firebase: `hayamadigital@gmail.com`, projeto `ueno-assessoria-475b9`
- GitHub: conta `hayamadigital` para push (ver acima)

## Próximos passos sugeridos

1. Validar login + criação de cliente ponta a ponta com uma conta admin real
2. Decidir como o convite de cliente/usuário deve chegar de fato (e-mail transacional? WhatsApp de verdade?) e implementar o envio — hoje depende 100% de ação manual do admin
3. Configurar domínio próprio na Vercel para não depender do alias manual
4. Primeiro build/publicação do app mobile via EAS
