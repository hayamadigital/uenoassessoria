# HANDOFF — UENO ASSESSORIA

Documento de contexto para quem pegar o projeto a partir daqui. Última atualização: 2026-08-26.

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

## Deploy das Cloud Functions (separado do deploy do web!)

**Importante**: o push pro GitHub só builda/publica `apps/web` na Vercel. As Cloud Functions (`functions/src/index.ts`), `firestore.rules`, `storage.rules` e `firestore.indexes.json` **não são deployadas automaticamente por nada** — precisam de `firebase deploy` manual:

```
cd functions && npm run build && cd ..
firebase deploy --only functions --project ueno-assessoria-475b9
firebase deploy --only firestore:rules,storage:rules,firestore:indexes --project ueno-assessoria-475b9
```

Em 2026-08-25 as functions estavam desatualizadas há tempo (o projeto esteve no plano Spark, que bloqueia deploy de functions com gatilho de Firestore) — isso provavelmente era a causa raiz do "erro ao criar clientes". **Sempre que mudar algo em `functions/src/index.ts`, `firestore.rules`, `storage.rules` ou `firestore.indexes.json`, lembrar de deployar manualmente** — não basta commitar e dar push.

O projeto precisa estar no **plano Blaze** (pago, mas com cota gratuita generosa) para isso funcionar — ver seção de custos no changelog/histórico da conversa se precisar reavaliar.

## Se um deploy via GitHub falhar com erro de `patch-package`

Já aconteceu do cache de build do Vercel restaurar um `node_modules/expo-image` já patcheado, e a tentativa de reaplicar o patch quebrar o `npm install` inteiro (mesmo no deploy do web, que não usa esse pacote). O `postinstall` já foi ajustado para não falhar mais por causa disso (`patch-package || true`), mas se algum outro patch novo causar o mesmo problema, o jeito mais rápido de resolver é forçar um deploy sem cache:
```
vercel --prod --yes --force --archive=tgz
```
(`--archive=tgz` é necessário porque o repo tem mais de 15000 arquivos para upload direto.)

## Domínios autorizados no Firebase Auth

Qualquer fluxo do client SDK que passe `url`/`continueUrl` (ex: `sendPasswordResetEmail(auth, email, { url })`) só funciona se esse domínio estiver na lista de **Authorized domains** do Firebase Auth (Console → Authentication → Settings, ou via `identitytoolkit.googleapis.com/v2/projects/{project}/config`). Em 2026-08-25 faltava `ueno-assessoria.vercel.app` nessa lista — só havia `localhost`, `.firebaseapp.com` e `.web.app` — o que quebrava o botão "Esqueceu a senha?" com `UNAUTHORIZED_DOMAIN`. Já corrigido, mas **se um domínio próprio for configurado no futuro, ele também precisa ser adicionado aqui** ou qualquer fluxo com `continueUrl` vai quebrar do mesmo jeito.

## Validação Zod — cuidado ao adicionar campos que referenciam documentos do Firestore

Em 2026-08-26 encontramos e corrigimos dois bugs sistêmicos em `packages/utils/src/validators.ts` que travavam a criação/edição de praticamente tudo (processos, agendamentos, pagamentos, contratos, materiais, avaliações):

1. **Nunca use `.uuid()` para um ID do Firestore.** IDs do Firestore não são UUIDs (resquício da migração do Supabase). Use `z.string().min(1, 'mensagem')`.
2. **Campo opcional alimentado por `<select>` nativo precisa aceitar `""` além de `undefined`.** Um `<select>` sem seleção manda `value=""`, mas `z.string().optional()` / `z.enum([...]).optional()` só aceitam `undefined` — isso rejeita o formulário **sem nenhum erro visível na tela** (react-hook-form só bloqueia o submit silenciosamente). Sempre use `.optional().or(z.literal(''))` para esses campos.

Testado ao vivo em 2026-08-26: criação de cliente, processo, agendamento, cobrança, material, aviso, serviço e convite de usuário — todos funcionando após essas correções. Isso provavelmente resolve o "erro ao criar clientes e várias coisas" relatado originalmente, em conjunto com o redeploy das Cloud Functions.

## Pendências conhecidas

- **Fluxo de convite/reset de senha para clientes não é automático**: `createCliente` e `inviteUser` (Cloud Functions em `functions/src/index.ts`) geram um `reset_link` via `admin.auth().generatePasswordResetLink()`, mas isso só gera a URL — **não envia e-mail nem WhatsApp**. O admin precisa copiar/colar manualmente o link mostrado na tela (`UsuariosTab.tsx`) ou o que abre automaticamente ao criar um cliente (`NovoClientePage.tsx`). O campo `whatsapp_url`, que o frontend espera para abrir o WhatsApp automaticamente, **nunca é retornado por nenhuma function** — é código morto.
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

1. Decidir como o convite de cliente/usuário deve chegar de fato (e-mail transacional? WhatsApp de verdade?) e implementar o envio — hoje depende 100% de ação manual do admin
2. Configurar domínio próprio na Vercel para não depender do alias manual
3. Primeiro build/publicação do app mobile via EAS
