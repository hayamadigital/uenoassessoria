# HANDOFF — UENO ASSESSORIA

Documento de contexto para quem pegar o projeto a partir daqui. Última atualização: 2026-09-16.

## Cadastro rápido de evento (mobile + web) — 2026-09-16

Novo fluxo de captação de leads pro evento em ~4 dias: formulário rápido (nome, nascimento, cidade com autocomplete local, interesse em serviços — agora **múltipla escolha** —, como conheceu a UENO, e-mail) que cria a conta e abre o WhatsApp da UENO com a mensagem pronta. Especificação completa em `docs/cadastro-evento-especificacao.md`; lista de arquivos em `CHANGELOG.md` na entrada de mesma data. **Trabalho paralelo à publicação na App Store abaixo — workstreams diferentes, mesmo dia.**

**Mudança de contrato importante em `selfRegister` (Cloud Function) — já publicada em produção (2026-09-16, deploy manual `firebase deploy --only functions`)**: deixou de exigir login prévio e senha. Agora é **pública** (sem `request.auth`, protegida só por rate-limit por IP + App Check) e cria a conta inteira no servidor via Admin SDK, sem senha nenhuma. O cliente dispara `sendPasswordResetEmail(auth, email)` logo depois — esse e-mail é quem deixa o visitante definir a senha e, de quebra, prova que o e-mail é dele. As 15 functions do projeto foram redeployadas juntas (mesmo deploy), todas confirmadas `Successful update operation`. **Ainda não testado com uma chamada real contra produção** — só validado exaustivamente no emulador local antes do deploy; recomendado um teste de fumaça (1 cadastro real) antes do evento.

Outras mudanças de dado: `Cliente.interesse_categoria`/`interesse_subopcao` (singular) viraram `interesse_categorias`/`interesse_subopcoes` (arrays — a function já grava nesse formato em produção; nenhum documento real foi criado ainda, já que nenhum cliente consumidor está publicado). `app_config/public.support_whatsapp` **já foi atualizado em produção** para `+81 80 3688-1507` (mesmo número, só reformatado — usei o `service-account.json` local direto, não a tela de Configurações).

**Menu do cliente reduzido**: abas "Simulados" e "Serviços" escondidas (`href: null` em `(cliente)/(tabs)/_layout.tsx` — código continua existindo, só não aparece na barra). Aba **FAQ** nova, reaproveitando a tela existente via re-export. Home e Perfil do cliente limpos de tudo que empurrava pra Simulados/Serviços (banner, checklist, "Serviços para você", "Recomendações", "Acesso rápido", KPI de simulados no perfil).

**Commit e deploy web feitos em 2026-09-16** (commit `ab91f02`, agrupando este workstream + a preparação de App Store abaixo — confirmado com o usuário antes de agrupar). Push com a conta `hayamadigital` (necessária pra permissão no repo). O primeiro deploy automático da Vercel **falhou** com o mesmo erro histórico de `patch-package` (cache de build restaurou um `node_modules/expo-constants` incompatível com `patches/expo-constants+18.0.14.patch`) — corrigido com `vercel deploy --prod --force` (descarta cache por padrão). Segundo deploy: **Ready**. Confirmado visualmente no navegador: `https://ueno-assessoria.vercel.app/evento` está no ar e renderiza o formulário completo. **Nenhum cadastro de teste real foi enviado** (criaria conta e disparar e-mail reais em produção — precisa de autorização explícita separada).

**Ainda pendente de publicar**:
- `firestore.rules`/`firestore.indexes.json` — sem mudança de schema nesta etapa, mas não foram deployados junto ao `firebase deploy --only functions`; revisar se precisam ir também.
- `apps/mobile` — mudanças só locais/Metro; nenhum build EAS novo gerado pra isso. **Atenção**: se algum build mobile antigo já estiver em uso (TestFlight/produção) chamando o `selfRegister` antigo (com senha, autenticado), ele vai quebrar contra essa function nova — o `selfRegister` novo ignora o payload de senha e não aceita mais `request.auth`.
- Testado ponta a ponta só contra o **Firebase Local Emulator Suite** antes do deploy; nenhuma chamada real de cadastro feita contra produção ainda (só verificação visual da página).
- Se um próximo deploy web falhar de novo com erro de `patch-package`, o fix é o mesmo: `vercel deploy --prod --force` (a partir da raiz do repo, projeto já linkado em `.vercel/project.json`).

**Pendência de produto identificada mas não implementada**: hoje quem se cadastra sem senha ainda passa por **duas confirmações por e-mail separadas** no primeiro uso — o e-mail de definir senha, e depois a tela "confirme seu e-mail" no primeiro login (`emailVerified` continua `false`, `sendPasswordResetEmail` não marca isso). Dava pra marcar `emailVerified: true` automaticamente no primeiro login bem-sucedido dessas contas, já que só é possível logar depois de provar dono do e-mail pelo link de senha — ninguém pediu essa simplificação ainda, só ficou registrado como oportunidade.

## Publicação em andamento — 2026-09-16

- Firebase publicado com sucesso: todas as Functions do código atual, incluindo `selfRegister` do novo cadastro de eventos, e regras/índices Firestore/Storage. Não foram removidos os dois índices remotos ausentes no arquivo local. A função de pedido de exclusão publicada retornou `UNAUTHENTICATED` no teste sem login, sem alteração de dados.
- Vercel autenticada como `hayamadigital-5045`, mas o deploy web **não foi executado**: a revisão automática bloqueou a publicação do conjunto que também inclui `/evento`, cadastro com senha definida por e-mail e busca de cidades. Confirmação do usuário solicitada. Não contornar esse bloqueio por push ou outro comando.
- Novo build iOS **1.0.0 (8)** solicitado ao EAS; projeto enviado e credenciais Apple aceitas. ID `30211c67-9852-4a7f-a0fd-fa02e55e8681`. Consultar o status antes de afirmar que concluiu ou solicitar outro. Ainda não submetido à App Store Connect.
- Build web, TypeScript mobile e 17 testes unitários do backend aprovados novamente com o código atual. Cadastro de eventos ainda sem validação ponta a ponta nesta sessão.
- Textos e escopo para revisão em `docs/app-store-ficha.md`. Página pública de suporte preparada em `apps/web/public/suporte.html`, para `/suporte.html` após deploy. Arte aprovada com 9030 × 2796 pixels, sete painéis de 1290 × 2796; exportação individual e upload pendentes.
- Chrome não pode ser controlado nesta sessão: o pacote/skill indicado não está instalado no caminho disponível. Login manual do usuário no App Store Connect não foi inspecionado. O EAS acessou as credenciais Apple remotas para gerar o build.

Esta seção substitui os estados históricos de “sem deploy” e “build 7” abaixo. A política pública permanece dependente do deploy web; testes físicos no TestFlight e preenchimento da ficha Apple continuam pendentes.

## Preparação da App Store — 2026-09-15

Correções locais e validações documentadas em `docs/app-store-release.md`. Exclusão de conta com fila administrativa, política de privacidade compartilhada, telas do instrutor, cadastro administrativo e configuração iOS implementados. Nome legal Ueno Assessoria, contato uenoassessoria@gmail.com e prazo de exclusão de até 30 dias confirmados pelo usuário em 15/09/2026 e incluídos na política. Ainda sem deploy nem nova submissão.

**Atenção ao postinstall:** agora exige sucesso de `patch-package --error-on-fail`. O patch `expo-constants+18.0.14.patch` é necessário para gerar o manifesto em caminhos com espaços. Não voltar a ignorar falhas: a ausência do manifesto causou encerramento do app ao abrir, apesar do Xcode ter compilado. O patch de expo-image 55 foi removido, e imagem/vídeo estão alinhados ao Expo 54. A orientação histórica abaixo sobre tolerar falhas de patch foi substituída por esta correção.

Validação: 17 testes unitários, 4 testes de regras nos emuladores, TypeScript mobile, build web, exportação iOS e build Release iOS Simulator aprovados; abertura do app no simulador confirmada. A navegação por link externo parou na confirmação do sistema; os fluxos autenticados completos ainda precisam de teste em iPhone físico.

Política pública preparada para `https://ueno-assessoria.vercel.app/privacidade.html`, no mesmo domínio do admin e sem login. Fonte única: `packages/utils/src/privacy-policy.json`; regeneração: `node scripts/generate-privacy-page.mjs` (também executada no prebuild web). HTML atualizado e verificado com os dados confirmados; disponibilidade pública depende do deploy.

Exclusão: o usuário solicita no app e acompanha por protocolo secreto; a equipe conclui em **Configurações → Exclusões de conta** no painel. Definir quem acompanha a fila de até 30 dias. Cada retenção exige motivo e data; não presumir prazo legal para todos os registros. Publicar também as funções existentes alteradas e as regras/índices, não apenas as novas funções.

As mudanças desta preparação continuam locais e sem commit. Preservar alterações paralelas em `apps/mobile/app/(cliente)/servicos/[id].tsx`, `design-references/service-banners/`, `output/`, `tmp/` e `docs/raio-x-especificacao.md`; revisar o diff antes de agrupar commits.

## Alterações recentes — 2026-09-08

- O resultado dos simulados agora usa `app_config/public.simulado_passing_percentage` para determinar aprovação. O padrão é 70% quando o campo não existe.
- O painel web permite editar esse percentual em **Configurações → Preferências**. O valor é normalizado entre 0 e 100.
- No mobile, as alternativas ficam bloqueadas após “Confirmar resposta”; apenas “Próxima” e “Anterior” continuam disponíveis.
- A tela de resultado do simulado não exibe mais a seção “Revisão rápida”; mantém somente os botões de ação.
- Corrigidos os atalhos da home do cliente para apontarem para `/(cliente)/(tabs)/simulados` e `/(cliente)/(tabs)/catalogos`.
- Validações executadas: type-check de Firebase, mobile e web; `git diff --check`.
- Ainda não foi feito commit, build EAS ou publicação.

---

## Stack e infraestrutura

- **Monorepo**: Turborepo, `apps/web` (Vite + React), `apps/mobile` (Expo/React Native), `packages/*` compartilhados
- **Backend**: Firebase (Firestore + Cloud Functions + Auth + Storage), projeto `ueno-assessoria-475b9`
- **Deploy web**: Vercel, projeto `hayama-digital-s-projects/ueno-assessoria` — **este é o único projeto Vercel válido** (existe um projeto antigo chamado `web` no mesmo time, desativado/sem git conectado; ignorar)
- **App mobile**: Expo, projeto EAS `@hayamadigitals-team/ueno-assessoria` (SDK 54). **iOS já buildado e enviado para a App Store Connect** (ver seção "Estado do build mobile" abaixo). **Android ainda sem nenhum build.**

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

O `postinstall` atual exige `patch-package --error-on-fail`. Não usar `|| true`: o patch de `expo-constants@18.0.14` corrige a geração do manifesto em caminhos com espaços, necessária para o app abrir. O antigo patch de expo-image 55 foi removido. Se houver falha, conferir versões e aplicação dos patches; quando a causa for cache incompatível, refazer o build sem cache. A solução histórica de ignorar falhas foi substituída em 15/09/2026.

## Domínios autorizados no Firebase Auth

Qualquer fluxo do client SDK que passe `url`/`continueUrl` (ex: `sendPasswordResetEmail(auth, email, { url })`) só funciona se esse domínio estiver na lista de **Authorized domains** do Firebase Auth (Console → Authentication → Settings, ou via `identitytoolkit.googleapis.com/v2/projects/{project}/config`). Em 2026-08-25 faltava `ueno-assessoria.vercel.app` nessa lista — só havia `localhost`, `.firebaseapp.com` e `.web.app` — o que quebrava o botão "Esqueceu a senha?" com `UNAUTHORIZED_DOMAIN`. Já corrigido, mas **se um domínio próprio for configurado no futuro, ele também precisa ser adicionado aqui** ou qualquer fluxo com `continueUrl` vai quebrar do mesmo jeito.

## Validação Zod — cuidado ao adicionar campos que referenciam documentos do Firestore

Em 2026-08-26 encontramos e corrigimos dois bugs sistêmicos em `packages/utils/src/validators.ts` que travavam a criação/edição de praticamente tudo (processos, agendamentos, pagamentos, contratos, materiais, avaliações):

1. **Nunca use `.uuid()` para um ID do Firestore.** IDs do Firestore não são UUIDs (resquício da migração do Supabase). Use `z.string().min(1, 'mensagem')`.
2. **Campo opcional alimentado por `<select>` nativo precisa aceitar `""` além de `undefined`.** Um `<select>` sem seleção manda `value=""`, mas `z.string().optional()` / `z.enum([...]).optional()` só aceitam `undefined` — isso rejeita o formulário **sem nenhum erro visível na tela** (react-hook-form só bloqueia o submit silenciosamente). Sempre use `.optional().or(z.literal(''))` para esses campos.

Testado ao vivo em 2026-08-26: criação de cliente, processo, agendamento, cobrança, material, aviso, serviço e convite de usuário — todos funcionando após essas correções. Isso provavelmente resolve o "erro ao criar clientes e várias coisas" relatado originalmente, em conjunto com o redeploy das Cloud Functions.

## Estado do build mobile (EAS)

Conta EAS: `@hayamadigitals-team/ueno-assessoria`. Iniciado por `hayamadigital` em 2026-08-25.

- **Último build consultado: iOS #7** — versão 1.0.0 (7), concluído em 07/09/2026, commit `9c40d39`, ID `e461a154-87cf-4736-b8d5-a016521b3444`. Anterior às correções desta preparação; gerar novo build production com `autoIncrement`. Nenhum novo build ou envio foi realizado nesta etapa.
- **Histórico: iOS build #4** — perfil `production`, distribuição `store`, SDK 54, `version 1.0.0` / `buildNumber 4`, commit `9fde56e`. Status **finished** (25/08/2026 14:11). IPA: `https://expo.dev/artifacts/eas/j6eC-ZuRVPMBpsV-x3sa4masqa_P3ZbWhqpfV169Fwc.ipa`
- **iOS builds #2 e #3** — `errored` (mesma data, antes do #4).
- **Submissão iOS** `a4c40199-4fca-4383-ae72-cbf7c3236c21` — enviada para App Store Connect (ASC App ID `6804929737`), status EAS **finished** (25/08/2026 14:12). Isso confirma só que o upload pra ASC deu certo — **o status de revisão da Apple / TestFlight não foi verificado** (precisa de acesso à App Store Connect).
- **Android** — nenhum build ainda (`eas build --platform android` nunca rodou; sem envio pra Play Store).
- `app.json`: `bundleIdentifier`/`package` = `com.ueno.assessoria`, `buildNumber: "7"`; EAS production usa `autoIncrement`.
- `apps/mobile/ios/` e `apps/mobile/android/` são gerados pelo Expo e estão no `.gitignore`. A configuração versionada vem de `app.json`; não commitar os diretórios nativos gerados.

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

## Próximos passos para a App Store

1. Seguir `docs/app-store-release.md`: publicar Functions, regras e índices Firestore/Storage; aguardar os índices ficarem prontos. O deploy web não publica o backend.
2. Publicar o painel web e verificar a política em `/privacidade.html` sem login, com o contato confirmado.
3. Conferir App Check/App Attest e variáveis de produção no EAS; gerar novo build iOS production. O build 7 não contém as correções.
4. Testar no TestFlight em iPhone físico: cadastro/verificação de e-mail, login/reset, documentos, contratos, simulados/vídeos, agenda e exclusão completa com conta descartável, preservando outra conta.
5. Conferir App Store Connect: App Privacy, URL da política, suporte, screenshots, classificação, criptografia, conta demonstrativa e notas de revisão. O upload histórico não comprova aprovação pela Apple.
6. Definir o responsável pela fila de exclusão e as obrigações concretas que justificam retenção de registros.

Domínio próprio, envio automático de convites e primeiro build Android permanecem trabalhos futuros; o domínio atual da Vercel é a referência da publicação web.
