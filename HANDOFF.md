# HANDOFF — UENO ASSESSORIA

Documento de contexto para quem pegar o projeto a partir daqui. Última atualização: 2026-09-24.

## Build iOS 11 no TestFlight — 24/09/2026

A pedido do usuário, depois da reversão do acesso por cliente (seção abaixo): `eas build --platform ios --profile production` (build 11, auto-incrementado de 10) + `eas submit --platform ios --latest`. Ambos concluídos com sucesso; binário em processamento pela Apple no momento deste registro.

**Atenção — o build inclui mais do que o commit `a7c58d7`.** EAS empacota o diretório de trabalho inteiro, não só o que está commitado. No momento do build, o working tree também tinha (não commitado): o toggle de mostrar/ocultar senha em `login.tsx`, `alterar-senha.tsx` e `excluir-conta.tsx` (mobile). Ou seja, esse recurso **já está no TestFlight** sem estar no histórico do git. Recomendo commitar essas mudanças separadamente antes do próximo build, pra não perder rastreabilidade. (`SegurancaTab.tsx` é só web, não afeta este build; os docs soltos de App Store/preço/raio-x também não afetam builds.)

## Reversão do acesso por cliente — 24/09/2026

**Toda a feature de "Especificação de acesso por cliente" (seções abaixo, 16-18/09) foi revertida a pedido do usuário.** Estudos e Catálogo voltam a ficar liberados para qualquer cliente autenticado, sem concessão individual, sem toggle global e sem o "bloqueio total" antigo (`docs/bloqueio-simulados-materiais-especificacao.md`, que já bloqueava essas abas desde antes dessa feature existir — só descobri isso ao investigar, e o usuário confirmou que queria abrir de vez, não só voltar pro bloqueio total).

Importante pra quem ler as seções antigas abaixo: elas descreviam um estado "implementado, não deployado" que **deixou de ser verdade em 18/09** — a feature foi deployada de verdade em produção (rules, functions, `app_config/acessos` ligado, conta demo com concessão) e o código foi enviado pro `origin/main` (Vercel republicou o painel web com a aba "Acessos"). A reversão desta sessão desfez tudo isso: revert no código local, commit, `git push` pra `main`, e `firebase deploy --only firestore:rules,storage:rules,functions` das rules/functions revertidas. Ver `CHANGELOG.md` de 24/09 pra lista completa do que foi removido/mantido.

Ficam órfãos em produção (não apagados, inertes): `app_config/acessos`, `acessos_clientes/*`. Também fica pendente: os testes de integração de regras (`functions/test/deletion-rules.integration.cjs`) não rodaram nesta sessão porque o ambiente não tem Java (`firebase emulators:start` falha) — a reversão de `firestore.rules`/`storage.rules` foi conferida manualmente linha a linha, não confirmada no emulador.

## Build 10 e correção de abertura de materiais — 17/09/2026

Correção implementada: PDF/vídeo resolve uma URL assinada nova a cada clique, em vez de guardar a URL gerada ao entrar na tela. Carregamento nos dois botões, proteção contra cliques simultâneos, mensagem de erro com nova tentativa e descarte da resposta se a tela desmontar ou perder acesso. TypeScript mobile, diff-check e verificações isoladas de renovação por clique, erro/retry e concorrência aprovados.

Teste real da conta demonstrativa encontrou `iam.serviceAccounts.signBlob` negado na runtime. Após pedido explícito de autorização e continuidade pelo usuário, concedido `roles/iam.serviceAccountTokenCreator` à conta `442537306636-compute@developer.gserviceaccount.com` **sobre ela mesma**, preservando demais vínculos. Não houve alteração de papéis de usuários do app. Repetição com a identidade demonstrativa: callable HTTP 200 e leitura de um byte do PDF via URL assinada HTTP 206. Credenciais e URLs não foram registradas. Esse teste usou autenticação customizada da conta de teste; não valida senha nem navegação em iPhone.

Build iOS **1.0.0 (10)** concluído no EAS: `4cec84f4-d4d4-4fd1-a24e-48bb51068974`. Upload à App Store Connect **concluído com sucesso**: submissão EAS `ea28e3ad-3792-42e3-b470-1577277adf84`. Aguardar processamento/disponibilidade na Apple. A ficha local `docs/app-store-ficha.md` foi atualizada para o acesso por cliente e a conta demonstrativa.

Pendente: conferir processamento Apple, teste com senha em dispositivo, screenshots e campos privados da ficha no App Store Connect, depois revisão pública. Não confundir upload EAS com revisão pública. Não há ferramenta de navegador conectada disponível nesta sessão e a chave Apple usada no upload permanece no serviço EAS; a ficha remota não foi editada. Tokens permanentes antigos continuam como pendência de proteção já comunicada; não foram revogados nesta etapa de renovação dos links.

## Auditoria de prontidão — 2026-09-17, verificação após deploy/migração

**Produção avançou; ainda não pronto para submissão final.** Confirmados remotamente 19 Functions (incluindo concessões e mídia), configuração global com Estudos/Catálogo ligados, uma concessão e 5/5 processos com snapshot. Apple ainda tem build 9 como mais recente, válido em TestFlight interno/externo. 29 testes unitários + 25 de regras, build Functions e TypeScript mobile aprovados.

Restam dois pontos de mídia: metadados do bucket ainda têm tokens permanentes em 2/2 arquivos de `materiais/` e 203/203 de `imagens/questoes/`; ignorar o token no helper não revoga links antigos. Além disso, a tela de material resolve uma URL de 60s ao carregar e reutiliza no clique sem renovação, podendo abrir URL vencida. Ver detalhes na primeira seção de `docs/app-store-auditoria-2026-09-17.md`. Ainda faltam novo build, teste funcional da assinatura/conta demonstrativa em produção/dispositivo e conferência da ficha/revisão pública. Nenhum deploy ou alteração de dados nesta checagem; o deploy/migração foi feito na outra sessão e confirmado aqui por leitura.

## Especificação de acesso por cliente — 2026-09-16, implementada em código 2026-09-17

Criada `docs/acesso-por-cliente-especificacao.md`, a pedido do usuário. Propõe liberação manual por cliente de Estudos (simulados + materiais) e Catálogo, combinada com disponibilidade global, autorização no servidor, auditoria, expiração, revogação e acesso idêntico para clientes reais e contas da revisão Apple. Substitui a proposta de toggle global para todos em `docs/bloqueio-simulados-materiais-especificacao.md`; não altera aprovação de processos nem suspensão da conta. Seleção individual de materiais/serviços e cobrança por conteúdo estão fora desta primeira etapa.

**Implementado em código em 2026-09-17** (commit `8d7a73f`): modelo de concessão completo (`acessos_clientes`, `app_config/acessos`, callables com auditoria/idempotência/concorrência), regras do Firestore/Storage exigindo a concessão para ler o conteúdo — antes só a aba era escondida no app, o dado continuava lendo direto via SDK —, aba admin "Acessos", toggle global em Preferências, hook e guards no mobile, filtro de `is_active` nativo nas queries (`scripts/backfill-is-active.mjs` para documentos antigos, ainda não executado contra o projeto real), e snapshot do serviço/variação em `cliente_processos` para o Catálogo não quebrar processos existentes ao revogar. 29 testes unitários + 22 de integração de regras, todos verdes. **Não deployado**: módulos continuam desligados globalmente, nenhum cliente real é afetado. Pendente por decisão do usuário: mídia protegida com URL assinada (seção 10 da spec) — fica para antes do rollout com clientes reais.

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

**Pendência da dupla confirmação por e-mail — RESOLVIDA e já deployada (2026-09-16, commit `00a91c8`)**: `selfRegister` agora grava o custom claim `passwordless: true` na conta; nova Cloud Function `confirmPasswordlessEmail` confirma `emailVerified` automaticamente no primeiro login de contas com esse claim (não mexe em admin/instrutor convidados por `inviteUser`/`createCliente`). `apps/mobile/app/_layout.tsx` chama essa function antes de decidir se bloqueia na tela de confirmar e-mail. Deployada em produção junto com todas as functions (16 no total agora). Também corrigido: as telas de cadastro (mobile e `/evento`) não mostram mais erro técnico bruto (tipo `interesse_categorias é obrigatório [400]`) — `friendlyRegisterErrorMessage` em `packages/utils/src/cadastro-evento.ts` traduz pra mensagem em português comum.

**Correção retroativa aplicada em produção (2026-09-16)**: das 8 contas `cliente` existentes, 1 estava com e-mail não verificado por causa da janela de confusão entre app antigo/backend novo (`empregosjapao.ueno@gmail.com`, criada 07/09) — marcada como verificada manualmente via Admin SDK, sem exigir clique em link. Isso foi feito na mão, uma vez só; não é um processo automático — se aparecer outra conta real travada nessa tela por causa da mesma janela de transição, precisa do mesmo tratamento manual (script simples com `service-account.json`, já removido do repo).

## Publicação em andamento — 2026-09-16

- O usuário autorizou explicitamente o deploy web incluindo cadastro de eventos e cidades, resolvendo o bloqueio anterior da revisão automática.
- Firebase: Functions e regras/índices publicados nesta preparação; os dois índices remotos adicionais foram preservados. Pedido de exclusão sem login rejeitado em produção. O trabalho paralelo atualizou novamente `selfRegister` para múltiplos interesses; não restaurar a versão singular.
- Vercel: novo deploy desta sessão concluído como **READY**, deployment `dpl_3Wpf5ZLvTBD2SzN6aJ699oegLss5`, commit de referência `ab91f02`, em `https://ueno-assessoria.vercel.app`. `/privacidade.html` e `/suporte.html` retornaram HTTP 200 e o contato correto; `/evento` retornou o HTML da aplicação. Isso não valida o envio do formulário. O deploy foi autorizado explicitamente pelo usuário, incluindo o cadastro de eventos e cidades.
- Build iOS **1.0.0 (8)** concluído e enviado com sucesso à App Store Connect. Build `30211c67-9852-4a7f-a0fd-fa02e55e8681`; submissão `10cb5ce3-3ce0-4f41-ad78-728825bb1108`. A consulta à Apple confirmou `VALID` e `IN_BETA_TESTING` interno. **Não usar para a revisão final:** foi gerado antes das mudanças paralelas de múltiplos interesses e menu do cliente.
- Build iOS **1.0.0 (9)** concluído e enviado com sucesso à App Store Connect, com o código do commit `ab91f02`, após TypeScript mobile aprovado. Build `7ac737ed-657a-4f48-be01-8ce41222c128`; submissão `ce67d460-5dc2-4361-892d-122daf9b7edd`. Aguardava processamento da Apple ao concluir esta sessão; conferir disponibilidade no TestFlight antes dos testes. `app.json` foi incrementado de 8 para 9 pelo EAS.
- Textos em `docs/app-store-ficha.md` e arte aprovada devem ser revisados à luz do menu simplificado: o material anterior divulga simulados e serviços, cujos atalhos foram removidos no trabalho paralelo. Não enviar a ficha antiga sem conferir a disponibilidade real desses recursos no build final.
- Chrome não pode ser controlado nesta sessão; a ficha da loja não foi preenchida. O EAS usou a chave Apple remota para o upload dos builds 8 e 9. TestFlight físico e envio à revisão Apple permanecem pendentes.

Esta seção substitui os estados históricos de “sem deploy” e “build 7” abaixo. O cadastro em produção ainda precisa de validação funcional; o teste HTTP das páginas não comprova o fluxo completo.

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
