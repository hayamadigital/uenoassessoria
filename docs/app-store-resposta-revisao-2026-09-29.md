# Revisão Apple — 29/09/2026

## Estado final — 30/09/2026

**REENVIADO. WAITING_FOR_REVIEW às 09:43 JST.** Versão 1.0, build 13, submissão `2710a477-c32d-4fb3-9fe2-6bc6bf20b8f7`. Descrição e notas atualizadas pela API oficial e verificadas após salvar. Resposta incluída nas notas de revisão, sem mensagem separada na conversa de rejeição. Detalhes de correções, testes e dados demo no HANDOFF/CHANGELOG de 30/09. Teste visual em iPhone não confirmado.

### Texto exato salvo nas notas de revisão

Resubmission: iOS 1.0, build 13.

Hello App Review team,

Thank you for reviewing Ueno Assessoria.

Regarding Guideline 5.1.1(v), date of birth is now optional during registration. Users can create an account without providing it. The field is labeled as optional, and leaving it blank does not block registration.

Regarding Guideline 2.1(b), please find our answers below:

1. Who are the users that will use the paid services in the app?

The paid services are driving licence assistance services in Japan, including assistance with transferring a foreign driving licence or obtaining a first licence. They are intended for people seeking assistance with these real-world procedures. The app helps customers request and manage this assistance.

2. Where can users purchase the services that can be accessed in the app?

Users browse the Serviços (Services) menu, which displays reference prices starting from a specified amount, and submit a service request. Ueno reviews the customer's information and accepts or declines the request. If accepted, Ueno determines the final price based on the customer's location and the relevant driving licence centre (Menkyou Center). The agreed amount and contract are made available in the app. Payment takes place in person when the customer meets the adviser. The app does not process payments.

3. What specific types of previously purchased services can a user access in the app?

Customers can view administrative information for their driving licence assistance service: the agreed price, contract, instalment records, process stages and scheduled dates. The Processos (Processes) tab appears when Ueno activates a customer's process; it is not unlocked by an in-app payment. Appointments are also accessible from the home screen. These screens support the real-world service and are not separately sold digital products.

4. What paid content, subscriptions, or features are unlocked within your app that do not use in-app purchase?

There is no paid digital content or subscription. All practice tests and study materials are free for every registered user, including users who have never purchased an assistance service. No service purchase is required to access them. Customer-specific contracts and process information relate only to that customer's real-world assistance service; there is no separate charge for accessing those records in the app.

5. How do users obtain an account? Do users have to pay a fee to create an account?

Anyone can create an account directly in the app using the registration screen. Account creation is free and does not require purchasing a service. After registration, the user receives an email to set their password.

Thank you.

Review account: use the credentials in the private demo account fields. The Processos tab contains an active demonstration process with 7 stages, a fictional PDF contract and two cancelled zero-value instalments, labelled DEMO (no real charges). Studies and services are available to all registered users without manual grants.

Privacy policy: available from sign-in. Account deletion: Meu perfil > Excluir minha conta (password confirmation and EXCLUIR); requests completed within 30 days.

## Histórico anterior ao reenvio (pendências abaixo foram superadas salvo indicação no estado final)

## Verificação de prontidão — 29/09/2026

**Ainda não pronto para reenviar.** Consulta EAS ao vivo confirmou build mais recente 1.0.0 (11), `d1eea7a6-bf25-4a39-a07d-c4bc1c3786dc`, concluído em 24/09; nenhuma compilação com a correção do nascimento opcional ainda. Exportação iOS local Expo/Metro/Hermes passou (2.300 módulos); isso não substitui build nativo nem teste em dispositivo. Testes utils/functions e compilação web/mobile já aprovados nesta sessão; diff-check limpo.

Consulta somente leitura em produção: conta demo habilitada, email verificado, provedor senha, perfil cliente e um cadastro de cliente. Um processo ativo, valor definido, 7 etapas e 1 agendamento. **Nenhum contrato vinculado e nenhum pagamento lançado**: não será possível demonstrar contrato/parcelas com os dados atuais. Senha/login não testados; consultas administrativas não comprovam acesso pelas regras do cliente. Não houve alteração de dados.

Política e suporte retornam HTTP 200 com email público correto. `/evento` retorna HTTP 200, mas o JavaScript publicado ainda contém a validação de nascimento obrigatório e não contém o rótulo opcional. Publicar a correção web. Banco: 9 serviços (7 marcados ativos), 20 materiais (20 marcados ativos).

Limitações: consulta App Store Connect pelo navegador indisponível nesta tentativa — runtime do plugin aponta para `browser/26.825.32147/scripts/browser-service.mjs` inexistente, mesmo usando a skill instalada 26.915.31029. Portanto não houve confirmação nova do status Apple nem da ficha remota. Último estado confirmado anteriormente: rejeição do build 10. Testes de regras via emulador continuam sem executar por ausência de Java. Resposta à Apple, ficha remota e reenvio não enviados nesta verificação.

Antes do reenvio: disponibilizar build corrigido; testar cadastro sem nascimento/login/arquivos em dispositivo; preparar contrato e parcelas **fictícios da demo** para revisar o fluxo completo; atualizar ficha remota e enviar resposta preparada junto da versão corrigida. Não criar cobranças reais nem enviar notificações para preencher a demo.

**Resposta preparada com as informações confirmadas pela responsável em 29/09/2026. Não enviada.** Aguardar novo build corrigido e conferência final antes do envio.

## Rejeição verificada

- App: 6804929737; submissão: 2710a477-c32d-4fb3-9fe2-6bc6bf20b8f7.
- Versão analisada: iOS 1.0, build 1.0.0 (10); revisão em 25/09/2026.
- 5.1.1(v): tornar a data de nascimento não obrigatória.
- 2.1(b): esclarecer público, contratação, serviços previamente comprados, recursos pagos sem IAP e criação de conta.

## Correção local

Cadastro mobile e web aceitam data de nascimento omitida ou vazia; rótulo informa que é opcional. Datas fornecidas continuam sendo validadas. Sem data, o payload omite o campo e a mensagem de WhatsApp não inclui a linha. O backend já aceitava ausência e persiste null; sua tipagem foi alinhada a esse comportamento.

Validação: 12 testes utils (4 novos de cadastro), 21 testes functions, TypeScript mobile e build web aprovados. O build web apresenta aviso de chunks grandes. Não houve teste de cadastro em dispositivo nem criação de conta real nesta etapa. Nenhum deploy, novo build iOS ou reenvio realizado nesta etapa. Build 11, enviado em 24/09, também não contém esta correção.

## Modelo confirmado e conferência no código

- Qualquer pessoa pode criar conta gratuitamente. Simulados e materiais são gratuitos, independentemente de contratar assessoria; não há conteúdo digital ou assinatura pagos.
- Serviços de assessoria são solicitados pelo menu Serviços, com preço de referência. A responsável analisa os dados, confirma ou recusa e define o valor conforme localização/cidade e o Menkyou Center indicado. Pagamento presencial no encontro com o assessor, sem checkout no app.
- `servicos/[id].tsx` cria a solicitação com status `analise` e valor acordado null.
- `(tabs)/_layout.tsx` mostra a aba **Processos** quando existe processo com status `ativo`. Não exige pagamento registrado. O título interno é **Meus processos**.
- `(tabs)/processos/[id].tsx` mostra valor definido, parcelas/datas, etapas e contrato em PDF. Datas de etapas ficam no processo; a agenda separada é acessada pela tela inicial.
- Estudos e Catálogo não exigem concessão individual no código atual (reversão a7c58d7). A descrição antiga na ficha local foi corrigida; não presumir atualização remota.
- Não incluir planos hipotéticos de documentos futuros na resposta. Contratos e informações do atendimento já existentes são registros do serviço presencial, não uma venda de conteúdo educacional.

## Resposta em inglês — enviar após selecionar o build corrigido

Hello App Review team,

Thank you for reviewing Ueno Assessoria.

Regarding Guideline 5.1.1(v), date of birth is now optional during registration. Users can create an account without providing it. The field is labeled as optional, and leaving it blank does not block registration.

Regarding Guideline 2.1(b), please find our answers below:

1. Who are the users that will use the paid services in the app?

The paid services are driving licence assistance services in Japan, including assistance with transferring a foreign driving licence or obtaining a first licence. They are intended for people seeking assistance with these real-world procedures. The app helps customers request and manage this assistance.

2. Where can users purchase the services that can be accessed in the app?

Users browse the Serviços (Services) menu, which displays reference prices starting from a specified amount, and submit a service request. Ueno reviews the customer's information and accepts or declines the request. If accepted, Ueno determines the final price based on the customer's location and the relevant driving licence centre (Menkyou Center). The agreed amount and contract are made available in the app. Payment takes place in person when the customer meets the adviser. The app does not process payments.

3. What specific types of previously purchased services can a user access in the app?

Customers can view administrative information for their driving licence assistance service: the agreed price, contract, instalment records, process stages and scheduled dates. The Processos (Processes) tab appears when Ueno activates a customer's process; it is not unlocked by an in-app payment. Appointments are also accessible from the home screen. These screens support the real-world service and are not separately sold digital products.

4. What paid content, subscriptions, or features are unlocked within your app that do not use in-app purchase?

There is no paid digital content or subscription. All practice tests and study materials are free for every registered user, including users who have never purchased an assistance service. No service purchase is required to access them. Customer-specific contracts and process information relate only to that customer's real-world assistance service; there is no separate charge for accessing those records in the app.

5. How do users obtain an account? Do users have to pay a fee to create an account?

Anyone can create an account directly in the app using the registration screen. Account creation is free and does not require purchasing a service. After registration, the user receives an email to set their password.

Thank you.

## Base da interpretação

Pelo modelo informado, os serviços pagos são prestados fora do app, enquadramento compatível com a regra 3.1.3(e), sujeita à avaliação da Apple: https://developer.apple.com/app-store/review/guidelines/#goods-and-services-outside-of-the-app . A resposta descreve os fatos, sem prometer aprovação nem omitir a área de acompanhamento dos clientes.

## Próximos passos

- Publicar o cadastro web corrigido e gerar/enviar novo build iOS; selecionar esse build na versão 1.0.
- Validar cadastro sem data e login da conta demo no dispositivo/build novo. Conferir se a demo tem um processo ativo para a Apple revisar essa área; não afirmar que tem sem verificar.
- Atualizar descrição e notas de revisão remotas com o texto local corrigido, sem concessão por cliente.
- Conferir a resposta com a responsável antes do envio, conforme solicitado; depois responder à Apple e reenviar a versão corrigida.
