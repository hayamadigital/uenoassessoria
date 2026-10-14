# Publicação Android — Ueno Assessoria

Atualizado em 05/10/2026. Preparação em andamento; **nenhum envio ao Google Play realizado**.

## Configuração

- Package definitivo: `com.ueno.assessoria`.
- Versão inicial: `1.0.0`; primeiro build EAS com versionCode `2` (autoIncrement).
- EAS: `hayamadigitals-team/ueno-assessoria`, projeto `b7bb37d4-7afd-44d0-b105-1c2c2e785e13`.
- Firebase Android criado: `1:442537306636:android:e0f425c4f6216d5aa95c29`, no projeto `ueno-assessoria-475b9`.
- Configuração pública Android em `apps/mobile/google-services.json`; não é chave privada de serviço.
- Compile/target API 36; Expo SDK 54 / React Native 0.81.5.
- App Check Android usa Play Integrity em produção e debug em desenvolvimento; iOS mantém App Attest. **Ainda precisa vincular o app Play ao projeto Cloud e cadastrar o SHA-256 de assinatura do Google Play no Firebase/App Check**. O certificado de upload do EAS não substitui o certificado de assinatura da loja.
- Keystore de upload criado e gerenciado no EAS. Não expor ou commitar credenciais.
- AAB EAS iniciado: `ca77a5b1-46da-4aa7-8e90-24233918fb16`.

## Conta e acesso

A conta Google aberta no Chrome (`natiellydhein@gmail.com`) mostrou `/console/u/0/signup`, sem console configurado. Perguntado ao responsável se já existe conta pessoal/organização e quem é o titular. Não criar conta nem pagar inscrição antes de esclarecer titularidade. Não inferir o tipo Google a partir da classificação individual da Apple.

Contas pessoais criadas após 13/11/2023 precisam de pelo menos 12 participantes no teste fechado, inscritos continuamente por 14 dias, e depois solicitar acesso à produção. Verificação de identidade/dispositivo e análise do Google também podem ser necessárias. A primeira entrega do AAB é manual pelo Play Console; EAS Submit só depois dessa primeira entrega e da configuração de acesso da API.

## Ficha sugerida

- Nome: **Ueno Assessoria**.
- Descrição curta: **Assessoria para dirigir no Japão, simulados grátis e acompanhamento de processos.**
- Preço do aplicativo: gratuito. Sem publicidade e sem venda de conteúdo digital/assinaturas.
- Suporte público: `uenoassessoria@gmail.com`.
- Política: `https://ueno-assessoria.vercel.app/privacidade.html`.
- Suporte: `https://ueno-assessoria.vercel.app/suporte.html`.
- Exclusão web: `https://ueno-assessoria.vercel.app/excluir-conta.html` — publicada nesta etapa e conferida no navegador, sem login. Deploy `dpl_CXB9tZrSE1mRtdqD72unkdNZXUcW` (READY).
- Idioma principal proposto: português do Brasil. Território necessário: Japão; confirmar outros países.

Descrição completa proposta:

> Seu caminho para dirigir no Japão. Conheça os serviços da Ueno Assessoria, tire suas dúvidas e estude no seu ritmo com simulados e materiais gratuitos.
>
> Consulte o catálogo de serviços e solicite atendimento. A equipe analisa suas informações, confirma a disponibilidade e informa o valor conforme sua localização e as necessidades do serviço. Os pagamentos dos serviços de assessoria são realizados presencialmente ao assessor.
>
> Quando houver um processo ativo vinculado à sua conta, acompanhe etapas, contratos, parcelas e agendamentos pelo aplicativo.
>
> O cadastro, os simulados e os materiais de estudo são gratuitos, sem necessidade de contratar assessoria. A Ueno Assessoria é um serviço independente, sem vínculo com órgãos governamentais. A contratação não garante aprovação nos exames de habilitação.

## Antes de enviar

1. Confirmar titular e concluir acesso/verificação do Play Console; criar app gratuito.
2. Confirmar sucesso do AAB; inspecionar permissões finais, compatibilidade com páginas de memória de 16 KB e avisos do Console.
3. Primeiro upload em teste interno e configurar Play App Signing; obter SHA-256 de assinatura e concluir Play Integrity no Firebase/Google Cloud, sem desativar proteções do backend.
4. Testar pelo Google Play em Android real: cadastro sem nascimento, login, perfil/foto, simulados/materiais, demo com processo/contrato/parcelas, exclusão e recuperação de senha. Build/prebuild não substituem esse teste.
5. Preencher Segurança dos dados com base no código e SDKs: dados pessoais, identificadores, documentos/fotos, contratos/pagamentos e atividade nos simulados. Verificar cada categoria e obrigatoriedade; não copiar automaticamente as categorias Apple. Sem publicidade comportamental. Nenhum questionário foi enviado.
6. Ícone 512×512 preparado em `output/google-play/icon-512.png`. Preparar imagem de destaque 1024×500 e capturas reais Android; evitar molduras iPhone nas imagens da ficha Android.
7. Configurar acesso para revisão com a demo existente e processo fictício. Senha apenas no campo privado do Console; não salvar neste documento.
8. Responder classificação etária/público-alvo/conteúdo e demais declarações conforme o app. Executar teste fechado se aplicável e solicitar produção.

## Validações realizadas

- `npm run type-check --workspace @ueno/mobile`: passou.
- `npx expo prebuild --platform android --no-install`: passou, config Google Services integrada e API 36 confirmada em `android/gradle.properties`.
- Prebuild avisou que `userInterfaceStyle` precisa de `expo-system-ui` para controlar a aparência do sistema Android; avaliar no dispositivo.
- Nenhum teste Android em dispositivo realizado nesta etapa.

## Referências oficiais

- [Primeiro envio Android pelo Console](https://docs.expo.dev/submit/android-manual/).
- [Requisitos de teste de contas pessoais](https://support.google.com/googleplay/android-developer/answer/14151465).
- [Target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-EN).
- [Exclusão de conta pela web](https://support.google.com/googleplay/android-developer/answer/13327111).
- [Configuração Play Integrity](https://firebase.google.com/docs/app-check/android/play-integrity-provider).
