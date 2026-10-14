# Auditoria de prontidão para a App Store — 17/09/2026

**Conclusão: ainda não submeter a versão final com o modelo de acesso por cliente.** O commit `8d7a73f` implementa parte importante da spec, mas precisa de correções e publicação coordenada. Esta auditoria não fez deploy, não criou contas e não enviou o app para revisão pública.

## Build 10 e correção de abertura de materiais — 17/09/2026

Correção implementada: PDF/vídeo resolve uma URL assinada nova a cada clique, em vez de guardar a URL gerada ao entrar na tela. Carregamento nos dois botões, proteção contra cliques simultâneos, mensagem de erro com nova tentativa e descarte da resposta se a tela desmontar ou perder acesso. TypeScript mobile, diff-check e verificações isoladas de renovação por clique, erro/retry e concorrência aprovados.

Teste real da conta demonstrativa encontrou `iam.serviceAccounts.signBlob` negado na runtime. Após pedido explícito de autorização e continuidade pelo usuário, concedido `roles/iam.serviceAccountTokenCreator` à conta `442537306636-compute@developer.gserviceaccount.com` **sobre ela mesma**, preservando demais vínculos. Não houve alteração de papéis de usuários do app. Repetição com a identidade demonstrativa: callable HTTP 200 e leitura de um byte do PDF via URL assinada HTTP 206. Credenciais e URLs não foram registradas. Esse teste usou autenticação customizada da conta de teste; não valida senha nem navegação em iPhone.

Build iOS **1.0.0 (10)** concluído no EAS: `4cec84f4-d4d4-4fd1-a24e-48bb51068974`. Upload à App Store Connect **concluído com sucesso**: submissão EAS `ea28e3ad-3792-42e3-b470-1577277adf84`. Aguardar processamento/disponibilidade na Apple. A ficha local `docs/app-store-ficha.md` foi atualizada para o acesso por cliente e a conta demonstrativa.

Pendente: conferir processamento Apple, teste com senha em dispositivo, screenshots e campos privados da ficha no App Store Connect, depois revisão pública. Não confundir upload EAS com revisão pública. Não há ferramenta de navegador conectada disponível nesta sessão e a chave Apple usada no upload permanece no serviço EAS; a ficha remota não foi editada. Tokens permanentes antigos continuam como pendência de proteção já comunicada; não foram revogados nesta etapa de renovação dos links.

## Verificação independente após deploy e migração — 17/09/2026

**Avanços em produção confirmados; ainda não pronto para a submissão final.** Esta seção atualiza os estados históricos abaixo.

Confirmado por consultas somente de leitura: **19 Functions**, incluindo as três novas; `app_config/acessos` existe e habilita Estudos/Catálogo; **uma concessão**; os **5 processos possuem snapshot**. Apple continua com **1.0.0 (9)** como build mais recente, `VALID`, TestFlight interno/externo `IN_BETA_TESTING`. Não há confirmação de revisão pública nessa consulta.

Validação local repetida: **29 testes unitários + 25 testes de regras aprovados**, build Functions e TypeScript mobile aprovados. A publicação das funções foi confirmada pela listagem remota; a assinatura de URL na runtime de produção e os fluxos da conta demonstrativa ainda precisam de teste funcional. Não foi feito novo teste em dispositivo nem inspeção da ficha Apple nesta rodada.

### Pendências concretas remanescentes

1. **Tokens permanentes ainda presentes no Storage.** Consulta apenas de metadados confirmou **2/2 objetos em `materiais/`** e **203/203 em `imagens/questoes/`** com `firebaseStorageDownloadTokens`. São contagens de objetos do bucket, não de referências nas questões. O helper novo ignora o token no app, mas isso não revoga o token no objeto; fechar o acesso antigo exige revogação efetiva e conferência dos fluxos de upload. Não foram impressos tokens nem baixados arquivos. Referência oficial sobre revogação de URLs: https://firebase.google.com/docs/storage/manage-stored-files . A validade de cada URL antiga não foi testada via download nesta auditoria.
2. **Botão de abrir material reutiliza URL expirada.** Em `apps/mobile/app/(cliente)/materiais/index.tsx:62`, a URL é resolvida ao carregar/mudar o material; em `:149`, o botão abre a mesma URL armazenada. A callable expira em 60s e o helper descarta `expires_at`. Aguardar mais de 60s na tela antes de clicar leva à tentativa de abrir uma URL vencida. Renovar no clique (com estados de carregamento/erro), ou controlar validade e renovar antes de usar. Achado por leitura do código, ainda não reproduzido em dispositivo.
3. **Entrega final Apple.** Gerar novo build com as alterações, testar a conta demonstrativa (inclusive arquivos e revogação), conferir screenshots/ficha/credenciais e enviar para revisão. Build 9 não contém o modelo novo.

Nesta verificação, nenhuma mudança em código do produto, migração, deploy ou submissão foi realizada.

## Execução dos itens 1, 2 e 3 — 17/09/2026 (com deploy e migração reais)

Diferente das rodadas anteriores, esta seção **fez deploy em produção e escreveu em dados reais**, a pedido explícito do usuário. Endereça os itens "Migração dos 5 processos antigos", "Publicação das novas funções e configuração dos acessos" e "Proteção dos arquivos que ainda usam links permanentes".

### Item 2 — Migração dos processos antigos

`node scripts/backfill-cliente-processos-snapshot.mjs` (dry-run, depois `--apply`) contra o projeto real. Os 5 processos resolveram corretamente pros serviços/variações reais (nenhum "não existe mais" pra revisar). Aplicado e verificado por leitura direta: os 5 têm `servico_snapshot` agora.

### Item 3 — Publicação e configuração de acessos

- `firebase deploy --only functions --project ueno-assessoria-475b9`: as 19 Functions publicadas, incluindo as 3 novas (`setClienteModuleAccess`, `setClientModuleAvailability`, `getMediaSignedUrl`).
- `firebase deploy --only firestore:rules,firestore:indexes,storage:rules`: precisou de dois ajustes de infraestrutura não documentados antes — (a) não existia `.firebaserc` no repo, o deploy de `storage:rules` falhava com "Could not find rules for the following storage targets: rules"; criado `.firebaserc` + `firebase target:apply storage rules <bucket>` + `"target": "rules"` em `firebase.json`. Ambos os arquivos entram no commit.
- Criado `app_config/acessos` (não existia) — inicialmente com os dois módulos desligados.
- Conta demonstrativa criada e liberada (decisão do usuário, ver pergunta feita durante a execução): `demo.revisao@uenoassessoria.com.br`, uid `GuwrRuwUE6OiPq8O30cCheIcutM2`, cliente `4YQTMEoazdPBlMdbpXzB`, dados fictícios, `status_processo: 'ativo'`. Módulos Estudos e Catálogo ligados **globalmente** (necessário pra concessão individual valer) e concedidos pra essa conta via as próprias functions `applySetClienteModuleAccess`/`applySetClientModuleAvailability` (revision/auditoria corretos). Senha gerada e entregue fora deste arquivo — não versionar.
- **Atenção:** com os módulos globais ligados, qualquer cliente que **já tenha** uma concessão individual também passa a ter acesso efetivo. Hoje só a conta demo tem concessão — os outros 8 clientes de teste em produção não têm `acessos_clientes` e continuam sem acesso.

### Item 1 — Proteção de mídia com links permanentes

Inventário real em produção (não estimativa): 20 `materiais`, 404 `questoes` (100 imagens).

| Onde | Resultado do inventário | Ação |
|---|---|---|
| `materiais.url` | 2 com token permanente (`materiais/video/**`, `materiais/pdf/**`), 2 externas, 16 vazias | Já protegido por `storage.rules` (`canAccessEstudos()`); app agora troca o token por URL assinada antes de abrir (`apps/mobile/app/(cliente)/materiais/index.tsx`) |
| `materiais.thumbnail_url` / `banner_url` | 100% vazios (20/20) | Nada a fazer |
| `MaterialCard.imagem_url` (73 cards) | 100% externas | Nada a fazer — não é conteúdo do nosso Storage |
| `QuestaoImagem.url` | 96/100 com token permanente, todas em `imagens/questoes/**`; 4 externas | **Achado importante:** esse prefixo NÃO estava protegido no `storage.rules` (só `isSignedIn()`, igual a `imagens/servicos/**`) — apesar da rodada anterior já ter *removido* esse prefixo da callable por falta de proteção. Corrigido agora dos dois lados: `storage.rules` passou a exigir `canAccessEstudos()` só para `imagens/questoes/**` (o resto de `imagens/**` continua como estava); a callable voltou a aceitar esse prefixo; `resolveQuestionImageUrl`/`resolveProtectedMediaUrl` (novo helper compartilhado em `apps/mobile/src/lib/signed-media.ts`) agora reconhece uma URL de token permanente do Storage (não só caminho interno) e pede uma assinada nova, descartando o token antigo. |

**Bug encontrado e corrigido antes de ficar em produção por muito tempo:** a primeira versão da regra usava `allPaths.matches('^questoes/.*')` para excluir `imagens/questoes/**` do match genérico de `imagens/**` — `.matches()` não existe pro tipo `path` (só pro tipo `string`), e o erro de avaliação resultante nega por padrão. Isso teria bloqueado **todo mundo** de ler qualquer coisa em `imagens/**` fora de `questoes/` (ex: banners de serviço), não só o prefixo que eu queria restringir. Detectado rodando um teste isolado no emulador logo após o primeiro deploy dessa regra (não fazia parte da suíte existente), corrigido trocando por `{segment}` (tipo string, com `!=` direto) em vez de `{allPaths=**}` + regex, testado de novo (25/25 + caso específico) e re-deployado.

**Fora de escopo, com justificativa:** as 4 imagens de questão e 2 materiais/2 cards que já são URLs genuinamente externas (não do nosso Storage) continuam como estão — não há o que "proteger" numa URL de terceiro.

### Validação desta rodada

- 29 testes unitários + build TypeScript: aprovados.
- TypeScript mobile: aprovado.
- Testes de regras via emulador, agora com `--project ueno-assessoria-475b9` (corrige a causa raiz das falhas de rodadas anteriores, que eram por usar `demo-ueno-release` — um projectId diferente do fixado na suíte, não a versão do Java): **25/25**, antes e depois do fix do bug de `.matches()`.
- Teste isolado adicional só pra esse bug específico (`imagens/questoes/**` negado sem concessão, `imagens/servicos/**` liberado pra qualquer autenticado) — script descartado depois, não faz parte da suíte versionada.

### Ainda pendente

Item 4 (novo build iOS, conta demonstrativa testada num dispositivo real, ficha da Apple) não foi executado — não foi pedido nesta rodada.

## Verificação independente após rodada 2 — 17/09/2026

**Estado atual: correções pontuais confirmadas; publicação ainda pendente.** Esta seção prevalece sobre os diagnósticos históricos abaixo.

- Confirmados `includeMetadataChanges: true` nos dois listeners e uso do `fromCache` mais recente no hook. Os dois defeitos específicos de confirmação online apontados anteriormente foram corrigidos no código; ainda falta teste funcional de perda/retorno de rede em dispositivo.
- Reexecutados cenários locais isolados de `assertCanAccessEstudos`: cliente autorizado passa; perfil inexistente, vínculo com outro cliente e exclusão `processing` são negados. Prefixo `imagens/questoes/` também é rejeitado pelo validador de mídia. Cinco verificações específicas aprovadas, sem chamadas a produção.
- **29 testes unitários + 25 de regras aprovados**, build Functions incluído nos unitários e TypeScript mobile aprovado. Regras executadas com `PATH="/tmp/ueno-test-jre/Contents/Home/bin:$PATH"` e `--project ueno-assessoria-475b9`, mantendo clientes de teste nos emuladores. Os registros históricos de 23/25 abaixo não são o resultado atual: usar `demo-ueno-release` conflita com o projectId fixado pela suíte. Não atribuir aquelas falhas somente à versão do Java sem isolar o namespace.
- **Mídia ainda parcial:** `material.url`, imagens de cards e URLs HTTP existentes não foram migradas; retirar um prefixo da assinatura não protege os arquivos que continuam em `imagens/**`. A autorização por prefixo também não verifica o vínculo/publicação do material. Concluir inventário e entrega protegida conforme a spec, incluindo tratamento dos tokens permanentes antigos.
- **Produção reconsultada:** 16 Functions; ausentes as duas Functions de concessão e `getMediaSignedUrl`; configuração global ausente; zero concessões; 5 processos, todos sem snapshot. Migração e publicação compatível continuam pendentes.
- **Apple reconsultada:** build mais recente 1.0.0 (9), `VALID`, TestFlight interno/externo `IN_BETA_TESTING`, anterior às mudanças. Ainda faltam novo build, testes funcionais com conta demonstrativa e conferência da ficha/credenciais. A consulta não comprova envio à revisão pública.

Nenhuma alteração de código do produto, gravação em produção, deploy ou submissão nesta verificação.

## Rechecagem — correções aplicadas em 17/09/2026, rodada 2 (código, sem deploy)

Endereça os 3 problemas encontrados na seção "Nova rechecagem das alterações locais de mídia/cache" abaixo. Esta seção é o diagnóstico mais recente.

### O que foi corrigido

1. **Confirmação online incompleta.** `packages/firebase/src/queries/acessos.ts`: os dois `onSnapshot` agora passam `{ includeMetadataChanges: true }` — sem isso, uma transição cache→servidor sem mudança de dado (o caso comum) não disparava um novo callback, e a confirmação podia nunca chegar. `apps/mobile/src/hooks/useClienteAccess.ts` foi reescrito de "confirmado uma vez nesta sessão" (`configConfirmedOnline`/`acessoConfirmedOnline`, sticky) para refletir o **snapshot mais recente** (`configFromCache`/`acessoFromCache`, atualizado a cada callback): se a conexão cair depois de confirmado e um snapshot subsequente vier só do cache, volta a exigir nova confirmação antes de considerar o módulo liberado, em vez de continuar liberando com base em dado que pode estar desatualizado.
2. **Autorização da callable não equivalia às regras.** `functions/src/acessos.ts` (`assertCanAccessEstudos`) agora: (a) confere `account_deletions/{uid}` antes de tudo, inclusive pra admin/instrutor, mesma regra de `isSignedIn()`; (b) exige que o doc de perfil (`users/{uid}`) exista — antes um perfil inexistente passava direto; (c) confere que `acessos_clientes/{uid}.cliente_id` resolve pra um `clientes` cujo `profile_id` é o uid autenticado, mesma checagem de coerência já adicionada em `firestore.rules` na rodada anterior.
3. **Prefixo assinável inconsistente com o que o Storage protege de verdade.** `MEDIA_SIGNED_URL_ALLOWED_PREFIXES` em `functions/src/acessos.ts` tinha `'materiais/'` e `'imagens/questoes/'`. `storage.rules` só protege `materiais/**` com `canAccessEstudos()` — `imagens/**` continua de leitura livre pra qualquer usuário autenticado. Ter `imagens/questoes/` na lista de prefixos assináveis dava uma falsa sensação de proteção (a callable exige concessão, mas o mesmo arquivo continuava legível direto via SDK sem ela). Removido; só `materiais/` fica.

### Validação desta rodada

- `npm run test --prefix functions`: 29/29, build TypeScript incluído.
- `npx tsc --noEmit -p apps/mobile/tsconfig.json`: sem erros.
- `firebase emulators:exec --only firestore,storage --project demo-ueno-release --config firebase.emulators.json 'npm run test:rules --prefix functions'`: 23/25 — as mesmas 2 falhas ambientais/pré-existentes já documentadas (não relacionadas a estas mudanças). Continua sem verificação com Java 21 (não instalado neste ambiente).

### Ainda fora de escopo (documentado, não é regressão)

O ponto 3 da rechecagem anterior ("Migração de mídia parcial") permanece: `Material.url`/`banner_url`/`MaterialCard.imagem_url` e a tela `apps/mobile/app/(cliente)/materiais/index.tsx` continuam usando URLs armazenadas diretamente (muitas já são tokens permanentes do Storage). Fechar isso exige o inventário completo + mudança no fluxo de upload do admin que a própria spec pede como etapa 1 — não é algo para uma correção pontual.

## Rechecagem — correções aplicadas em 17/09/2026 (código, sem deploy)

Endereça as pendências 1 e 2 da rechecagem anterior (`805bd04`). Não altera nada da seção "Sequência necessária para submeter" nem das pendências 3–6 (migração, produção, Apple, ficha) — essas continuam exigindo ação separada e deliberada.

### O que foi corrigido

- **Mídia protegida (pendência 1, parcial):** novo callable `getMediaSignedUrl` (`functions/src/acessos.ts` + `functions/src/index.ts`) — verifica a concessão de Estudos com Admin SDK (espelha `canAccessEstudos()`) e emite uma URL assinada v4 de 60s via `file.getSignedUrl()`, em vez de um link permanente. `apps/mobile/app/(cliente)/(tabs)/simulados/index.tsx` (`resolveQuestionImageUrl`) trocou o único `getDownloadURL` restante do app por esse callable. **Escopo explicitamente não coberto** (seguindo a própria seção 10 da spec, que pede inventário antes de mexer): `Material.url`/`thumbnail_url`/`banner_url`, `MaterialCard.imagem_url` e a maioria dos valores de `QuestaoImagem.url` são campos de texto livre preenchidos pelo admin — muitos já são URLs de download permanentes com token (confirmado em `tmp/service-banners/*.json`, domínio `imagens/servicos/**`). Migrar isso para entrega assinada exige o inventário e a mudança no fluxo de upload do admin que a spec pede como etapa 1, antes de qualquer regra nova — não foi feito aqui.
- **Revogação/offline (pendência 2):** `apps/mobile/src/hooks/useClienteAccess.ts` reescrito — as concessões só contam como liberadas depois de pelo menos um snapshot confirmado do servidor (`fromCache === false`, via `packages/firebase/src/queries/acessos.ts`), e uma transição liberado→negado ou troca de uid cancela e limpa (`queryClient.cancelQueries`/`removeQueries`) o cache de React Query das queries de Estudos e Catálogo.
- **Extra, fora das 6 pendências originais mas relacionado ao mesmo modelo:** `firestore.rules` ganhou duas checagens que a auditoria original não tinha listado: (a) coerência entre `acessos_clientes/{uid}.cliente_id` e o `clientes` real do uid (`canAccessEstudos`/`canAccessCatalogo`); (b) `simulado_config/{materialId}` (e sua subcoleção `questoes`) agora também exige que o `materiais/{materialId}` pai esteja `is_active`, fechando o mesmo tipo de brecha já corrigida em `materiais/{id}/cards`. A mesma checagem de coerência foi tentada em `storage.rules` e **revertida**: o bridge Storage→Firestore não sustenta um `get()` cujo caminho depende do resultado de outro `get()` cross-service, e quebrava leitura legítima (confirmado via `acessos-content-rules.integration.cjs`) — em `storage.rules` a defesa fica só na validação de habilitado/expiração.

### Validação desta rechecagem

- `npm run test --prefix functions`: 29/29 (build TypeScript incluído).
- `firebase emulators:exec --only firestore,storage --project demo-ueno-release --config firebase.emulators.json 'npm run test:rules --prefix functions'`: 23/25. As 2 falhas (`materiais Storage now requires the Estudos grant...` e `processing deletion blocks old tokens...`) foram confirmadas **pré-existentes e ambientais**, não causadas por nenhuma mudança desta sessão — reproduzidas de forma idêntica rodando a suíte contra o `HEAD` original (via `git stash`) antes de qualquer edição. A causa provável é a versão do Java usada localmente (Homebrew `openjdk` 26; o runtime de regras do Storage emite aviso de depreciação de `sun.misc.Unsafe` nessa versão) — `docs/app-store-release.md` já registrava "Java 21 necessário". Rodar com Java 21 antes de considerar essas 2 falhas resolvidas ou não.
- Nenhum teste funcional em dispositivo real; nenhum deploy, migração ou build novo foi feito.

### Ainda pendente (sem mudança nesta rechecagem)

Pendências 3 (migração), 4 (produção/Functions/concessões), 5 (Apple/build) e 6 (ficha/revisão pública) da rechecagem anterior continuam abertas — ver seção "Sequência necessária para submeter" mais abaixo.

## Nova rechecagem das alterações locais de mídia/cache — 17/09/2026

**Ainda não pronto.** Avaliado HEAD `805bd04` mais alterações locais não commitadas em mídia, hook e regras. Esta seção é o diagnóstico mais recente e prevalece sobre as anteriores.

Avanços: callable `getMediaSignedUrl` com validade de 60 segundos; cancelamento/remoção de queries protegidas; leitura de `fromCache`; regras Firestore verificando vínculo da concessão e ativação do material pai dos simulados.

Problemas ainda encontrados:

1. **Confirmação online incompleta.** Em `packages/firebase/src/queries/acessos.ts`, os listeners não usam `includeMetadataChanges: true`. A passagem de um snapshot de cache para a confirmação do servidor, sem mudança de dados, pode não notificar o hook, mantendo um cliente legítimo bloqueado. Em `useClienteAccess.ts`, os indicadores de confirmação só passam a `true`; não voltam a `false` quando a fonte passa a ser cache. O retorno ao primeiro plano apenas recalcula a renderização. Portanto, também continua faltando revalidação efetiva após perda de conexão.
2. **Autorização da nova callable não equivale às regras.** `assertCanAccessEstudos` aceita perfil inexistente, não verifica o vínculo `cliente_id`/`profile_id` e não consulta exclusão de conta. Verificação local isolada, com Firestore simulado e sem acesso à produção, confirmou PERMITIDO nos três cenários: perfil ausente; concessão de outro cliente; exclusão em `processing`. Validar também publicação/vínculo do arquivo ao material: apenas um prefixo de caminho não prova que o recurso está ativo.
3. **Migração de mídia parcial.** O resolvedor de imagens das questões só solicita URL curta para caminhos internos; URLs HTTP existentes são devolvidas diretamente. A tela `apps/mobile/app/(cliente)/materiais/index.tsx` continua abrindo `material.url` diretamente. `storage.rules` mantém leitura de `imagens/**` para qualquer usuário autenticado, incluindo o prefixo `imagens/questoes/` aceito pela callable. Inventariar recursos restritos, fechar leituras alternativas e tratar tokens permanentes antigos. Não foi feito download de arquivo privado nesta auditoria.

Validação repetida: **29 testes unitários + 25 testes de regras aprovados**, build Functions e TypeScript mobile aprovados. Os testes existentes não cobrem as falhas acima. O teste isolado de autorização confirma falhas do código local, não exploração de produção. Sem novo build web nesta rodada, pois o código web não mudou em relação à checagem anterior.

Consultas remotas repetidas: **16 Functions**, sem `setClienteModuleAccess`, `setClientModuleAvailability` ou `getMediaSignedUrl`; configuração global ausente; zero concessões; **5 de 5 processos sem snapshot**. Na Apple, build mais recente **1.0.0 (9)**, `VALID`, `IN_BETA_TESTING` interno/externo. A consulta não confirma submissão à revisão pública nem completude da ficha.

Após corrigir: migrar dados, publicar backend/regras/admin compatíveis, configurar conta de demonstração com concessões persistentes, gerar novo build, testar os fluxos reais e conferir a ficha no App Store Connect. Nenhuma alteração no código do produto, deploy, migração ou submissão executada nesta rechecagem.

---

## Rechecagem após o commit `805bd04` — 17/09/2026

**Ainda não está pronto para submeter a versão com Estudos/Catálogo por cliente.** As observações abaixo atualizam o diagnóstico histórico das seções seguintes; não considerar todos os problemas originais ainda abertos.

### Correções verificadas no código

- Fallback defensivo para processos sem snapshot: evita a referência nula, mas mostra dados genéricos até a migração.
- Materiais deixam de depender do status do processo e passam a usar a concessão de Estudos.
- Criação de processo pelo cliente exige Catálogo nas regras; há validação de nome/preço do snapshot.
- Regras acrescentam checagem de perfil ativo e de publicação dos principais documentos de conteúdo.
- Hook nega acesso em erro, permite repetir a consulta e reavalia expiração a cada 30 segundos e no retorno ao primeiro plano.

### Validação repetida nesta rechecagem

29 testes unitários e 25 testes de regras Firestore/Storage aprovados; TypeScript mobile e build web aprovados. O build web mantém aviso de chunks grandes. Não foi executado teste funcional em dispositivo nem no formulário de revisão da Apple.

### Pendências confirmadas

1. **Mídia protegida:** permanece `getDownloadURL` no leitor de materiais; a entrega autenticada/URLs curtas e o tratamento de tokens antigos ainda não foram implementados conforme a spec.
2. **Revogação/offline:** o hook ainda não distingue snapshots de cache nem implementa limpeza/cancelamento centralizado de consultas protegidas. O timer não resolve esses cenários; validar perda de rede, revogação com conteúdo aberto e troca de conta.
3. **Migração:** consulta agregada somente de leitura confirmou novamente 5 processos, todos sem `servico_snapshot`. Existe script de backfill, mas ainda é necessário aplicar e conferir os dados reais. O fallback corrige a exceção, não os metadados históricos.
4. **Produção:** continuam 16 Functions; ausentes `setClienteModuleAccess` e `setClientModuleAvailability`. `app_config/acessos` não existe e há zero concessões. Publicar o conjunto compatível de backend/regras/admin e configurar os acessos antes de testar a versão final.
5. **Apple:** EAS/App Store Connect ainda retorna como build mais recente o **1.0.0 (9)**, `VALID` e `IN_BETA_TESTING` interno/externo. Ele antecede as correções e o modelo de acesso. Gerar/enviar novo build e testar uma conta demonstrativa com concessões persistentes.
6. **Ficha e revisão pública:** conferir screenshots compatíveis, App Privacy, contato, credenciais e instruções de revisão no App Store Connect. A consulta disponível confirma TestFlight; não comprova envio para a revisão pública nem preenchimento da ficha.

Esta rechecagem não alterou código do app, não migrou dados, não fez deploy e não enviou versão para revisão.

---

## Diagnóstico histórico anterior ao commit `805bd04`

## Estado confirmado

| Área | Evidência |
|---|---|
| Código | HEAD `8d7a73f`, acesso por cliente; antecedido por `00a91c8`, confirmação de e-mail no primeiro login |
| Apple | Build 1.0.0 (9) `VALID`, testes internos e externos `IN_BETA_TESTING`; não contém os dois commits acima |
| Firebase | 16 Functions publicadas, incluindo `confirmPasswordlessEmail`; ausentes `setClienteModuleAccess` e `setClientModuleAvailability` |
| Concessões em produção | `app_config/acessos` ausente; zero documentos em `acessos_clientes` |
| Dados legados | Cinco processos em produção, todos sem `servico_snapshot` |
| Campos de publicação | Nenhum material ou serviço sem `is_active` na consulta agregada. Variações usam `ativo`, não presumir que a ausência de `is_active` seja erro nelas |
| Páginas públicas | `/privacidade.html` e `/suporte.html`: HTTP 200 com `uenoassessoria@gmail.com` |
| Ficha Apple | A consulta EAS confirmou o TestFlight; não conferiu preenchimento de screenshots, App Privacy, credenciais de revisão e demais campos da ficha |

## Validação executada

- 29 testes unitários do backend: aprovados.
- TypeScript mobile: aprovado.
- Build web: aprovado; permanece aviso de chunks grandes.
- 22 testes de regras Firestore/Storage: aprovados com o namespace de emulador que a suíte fixa.
- Nenhum teste funcional com cliente real foi executado; nenhuma mensagem ou e-mail foi enviado.

A primeira execução com `--project demo-ueno-release` falhou em dois testes de Storage porque os testes fixam `projectId: 'ueno-assessoria-475b9'`. A ponte Storage → Firestore consultava outro namespace. Reexecutar com ambos no mesmo namespace passou: todos os testes usaram explicitamente `127.0.0.1`, sem gravações em produção. Padronizar futuramente suíte e comando para um projeto `demo-*`, evitando essa inconsistência. As falhas iniciais não foram classificadas como falhas de produção.

Os testes aprovados não cobrem todos os critérios da spec; os problemas abaixo foram identificados por revisão do código e consultas agregadas somente de leitura.

## Correções antes da publicação do modelo

### 1. Processos existentes podem quebrar ao abrir o detalhe — prioridade alta

`packages/firebase/src/queries/processos.ts:24` resolve `servico` exclusivamente de `servico_snapshot`, usando `null` quando ausente. As telas `apps/mobile/app/(cliente)/(tabs)/processos/[id].tsx:145` e `apps/web/src/pages/clientes/ProcessoDetailPage.tsx:1173` acessam `processo.servico.nome` sem proteger esse caso.

A consulta de produção confirmou **5 de 5 processos sem snapshot**. Publicar esse código sem migração/fallback compatível pode causar exceção ao abrir processos já existentes.

Necessário: backfill autorizado de snapshots mínimos a partir dos serviços/variações vinculados, tratamento de serviço ausente e defesa nas telas. Não reabrir a leitura de todo o catálogo para contornar o problema. Validar processos antigos tanto no painel quanto no mobile, com Catálogo liberado e negado.

### 2. Estudos liberados ainda dependem do processo antigo — prioridade alta

`apps/mobile/app/(cliente)/(tabs)/simulados/index.tsx:287` ainda calcula `canViewPrivateMaterials` a partir de processo `ativo`/`analise`. A consulta na linha 299 passa `onlyPublic` segundo essa condição, e o filtro da linha 349 a repete.

Resultado: a Ueno pode conceder Estudos corretamente, a aba aparecer, mas os materiais privados continuarem ausentes para uma conta sem processo ativo/em análise — inclusive uma conta demonstrativa criada apenas com concessão.

Necessário: usar a concessão efetiva como autoridade para a biblioteca ativa, remover a restrição antiga e condicionar consultas protegidas à concessão. Testar com cliente liberado sem processo e com material privado ativo.

### 3. Criação direta de processo não exige Catálogo — prioridade alta

`firestore.rules:501` ainda permite criação de `cliente_processos` com `isCliente()` e vínculo de propriedade, sem `canAccessCatalogo()`. O SDK pode criar uma solicitação mesmo com Catálogo negado; o guard da interface não fecha esse caminho.

O teste atual `functions/test/acessos-content-rules.integration.cjs` chega a esperar sucesso nessa criação sem concessão. Atualizar regra e teste para exigir Catálogo efetivo na criação iniciada pelo cliente, preservando leitura de processos próprios existentes. Validar também a origem/confiabilidade dos snapshots enviados pelo cliente: ele não deve poder inventar metadados do serviço que o admin usará como referência.

### 4. Proteção de arquivos ainda está incompleta — prioridade alta

O próprio commit registra a entrega protegida de mídia como pendente. `apps/mobile/app/(cliente)/(tabs)/simulados/index.tsx:204` continua usando `getDownloadURL`, e a nova regra para `materiais/**` não revoga tokens públicos já emitidos. `storage.rules` ainda tem caminhos genéricos de imagens que precisam ser classificados.

Necessário: inventariar arquivos realmente restritos, eliminar URLs permanentes desses recursos e usar entrega autenticada/URLs curtas conforme a seção 10 da spec. Confirmar que links antigos não contornam a concessão. Esta auditoria não copiou nem tentou baixar arquivos privados em produção para demonstrar a exposição; identificou o mecanismo ainda presente no código.

### 5. Revogação, expiração e erros precisam de tratamento completo — prioridade média/alta

`apps/mobile/src/hooks/useClienteAccess.ts:75` retorna permissões calculadas dos documentos anteriores mesmo quando um listener sinalizou erro. A hora de expiração só é reavaliada quando há renderização; não há timer de expiração, tratamento de retorno ao primeiro plano ou verificação de snapshot vindo do cache.

As queries de Estudos continuam habilitadas por sessão/ID selecionado, sem depender da concessão, e não há limpeza centralizada dos caches protegidos no hook. Os guards verificados consomem `loading` e a permissão, mas não o estado de erro.

Necessário: negar autorização efetiva quando a verificação falha/não foi confirmada online; atualizar na expiração e retomada; cancelar consultas e limpar estado/mídia protegida ao revogar/trocar conta. Testar erro após uma concessão válida, offline, vencimento com tela aberta e mudança de usuário. As regras do servidor continuam sendo obrigatórias, mesmo com esses ajustes na interface.

### 6. Publicação de conteúdo e estado da conta não estão integralmente nas regras

Os helpers de concessão em `firestore.rules:53`/`:60` exigem papel, e-mail verificado e concessão, mas não conferem perfil ativo e coerência de `cliente_id` da concessão. As regras de leitura dos conteúdos não verificam `is_active`; um cliente com módulo liberado pode ler conteúdo inativo por ID, apesar do filtro na lista.

Necessário: completar as condições da spec e testes de leitura direta de conteúdo inativo, perfil suspenso com token antigo e vínculo inválido. Preservar o acesso administrativo necessário à gestão de rascunhos. Evitar novas consultas nas regras acima dos limites por requisição; validar especialmente a composição de helpers entre Storage e Firestore.

## Sequência necessária para submeter

1. Corrigir os pontos acima e validar o modelo com clientes básico, Estudos, Catálogo e ambos, incluindo as regressões descritas.
2. Preparar migração dos processos e da mídia, conferindo o relatório antes de escrever em produção. O script `backfill-is-active.mjs` não migra snapshots de processos.
3. Publicar Functions, regras/índices, painel e migrações de forma coordenada. O backend de concessões ainda não está publicado. Revalidar que o cliente continua acompanhando processos existentes.
4. Criar/configurar a disponibilidade dos módulos e as concessões para clientes elegíveis e conta(s) demonstrativa(s), sem tratamento especial para a Apple.
5. Gerar novo build iOS, numerado pelo EAS; não reaproveitar o 9. Testar cadastro, definição de senha/primeiro login, liberação/revogação, estudo/mídia, catálogo/processos e exclusão em iPhone via TestFlight.
6. Conferir as imagens escolhidas no build final com conta liberada; informar as condições de acesso nos textos. Preencher a ficha Apple: descrição, screenshots, URLs, App Privacy, classificação etária, preço/territórios, criptografia, contato e credenciais de revisão.
7. Selecionar o novo build e só então enviar para revisão de publicação.

A conta demonstrativa deve ter dados fictícios, e-mail confirmado, permissões configuradas e acesso persistente durante a revisão. O suporte operacional para pedidos de exclusão em até 30 dias também precisa ter um responsável.

## Limites desta auditoria

A verificação cobre repositório local, testes automatizados, lista remota de Functions, contagens de configuração/migração e estado de TestFlight. Não certifica que toda a ficha Apple esteja completa nem que o fluxo inteiro funcione no dispositivo. Não houve novo build, deploy ou submissão nesta auditoria.

Referências oficiais consultadas em 17/09/2026: [envio para revisão](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app), [requisitos de envio da Apple](https://developer.apple.com/news/upcoming-requirements/). O teste beta externo não equivale à aprovação para publicação na App Store.
