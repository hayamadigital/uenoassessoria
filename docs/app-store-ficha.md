# Ficha da App Store — Ueno Assessoria

Atualizada na Apple em **30/09/2026**. Descrição pt-BR e respostas completas às cinco perguntas salvas nas notas de revisão; build **1.0.0 (13)** selecionado e versão 1.0 reenviada. Estado confirmado **WAITING_FOR_REVIEW** às 09:43 JST. Cadastro, catálogo, simulados e materiais gratuitos; assessoria presencial paga separadamente. Login da conta demo confirmado com a senha existente. Teste visual em iPhone ainda não confirmado. Consulte `docs/app-store-resposta-revisao-2026-09-29.md` para o texto exato das notas enviadas.

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

Criar uma conta, consultar o catálogo e acessar simulados e materiais de estudo é gratuito, sem necessidade de contratar assessoria. Os serviços de assessoria são cobrados separadamente, com valor definido após análise e pagamento presencial ao assessor. Após a aprovação e ativação do processo, acompanhe o atendimento, o valor acordado, as parcelas e o contrato pelo app. A Ueno Assessoria é uma assessoria independente, sem vínculo com órgãos públicos de habilitação. O uso dos materiais e simulados não garante aprovação nos exames.

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
- Sete painéis exportados de esquerda para a direita em `output/store-publication/app-store/aprovado/`, 1284 × 2778, enviados ao slot iPhone de 6,5 polegadas e aceitos (7/10).
- Referência de dimensões: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

## Notas de revisão

The app provides Portuguese-language assistance for driving licence services in Japan. Anyone can create a free account. The service catalogue, practice tests and study materials are available to all registered users without purchasing a service or obtaining an individual access grant. There are no paid digital courses, study resources or subscriptions.

Paid services are real-world driving licence assistance. Users submit a request from Serviços; Ueno reviews it and defines the final price based on location and the relevant driving licence centre. Payment is made in person to the adviser, not processed by the app. Once a process is activated by Ueno, the Processos tab appears with the agreed amount, instalment records, stages and contract. Appointments are accessible from the home screen. There is no separate charge for these customer records.

Date of birth is optional during registration in the corrected build. Users can leave it blank.

The privacy policy is available from the sign-in screen. Account deletion can be requested in Meu perfil → Excluir minha conta, after password confirmation and typing EXCLUIR. Requests are completed by the team within 30 days. The user can track the request from the sign-in screen after the account is removed.

Demonstration account: demo.revisao@uenoassessoria.com.br (fictional data, verified customer account). Enter its existing password in the private App Review credentials field; do not place the password in these notes. Test this account on the submitted build before review.

## Contato privado da revisão

- Natielly Narumi Hayama Dhein
- hayamadigital@gmail.com
- +817021974995
- O contato público da Ueno permanece uenoassessoria@gmail.com.

## Campos que dependem da conta Apple

Conferir classificação etária, categoria, territórios, preço, declaração App Privacy, criptografia, responsável pela revisão e conta demonstrativa. Não afirmar conformidade ou aprovação com base apenas no manifesto local.

## Escopo do próximo deploy web

Além da política e da fila administrativa de exclusões, o código atual inclui a rota pública `/evento`, cadastro sem senha inicial (definida posteriormente por e-mail), seleção de serviço de interesse e autocomplete de cidades do Japão. O formulário de cadastro mobile usa o mesmo fluxo. As opções de emulador só são ativadas explicitamente; `VITE_USE_FIREBASE_EMULATOR` não consta na lista de variáveis de produção consultada.

Build web, TypeScript mobile e 17 testes unitários do backend passaram em 16/09/2026. O fluxo novo de cadastro de eventos não foi validado ponta a ponta nesta sessão. O bloqueio inicial da revisão automática foi resolvido pela autorização explícita do usuário. Política e suporte já responderam publicamente com HTTP 200 e contato correto; a rota `/evento` respondeu com o HTML da aplicação. O envio do formulário ainda não foi validado nesta sessão.

## Rascunho App Privacy — preenchimento de 17/09/2026

Categorias declaradas com base no código/política: nome, e-mail, telefone, endereço físico, fotos/vídeos, outros conteúdos do usuário (documentos/contratos), outros dados (nascimento/habilitação/cadastro), dados de pagamento, outras informações financeiras (saldos/parcelas), suporte ao cliente, ID de usuário, ID do dispositivo (push), histórico de compras/serviços e interações com o produto (estudos/resultados). Finalidade: funcionalidade do app; vinculados à identidade; sem rastreamento publicitário. Conferir publicação efetiva do rascunho antes da submissão.

Base de interpretação: https://developer.apple.com/app-store/app-privacy-details/ . Não confundir dados de serviços contratados com compras digitais dentro do app. A ausência de SDK de anúncios não dispensa declarar dados de conta e atendimento.
