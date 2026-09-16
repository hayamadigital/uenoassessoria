# Ficha da App Store — Ueno Assessoria

Preparada em 16/09/2026. Textos prontos para preenchimento; ainda não inseridos no App Store Connect.

## Nome

Ueno Assessoria

## Subtítulo

Seu caminho para dirigir

## Texto promocional

Conheça os serviços da Ueno Assessoria, organize seu atendimento e prepare-se com simulados e materiais para sua habilitação no Japão.

## Descrição

Seu caminho para dirigir no Japão começa com informação e acompanhamento.

O app Ueno Assessoria reúne serviços de assessoria, atendimento e recursos de estudo em português para quem busca a habilitação no Japão.

CONHEÇA OS SERVIÇOS
Consulte o catálogo e encontre a assessoria adequada ao seu momento, incluindo transferência de habilitação e habilitação do zero.

ORGANIZE SEU ATENDIMENTO
Acompanhe os serviços vinculados à sua conta, consulte agendamentos e acesse seus documentos e contratos.

ESTUDE NO SEU RITMO
Pratique com simulados, confira as explicações das respostas e acompanhe seus resultados. Consulte os materiais disponibilizados para seus estudos.

FALE COM A EQUIPE
Encontre respostas nas perguntas frequentes e entre em contato com a Ueno pelo WhatsApp.

Os recursos disponíveis podem variar conforme o perfil e os serviços vinculados à conta. A Ueno Assessoria é uma assessoria independente, sem vínculo com órgãos públicos de habilitação. O uso dos materiais e simulados não garante aprovação nos exames.

Contato: uenoassessoria@gmail.com

## Palavras-chave

Japão,habilitação,CNH,menkyo,simulados,trânsito,autoescola,português

## URLs e contato

- Política: https://ueno-assessoria.vercel.app/privacidade.html — confirmar resposta pública após deploy.
- Contato público: uenoassessoria@gmail.com.
- URL de suporte: https://ueno-assessoria.vercel.app/suporte.html — página preparada em `apps/web/public/suporte.html`; confirmar resposta pública após deploy.
- Nome legal informado pelo responsável: Ueno Assessoria.

## Imagens escolhidas

- Original aprovado: `/Users/natielly/Downloads/20 (1).png`.
- Dimensões verificadas: 9030 × 2796 pixels; composição de sete painéis de 1290 × 2796.
- Preservar a ordem da esquerda para a direita e a arte aprovada. Exportação dos painéis e upload ainda pendentes.
- Referência de dimensões: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

## Notas de revisão

The app provides Portuguese-language assistance for driving licence services in Japan, including service information, appointments, documents, contracts and study resources. Features vary by account role and assigned services.

The privacy policy is available from the sign-in screen. Account deletion can be requested in Meu perfil → Excluir minha conta, after password confirmation and typing EXCLUIR. Requests are completed by the team within 30 days. The user can track the request from the sign-in screen after the account is removed.

A working, verified demonstration account with fictional content must be supplied in the App Review credentials fields before submission. Do not use real customer credentials.

## Campos que dependem da conta Apple

Conferir classificação etária, categoria, territórios, preço, declaração App Privacy, criptografia, responsável pela revisão e conta demonstrativa. Não afirmar conformidade ou aprovação com base apenas no manifesto local.

## Escopo do próximo deploy web

Além da política e da fila administrativa de exclusões, o código atual inclui a rota pública `/evento`, cadastro sem senha inicial (definida posteriormente por e-mail), seleção de serviço de interesse e autocomplete de cidades do Japão. O formulário de cadastro mobile usa o mesmo fluxo. As opções de emulador só são ativadas explicitamente; `VITE_USE_FIREBASE_EMULATOR` não consta na lista de variáveis de produção consultada.

Build web, TypeScript mobile e 17 testes unitários do backend passaram em 16/09/2026. O fluxo novo de cadastro de eventos não foi validado ponta a ponta nesta sessão. O deploy web foi bloqueado pela revisão automática por incluir esse conjunto adicional sem confirmação explícita; pedir confirmação do escopo antes de tentar publicá-lo novamente.
