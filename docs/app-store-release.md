# Preparação da App Store — 14/09/2026

## Estado de publicação — 16/09/2026

- Firebase: deploy de Functions, regras e índices concluído. Os dois índices remotos ausentes no arquivo local foram preservados. Pedido de exclusão sem login rejeitado em produção.
- Web: login Vercel confirmado; deploy bloqueado pela revisão automática até confirmação do conjunto adicional de cadastro de eventos e cidades. Política ainda não publicada nesta etapa.
- iOS: build 1.0.0 (8) solicitado e enviado ao EAS, ID `30211c67-9852-4a7f-a0fd-fa02e55e8681`; consultar status antes de prosseguir. Sem envio à App Store Connect nesta etapa.
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
