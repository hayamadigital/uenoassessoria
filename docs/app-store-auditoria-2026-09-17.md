# Auditoria de prontidão para a App Store — 17/09/2026

**Conclusão: ainda não submeter a versão final com o modelo de acesso por cliente.** O commit `8d7a73f` implementa parte importante da spec, mas precisa de correções e publicação coordenada. Esta auditoria não fez deploy, não criou contas e não enviou o app para revisão pública.

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
