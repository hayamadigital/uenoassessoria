# Preparação da App Store — 14/09/2026

## [2026-09-30] — Build 13 reenviado à Apple: WAITING_FOR_REVIEW

Estado confirmado pela API oficial em **30/09/2026 às 09:43 JST**: versão App Store **1.0**, binário **1.0.0 (13)**, versão e submissão em **WAITING_FOR_REVIEW**. Reenvio efetivo para revisão pública, não apenas upload ao TestFlight. Submissão existente: `2710a477-c32d-4fb3-9fe2-6bc6bf20b8f7`; versão Apple: `7725447c-695b-4ef9-a690-a39ef52ede61`; build Apple: `03304512-f2ca-4a79-a52c-44e30a16d6a3` (VALID). Liberação após aprovação continua configurada como `AFTER_APPROVAL`; não foi alterada.

- **Build EAS 13**: `04d6585b-6881-408f-b5ee-918bd5830d59`, FINISHED. Upload EAS `7363546e-e33d-498e-a0d4-422c0d0c6566`, FINISHED. Build 12 (`07adb5e9-6d00-4867-b133-8b1459c83674`) foi intermediário e não foi escolhido para revisão.
- **Cadastro**: nascimento opcional no mobile/web, sem envio da data ausente ao backend/WhatsApp.
- **Contratos**: teste real com identidade de cliente revelou permission-denied na consulta por processo. Corrigido `listContratosByProcesso` com filtro de `cliente_id` para o mobile e filtragem/ordenação local do processo; fluxo admin preservado. Tela agora informa falha de carregamento em vez de apresentar ausência de contratos. Nenhuma regra foi relaxada.
- **Estudos**: apesar da reversão de 24/09, ainda havia filtro de materiais condicionado a processo ativo/em análise. Removido para corresponder à política confirmada: todos os materiais ativos e simulados disponíveis gratuitamente a qualquer usuário autenticado, independentemente de contratar assessoria.
- **Web publicada** em 29/09: https://ueno-assessoria.vercel.app, deployment `dpl_JDSDdajkxNQhgUHtGnwBjEZrni6n` (READY). Conferido `/evento`: validação obrigatória ausente e rótulo opcional presente; política/suporte HTTP 200. Upload inicial excedeu limite de arquivos; nova tentativa compactada concluiu. `.vercelignore` adicionado. Esse deploy inclui o cadastro corrigido; as mudanças posteriores na tela de Estudos e no uso mobile da consulta de contratos estão no build 13. A chamada administrativa web de contratos não mudou.
- **Demo em produção**: `apple-review-demo-contract` e `apple-review-demo-payment`, duas parcelas `demo-1`/`demo-2`; documento e registros claramente fictícios, cancelados, valores zero, sem cobrança/recebimento/notificação. Preservados processo ativo, 7 etapas e 1 agendamento. PDF `output/pdf/contrato-demo-revisao-apple.pdf`, renderizado e inspecionado, vinculado no Storage somente ao cliente demo.
- **Validação**: TypeScript mobile/web aprovado; 23 testes functions (2 regressões novas de contratos) e 12 utils aprovados; build iOS nativo 13 concluído. Consultas com identidade demo e regras reais: contrato, parcelas, serviços e materiais lidos; contratos de outro cliente negados; PDF do contrato HTTP 200, dois vídeos HTTP 206/200 e PDF de estudo HTTP 206. Login por email/senha confirmado usando em memória a credencial privada já cadastrada na Apple. Teste visual no iPhone **não confirmado**, assim como fluxo completo de novo cadastro em dispositivo. Emuladores de regras não executados por ausência de Java.
- **Ficha Apple**: descrição pt-BR atualizada, removida concessão manual; notas substituídas por resposta completa às cinco perguntas e correção 5.1.1(v), instruções da demo e exclusão de conta. Contato Natielly Narumi / Hayama Dhein, hayamadigital@gmail.com, +817021974995. Senha existente preservada. Leitura posterior confirmou descrição/notas/build salvos.
- **Reenvio**: item rejeitado marcado `resolved: true`, submissão existente enviada com `submitted: true`; confirmação independente retornou WAITING_FOR_REVIEW e build 13. As respostas foram salvas nas **notas de revisão**; não foi postada mensagem separada na conversa da rejeição (API pública não expõe esse recurso). Navegador continuou indisponível; usado acesso oficial à Apple com chave existente no EAS, somente em memória, sem salvar chaves/senhas.

**Próximo acompanhamento:** aguardar avaliação da Apple e confirmar teste visual do build 13 em iPhone. Não reenviar novamente enquanto está na fila. Alterações continuam no working tree, junto de mudanças anteriores de outra sessão: não houve commit/push nesta etapa. O deploy web foi direto pela CLI; cuidado para um futuro push não republicar uma versão sem a correção local. Scripts operacionais temporários estão em `tmp/`, sem segredos persistidos.

## Build 10 e correção de abertura de materiais — 17/09/2026

Correção implementada: PDF/vídeo resolve uma URL assinada nova a cada clique, em vez de guardar a URL gerada ao entrar na tela. Carregamento nos dois botões, proteção contra cliques simultâneos, mensagem de erro com nova tentativa e descarte da resposta se a tela desmontar ou perder acesso. TypeScript mobile, diff-check e verificações isoladas de renovação por clique, erro/retry e concorrência aprovados.

Teste real da conta demonstrativa encontrou `iam.serviceAccounts.signBlob` negado na runtime. Após pedido explícito de autorização e continuidade pelo usuário, concedido `roles/iam.serviceAccountTokenCreator` à conta `442537306636-compute@developer.gserviceaccount.com` **sobre ela mesma**, preservando demais vínculos. Não houve alteração de papéis de usuários do app. Repetição com a identidade demonstrativa: callable HTTP 200 e leitura de um byte do PDF via URL assinada HTTP 206. Credenciais e URLs não foram registradas. Esse teste usou autenticação customizada da conta de teste; não valida senha nem navegação em iPhone.

Build iOS **1.0.0 (10)** concluído no EAS: `4cec84f4-d4d4-4fd1-a24e-48bb51068974`. Upload à App Store Connect **concluído com sucesso**: submissão EAS `ea28e3ad-3792-42e3-b470-1577277adf84`. Aguardar processamento/disponibilidade na Apple. A ficha local `docs/app-store-ficha.md` foi atualizada para o acesso por cliente e a conta demonstrativa.

Pendente: conferir processamento Apple, teste com senha em dispositivo, screenshots e campos privados da ficha no App Store Connect, depois revisão pública. Não confundir upload EAS com revisão pública. Não há ferramenta de navegador conectada disponível nesta sessão e a chave Apple usada no upload permanece no serviço EAS; a ficha remota não foi editada. Tokens permanentes antigos continuam como pendência de proteção já comunicada; não foram revogados nesta etapa de renovação dos links.


## Estado de publicação — 16/09/2026

- Firebase: deploy de Functions, regras e índices concluído. Os dois índices remotos ausentes no arquivo local foram preservados. Pedido de exclusão sem login rejeitado em produção.
- Web: escopo adicional autorizado pelo usuário. Produção verificada como Ready; política e suporte retornaram HTTP 200 com o contato correto, e `/evento` retornou o HTML da aplicação. Novo deploy CLI concluído como READY, `dpl_3Wpf5ZLvTBD2SzN6aJ699oegLss5`, no domínio oficial.
- iOS: build 1.0.0 (8) concluído e enviado à App Store Connect, submissão `10cb5ce3-3ce0-4f41-ad78-728825bb1108`. Ele antecede a mudança paralela de múltiplos interesses; substituí-lo pelo build 1.0.0 (9), concluído com o commit `ab91f02` e enviado à Apple. Build `7ac737ed-657a-4f48-be01-8ce41222c128`; submissão `ce67d460-5dc2-4361-892d-122daf9b7edd`. Aguardava processamento da Apple; conferir disponibilidade no TestFlight.
- Ficha preparada em `docs/app-store-ficha.md`; preenchimento Apple, exportação dos sete painéis e testes no iPhone continuam pendentes. Esta seção atualiza os resultados históricos abaixo.

## Alterações preparadas

- Política acessível no login/cadastro e nas configurações de todos os perfis. Conteúdo compartilhado em `packages/utils/src/privacy-policy.json`.
- Página pública estática em `apps/web/public/privacidade.html`, sem autenticação. URL após deploy: `https://ueno-assessoria.vercel.app/privacidade.html`. Execute `node scripts/generate-privacy-page.mjs` após editar o texto compartilhado.
- Exclusão solicitada no app com senha recente e confirmação EXCLUIR. Protocolo secreto salvo no SecureStore; acompanhamento também disponível no login depois que a conta é removida.
- Painel: Configurações → Exclusões de conta. Conclusão manual com confirmação, retenção opcional justificada e data obrigatória. Falhas podem ser retomadas. Contas em processamento não podem mais acessar Firestore/Storage nem chamar funções protegidas por rate limit, inclusive usando um token antigo.
- Dados pessoais, documentos, fotos, resultados, perfil e autenticação são apagados. Contratos assinados e registros financeiros podem ser arquivados por obrigação de retenção. Arquivos retidos não preservam tokens públicos de download e só são acessíveis no servidor. A tarefa diária descarta os arquivos vencidos.
- Agenda, hoje, clientes, notificações e perfil do instrutor consultam dados reais. Contratos do cliente e rotas administrativas deixam de ser telas provisórias. O cadastro administrativo cria o cliente e abre o compartilhamento do convite quando selecionado.
- Dependências de imagem/vídeo alinhadas ao SDK 54. Patch de expo-image 55 removido. Diretórios nativos gerados pelo Expo, excluídos do Git e do envio EAS; configuração vem de app.json. Permissões de fotos/câmera em português, sem permissão desnecessária de microfone.

## Informações da empresa e pendências operacionais

- Nome legal confirmado: **Ueno Assessoria**. Contato público confirmado: **uenoassessoria@gmail.com**. Dados incluídos na política compartilhada entre app e página pública em 15/09/2026.
- Prazo de atendimento da exclusão confirmado pela empresa: até **30 dias**. Definir quem acompanha a fila administrativa; o prazo operacional não é uma afirmação sobre um prazo legal universal.
- Definir obrigações concretas de retenção e seus prazos para orientar o operador. A implementação não inventa um prazo para contratos/financeiro: cada retenção exige motivo e data.
- Revisar declaração App Privacy na App Store Connect. O manifesto local não substitui o preenchimento da ficha da loja.

## Ordem de disponibilização

1. Política atualizada com nome legal, contato e prazo confirmados; HTML público regenerado. Revisar o conteúdo antes da publicação.
2. Publicar Functions, incluindo `requestAccountDeletion`, `getAccountDeletionReceipt`, `completeAccountDeletion`, `purgeExpiredRetainedAccounts` e a versão atual das funções existentes que usam rate limit.
3. Publicar índices e regras Firestore/Storage. Esperar os índices ficarem prontos.
4. Publicar o painel web e conferir que `/privacidade.html` abre sem login.
5. Confirmar App Check/App Attest no Firebase e as variáveis EXPO_PUBLIC_FIREBASE_* do ambiente production no EAS.
6. Gerar novo build iOS production. O último build consultado antes das mudanças era 1.0.0 (7), de 07/09/2026. `autoIncrement` gera um novo número. Não reutilizar o build 7 para estas correções.
7. TestFlight em iPhone físico: cadastro → confirmação de e-mail → login; senha esquecida; perfil; documentos/fotos; simulados/vídeos; contratação/contratos; agenda/instrutor; pedido e acompanhamento de exclusão com conta descartável; conclusão no painel e confirmação de que outra conta permanece intacta.
8. App Store Connect: screenshots atuais, descrição, suporte e política, classificação etária, países/preço, declaração de criptografia, conta de demonstração com dados fictícios e notas de revisão. Conferir SDK/Xcode do IPA final.

## Revisão Apple — texto sugerido

O Ueno Assessoria organiza o atendimento de clientes no Japão, documentos, agendamentos e serviços contratados, além de materiais de estudo e simulados. Os perfis de cliente, instrutor e administrador possuem permissões distintas. A conta de demonstração deve ter o e-mail previamente verificado. A política de privacidade pode ser acessada na tela de entrada. Para iniciar a exclusão: Meu perfil → Excluir minha conta → confirmar senha e digitar EXCLUIR. A exclusão é processada pela equipe e pode ser acompanhada pelo app, inclusive após o encerramento da conta.

Não inserir credenciais reais de clientes nas notas. Fornecer uma conta demonstrativa ativa com exemplos de agenda, materiais e processos.

## Verificação local

- `npm test --prefix functions`
- `npm run type-check --workspace=@ueno/mobile`
- `npm run build --workspace=@ueno/web`
- `cd apps/mobile && npx expo install --check && npx expo export --platform ios`
- `firebase emulators:exec --only firestore,storage --project demo-ueno-release --config firebase.emulators.json 'npm run test:rules --prefix functions'` (Java 21 necessário).

Os testes unitários usam doubles. Os testes `test:rules` usam emuladores com dados fictícios; nunca executar esses testes em um projeto real.

## Resultado da validação — 15/09/2026

- 17 testes unitários do backend aprovados.
- 4 testes reais de Security Rules aprovados nos emuladores Firestore/Storage: acesso durante pedido pendente, bloqueio de token antigo durante processamento, sigilo dos arquivos retidos e isolamento de clientes do instrutor.
- TypeScript mobile aprovado; build web aprovado (permanece o aviso existente de chunks grandes).
- Exportação iOS aprovada e compilação Release para iOS Simulator aprovada no Xcode 26.6, incluindo o manifesto de privacidade.
- Ícone 1024×1024 sem canal alpha.
- EAS production fixado em `macos-tahoe-26.5-xcode-26.6`, compatível com a infraestrutura documentada pelo Expo: https://docs.expo.dev/build-reference/infrastructure/
- Não houve deploy do backend/web, build EAS novo nem submissão à App Store nesta correção. TestFlight físico e conferência da App Store Connect permanecem necessários.

### Falha de inicialização identificada e corrigida

O build compilava, mas o primeiro lançamento no simulador encerrava o app: `expo-linking` não encontrava o manifesto. A causa foi um `basename $PROJECT_DIR` sem aspas em `expo-constants`, que omitia silenciosamente `EXConstants.bundle/app.config` quando o projeto ficava em um caminho com espaços. O patch agora cobre o podspec e o script de geração, está vinculado a `expo-constants@18.0.14` e o postinstall falha se o patch não puder ser aplicado.

Após a correção, a compilação Release passou, o app abriu a tela de apresentação no iPhone 17 Pro simulado e `node scripts/verify-ios-artifact.mjs /caminho/UenoAssessoria.app` confirmou a configuração e a declaração de privacidade dentro do artefato. A navegação por link externo exibiu a confirmação do iOS; o fluxo autenticado completo ainda requer TestFlight com conta de demonstração.
