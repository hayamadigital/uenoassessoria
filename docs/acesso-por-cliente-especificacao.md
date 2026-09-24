# Especificação — Acesso a recursos por cliente

> **Revertido em 24/09/2026.** Decisão do usuário: liberar Estudos e Catálogo para todos os clientes autenticados, sem concessão individual nem toggle global. Nada disto foi deployado, então a reversão foi só no código (commits `8d7a73f`, `cd241d7`, `805bd04` seguem no histórico caso precise reativar). Este documento fica só como registro histórico da spec.

Data: 16/09/2026. **Status: implementado em código (17/09/2026), não deployado.**

Implementado: modelo de concessão (`acessos_clientes`, `app_config/acessos`, callables, auditoria, idempotência), regras do Firestore/Storage exigindo a concessão para ler `materiais`/`simulado_config`/`questoes`/`servicos`/`servico_variacoes` (não só esconder a aba), aba admin de Acessos, toggle global, hook e guards no mobile, filtro de `is_active` nas queries, e snapshot do serviço no `cliente_processos` (para o Catálogo não quebrar processos existentes ao revogar).

Pendente, por decisão do usuário em 17/09/2026: **mídia protegida com URL assinada de curta duração (seção 10)**. Hoje o Storage já exige a concessão para *iniciar* um download, mas um link já emitido via `getDownloadURL` continua válido indefinidamente mesmo após revogação (token fixo, não expira). Adiar isso é aceitável enquanto os módulos estão desligados e não há clientes reais — **fazer antes de ligar Estudos/Catálogo em produção**.

Também pendente: deploy (`firebase deploy`), migração/backfill (`scripts/backfill-is-active.mjs`, ainda não executado contra o projeto real), e ligar os módulos globalmente.

## 1. Objetivo e decisões de escopo

Disponibilizar uma experiência básica para novos cadastros e liberar recursos adicionais para clientes específicos, conforme o atendimento da Ueno. As mesmas regras devem valer durante a revisão Apple e depois da publicação.

A primeira implementação terá dois módulos controláveis: **Estudos** (simulados e materiais, juntos) e **Catálogo de serviços**. A liberação será manual, feita por administrador no painel web. Clientes continuam com o papel `cliente`; não criar papéis Firebase como `cliente_premium` ou `apple_reviewer`.

Cada módulo precisa estar disponível globalmente e liberado para aquele cliente. Não haverá liberação automática por pagamento, interesse informado no cadastro, status do processo, domínio de e-mail ou identificação de revisor.

A permissão do módulo Estudos dá acesso à biblioteca ativa desse módulo; a permissão do Catálogo dá acesso ao catálogo ativo. **Esta etapa não inclui seleção individual de materiais ou serviços por cliente**, nem vínculo automático entre serviço contratado e conteúdo. Se a Ueno precisar restringir itens dentro de um módulo, será necessário ampliar o modelo e as regras antes de anunciar essa segmentação.

## 2. Relação com as especificações existentes

- Substitui a proposta de liberação global para todos em [bloqueio-simulados-materiais-especificacao.md](bloqueio-simulados-materiais-especificacao.md). O controle global passa a ser uma condição necessária, mas insuficiente para liberar um cliente.
- Preserva [liberacao-cliente-especificacao.md](liberacao-cliente-especificacao.md): acordar/recusar processo continua sendo uma decisão operacional diferente da permissão de usar módulos.
- Preserva o cadastro de evento e sua seleção de interesses. Marcar “Transferência de habilitação” ou “Habilitação do zero” **não concede acesso** a Estudos ou ao Catálogo.
- Não altera a finalidade de `setUserActive`: suspensão/reativação da conta inteira é diferente de concessão de módulos.

## 3. Estado atual confirmado no código

- `apps/mobile/app/(cliente)/(tabs)/_layout.tsx` oculta Simulados e Serviços com `href: null`; mantém Início, FAQ e Perfil, além de Processos conforme a condição existente.
- `firestore.rules` permite leitura de `materiais`, `simulado_config`, `questoes` e `servicos` para usuários autenticados em vários caminhos. Ocultar o menu não impede leitura direta.
- `storage.rules` permite leitura autenticada de `materiais/**` e leitura pública de `materiais/public/**`. Existem imagens de questões em caminhos genéricos.
- A tela de simulados também resolve arquivos com `getDownloadURL`. URLs de download com token podem continuar funcionando sem passar pelas regras de acesso do aplicativo.
- `packages/firebase/src/queries/materiais.ts` concentra consultas de materiais, configurações de simulados (`simulado_config`, vínculo com questões) e resultados/progresso. `packages/firebase/src/queries/questoes.ts` concentra o CRUD de questões, opções, imagens e `questao_erro_reports`, incluindo a busca inversa de quais simulados usam uma questão. Não existe um arquivo separado `queries/simulados.ts`; qualquer ajuste de query para respeitar a concessão de Estudos precisa cobrir os dois arquivos, não só `materiais.ts`.
- Processos, contratos e agendamentos têm suas próprias regras de vínculo com o cliente. Não devem perder acesso por revogação do Catálogo ou de Estudos.

## 4. Matriz de experiência

| Usuário/estado | Atendimento, FAQ e perfil | Estudos | Catálogo | Processos e documentos próprios |
|---|---|---|---|---|
| Sem login | Cadastro, login, recuperação, privacidade e suporte público | Não | Não | Não |
| Cliente autenticado, e-mail não confirmado | Fluxo de confirmação e opções públicas já existentes | Não | Não | Mantém a exigência atual de verificação |
| Cliente básico, e-mail confirmado | Sim | Não | Não | Conforme os vínculos e regras existentes |
| Cliente com Estudos liberado | Sim | Sim, se disponível globalmente | Não, salvo liberação própria | Conforme os vínculos existentes |
| Cliente com Catálogo liberado | Sim | Não, salvo liberação própria | Sim, se disponível globalmente | Conforme os vínculos existentes |
| Cliente com ambos liberados | Sim | Sim, se disponível globalmente | Sim, se disponível globalmente | Conforme os vínculos existentes |
| Instrutor | Área de trabalho atual | Consulta necessária ao trabalho, sem editar permissões | Consulta necessária ao trabalho | Somente clientes/processos atribuídos |
| Administrador | Área administrativa | Gestão, mesmo com módulo suspenso para clientes | Gestão, mesmo com módulo suspenso para clientes | Conforme as permissões administrativas |
| Conta suspensa ou exclusão em processamento/concluída | Fluxo de conta indisponível; suporte e acompanhamento de exclusão permanecem acessíveis | Não | Não | Não |

Uma conta com exclusão apenas solicitada (`pending`) mantém a política de acesso atual até o processamento. Não bloquear o acompanhamento da exclusão por causa destes módulos.

## 5. Regra de autorização

Para um cliente acessar um módulo, **todas** estas condições precisam ser verdadeiras:

1. Sessão autenticada, papel `cliente`, e-mail confirmado e perfil existente/ativo.
2. Ausência de bloqueio por exclusão em processamento/concluída.
3. Configuração global do módulo explicitamente disponível.
4. Documento de acesso pertencente ao UID autenticado e ao cliente correto.
5. Concessão individual habilitada e sem vencimento ou com vencimento futuro.
6. Para um conteúdo específico, o registro precisa estar ativo e pertencer ao módulo solicitado.

Configuração, concessão ou campo ausente significa **não liberado**. Erro de rede, carregamento ou documento inválido não pode virar concessão. O papel administrativo permite gestão, mas não deve fazer uma “prévia de cliente” ignorar as condições individuais.

O relógio do servidor é a autoridade para vencimentos. No Firestore/Storage usar `request.time`; nas Functions, hora do servidor. Não usar a hora do celular como proteção.

## 6. Modelo de dados proposto

### Configuração global: `app_config/acessos`

| Campo | Tipo | Regra |
|---|---|---|
| `estudos_disponivel` | boolean | Padrão `false` |
| `catalogo_disponivel` | boolean | Padrão `false` |
| `revision` | integer | Incrementada pelo servidor |
| `updated_at` | Timestamp | Servidor |
| `updated_by` | UID | Administrador responsável |

Permitir `get` autenticado para clientes verificados e equipe. Não expor auditoria ou listagem de configurações ao público. Nenhum cliente escreve neste documento. Não reutilizar `simulados_liberado` como uma segunda fonte de decisão; caso já exista quando a implementação começar, migrar e descontinuar explicitamente.

A regra atual de `app_config/{id}` só libera `get` para `id == 'public'` ou administrador; qualquer outro `id`, incluindo `acessos`, hoje cai no `else` implícito (nega). Adicionar um ramo explícito para `id == 'acessos'` que libere `get` para cliente verificado e instrutor, sem alterar o comportamento de `public`.

### Concessões: `acessos_clientes/{uid}`

Usar o UID como chave permite consultar as concessões nas regras sem realizar uma busca por `profile_id`.

| Campo | Tipo | Regra |
|---|---|---|
| `cliente_id` | ID Firestore | Vínculo resolvido e validado no servidor |
| `estudos.habilitado` | boolean | Padrão `false` |
| `estudos.expira_em` | Timestamp ou null | `null` significa sem vencimento |
| `catalogo.habilitado` | boolean | Padrão `false` |
| `catalogo.expira_em` | Timestamp ou null | `null` significa sem vencimento |
| `revision` | integer | Controle de concorrência |
| `updated_at` | Timestamp | Servidor |
| `updated_by` | UID | Autor da última alteração |

O cliente pode ler apenas seu documento, sem listar os documentos de outros clientes. Administradores podem consultar as concessões; instrutores não precisam ler motivos nem editar acessos. Nenhum SDK cliente, inclusive o painel admin, grava diretamente concessões: as mudanças passam por callable.

### Auditoria: `acessos_clientes/{uid}/historico/{eventoId}`

Registro criado junto da concessão, com módulo, valores anteriores/novos, motivo obrigatório, administrador, timestamp e ID da operação. Somente administradores leem. Eventos de mudanças globais ficam em `app_config/acessos/historico/{eventoId}`, com as mesmas garantias.

Não guardar o motivo interno no documento legível pelo cliente. Não registrar tokens, senhas ou credenciais de demonstração. As rotinas de exclusão de conta devem remover as concessões e seu histórico; não arquivar automaticamente esse histórico como registro financeiro.

## 7. Backend e painel administrativo

### Callables propostas

- `setClienteModuleAccess`: recebe `cliente_id`, módulo, `habilitado`, `expira_em`, motivo, `expected_revision` e `operation_id`.
- `setClientModuleAvailability`: recebe módulo, disponibilidade global, motivo, `expected_revision` e `operation_id`.

Ambas validam papel admin, conta ativa, estado de exclusão, App Check conforme a política do ambiente, autenticação recente e rate limit. O UID alvo é resolvido a partir do cliente no servidor. Rejeitar cliente ausente, vínculo inconsistente/duplicado, módulo desconhecido, campos extras ou vencimento passado ao conceder acesso. Não aceitar `updated_by` enviado pelo chamador.

Alteração e evento de auditoria devem ser atômicos. Repetir o mesmo `operation_id` com o mesmo payload não duplica eventos; reutilizá-lo com outro payload falha. Revisão divergente retorna conflito e pede recarregamento da tela. Revogar um módulo não modifica o outro nem altera processos, parcelas ou o estado da conta.

### Clientes → detalhe → Acessos

Adicionar `ClienteAcessosTab.tsx`, integrada à navegação existente. Mostrar:

- Dois controles: “Estudos — simulados e materiais” e “Catálogo de serviços”.
- Estado efetivo: não liberado, liberado, vencido ou indisponível globalmente.
- Vencimento opcional, motivo obrigatório e botão Salvar.
- Quem alterou, quando e histórico de alterações.
- Quando globalmente suspenso, informar que a concessão individual pode ser preparada, mas ainda não dá acesso.

Salvar com confirmação de resultado do servidor; não apresentar sucesso otimista. Revogação mostra confirmação mencionando o módulo e que os dados já registrados serão preservados. A alteração global também exige confirmação e explica que afeta todos os clientes daquele módulo.

Adicionar a disponibilidade global em Configurações → Preferências. Não criar um botão “Modo Apple” nem uma concessão exclusiva para revisão.

## 8. Comportamento no mobile

Criar `useClienteAccess` ou equivalente, com assinatura das configurações globais e do documento de concessões do UID. Centralizar a decisão para menu, atalhos, páginas de detalhe e ações. Estados explícitos: carregando, permitido, negado e erro de consulta.

- Exibir a aba Simulados e os atalhos de estudo somente com Estudos efetivamente liberado. A área existente continua reunindo simulados e materiais.
- Exibir Serviços e seus atalhos somente com Catálogo efetivamente liberado.
- Novo cadastro continua vendo as opções de interesse, que são um formulário de atendimento, não o Catálogo protegido.
- Evitar o aparecimento momentâneo de abas restritas durante carregamento.
- Ao receber liberação com o app aberto, atualizar a navegação sem exigir reinstalação ou novo login.
- Se revogado enquanto a tela está aberta, interromper novas consultas, parar reprodução de mídia, limpar dados em cache do módulo e retornar ao Início com mensagem clara.
- Links diretos para catálogo, detalhe de serviço, material, simulado ou questão usam o mesmo guard. Mensagem: “Este recurso ainda não está liberado para sua conta. Fale com a equipe da Ueno.”
- Se o módulo estiver globalmente suspenso: “Este recurso está temporariamente indisponível.”
- Se falhar a verificação de acesso: informar o erro e oferecer Tentar novamente; não afirmar que o administrador revogou o acesso.
- Na primeira versão, recursos protegidos exigem verificação online. Não permitir abrir biblioteca em modo offline usando apenas uma permissão antiga em cache.

Meta de propagação: novas requisições ao servidor devem ser negadas após a gravação da revogação; a UI conectada deve refletir o evento em até 10 segundos em condições normais de rede. Atualizar também ao retornar do segundo plano e no instante previsto de expiração. Remover listeners e cache ao trocar de conta; nenhuma sessão pode herdar concessões ou conteúdo da anterior.

Se um simulado estiver aberto durante a revogação, bloquear continuação e novas gravações de resultado. Mostrar que a tentativa não foi concluída; preservar resultados anteriores no banco, sem apagá-los por revogação.

## 9. Firestore, Functions e consultas

Não copiar apenas os filtros de UI para este controle. Proteger toda a cadeia:

| Grupo | Caminhos/ações a cobrir |
|---|---|
| Estudos | `materiais`, `materiais/{id}/cards`, `categorias_material`, `simulado_config` e suas questões, `questoes` e subcoleções `opcoes`, `imagens`, `explicacao_imagens` |
| Participação em estudos | Criação de `simulado_resultados`, registros legados de resultado, `materiais_progresso` e relatos em `questao_erro_reports` |
| Catálogo | `servicos`, `servico_variacoes`, templates usados para novas solicitações e criação de processo iniciada pelo cliente |
| Permissões | `app_config/acessos`, `acessos_clientes` e históricos |

Resultados/progresso existentes continuam armazenados e visíveis à administração. Na primeira versão, a consulta pelo cliente depende do acesso a Estudos; eventual exportação dos próprios dados deve continuar disponível pelo atendimento, sem reabrir o banco de questões. Manter isolamento por proprietário em todas as leituras e escritas: possuir o módulo não permite acessar resultados de outra pessoa.

Materiais com `is_public: true` não devem ser uma exceção automática que permita acessar os módulos desativados. Nesta versão, toda a área Estudos exige a concessão. Conteúdo deliberadamente público fora dessa área precisa ser identificado separadamente e não anunciado como exclusivo. Isso substitui a exceção ampla da spec de bloqueio temporário.

As regras Firestore não filtram resultados. Ajustar queries para consultar apenas conteúdo ativo, incluindo `where('is_active', '==', true)` e demais restrições exigidas pelas regras; backfill de documentos antigos antes de depender desse campo. Criar os índices necessários e testar `get` e `list` separadamente. Categoria sem campo de publicação não recebe condição inventada: será legível pelo módulo, sem incluir conteúdo privado em sua descrição.

Cuidado com o nome do campo: `Servico` usa `is_active` (com fallback de leitura do campo legado `ativo`); `ServicoVariacao` usa **`ativo`**, não tem `is_active`, e hoje é filtrado só em memória (`.filter` no cliente), não por `where()`. `SimuladoConfig` e `Questao` não têm campo de ativo/publicado próprio — a ativação de um simulado é a do `Material` cujo id é a chave do documento (`simulado_config/{materialId}`); para `Questao`, ver o parágrafo sobre questões compartilhadas abaixo. Verificar o campo real de cada coleção antes de escrever `where()`, em vez de assumir `is_active` universalmente.

Questões compartilhadas: a concessão de Estudos nesta versão cobre a biblioteca publicada do módulo. Garantir que questões ainda em rascunho não sejam expostas; se não houver marcador confiável de publicação, criar uma projeção de questões publicadas para o consumo cliente. Nunca liberar todo o banco administrativo apenas por não haver como expressar a relação entre uma questão e seus simulados nas regras.

As Functions usam Admin SDK e ignoram Security Rules. Qualquer função que entregue conteúdo, mídia ou execute uma ação protegida precisa validar a concessão no servidor. Identificadores, papel ou flags enviados pelo cliente não são autoridade.

### Preservar processos existentes ao bloquear o Catálogo

Telas de processos, contratos e agendamentos podem consultar `servicos` para obter nomes e informações do serviço já vinculado. Antes de restringir essa coleção, inventariar essas dependências. Fornecer um snapshot mínimo no processo ou endpoint autorizado pelo vínculo com o processo, sem liberar a listagem do catálogo inteiro. O cliente deve continuar acompanhando serviços já contratados e seus documentos após perder a permissão de iniciar novas solicitações.

## 10. Arquivos e links de mídia

A entrega de conteúdo protegido precisa deixar de depender de URLs públicas permanentes:

1. Inventariar PDFs, vídeos, cards e imagens de questões, inclusive arquivos em `materiais/public/**`, `imagens/**` e URLs externas.
2. Classificar o que é realmente público e o que pertence a Estudos. Não alterar avatares, documentos pessoais ou comprovantes por engano.
3. Armazenar conteúdo protegido em caminhos que identifiquem seu módulo/recurso. Remover permissões públicas e tokens antigos de download desses arquivos após migrar os consumidores.
4. Usar download autenticado quando suportado pelo consumidor. Para player/visualizador que precise de URL, fornecer uma callable autorizada que emite URL assinada de curta duração, no máximo 60 segundos, e nunca persisti-la como endereço público do material.
5. A callable aceita somente um identificador de recurso cadastrado e resolve o objeto no servidor; não assina caminhos arbitrários fornecidos pelo cliente. Renovação exige nova verificação de acesso. Testar busca e retomada de vídeo após expiração.
6. Revogação bloqueia imediatamente a emissão de novas URLs. Uma URL já emitida pode funcionar até expirar; conteúdo já baixado ou em buffer não pode ser recuperado remotamente. A UI deve parar a reprodução ao receber a revogação. Não prometer bloqueio instantâneo de cópias existentes.
7. Remover arquivos temporários do módulo no logout/revogação quando estiverem sob controle do app. Não registrar URLs assinadas em logs ou analytics.

URLs externas que permanecem públicas não podem ser consideradas protegidas pelo modelo. Migrá-las para entrega controlada ou classificá-las explicitamente como conteúdo público antes de liberar o módulo. Cobrir permissões Storage e caminhos sobrepostos: um `allow read` amplo em outro match anula uma restrição mais específica.

## 11. Revisão Apple e apresentação na loja

- A conta demonstrativa é uma conta `cliente` comum, com dados fictícios e concessões reais configuradas pelo mesmo painel utilizado para clientes.
- Fornecer nas notas da revisão uma conta básica e uma liberada, quando necessário para avaliar ambos os estados. Não colocar credenciais em arquivos versionados.
- Manter backend e contas de revisão funcionais durante a análise; não vincular concessões ao período de revisão nem desativá-las automaticamente quando houver aprovação.
- Explicar quais módulos dependem de liberação pela Ueno, como um cliente obtém acesso e quais funções cada conta demonstrativa permite testar.
- As imagens precisam mostrar funções reais, testadas e disponíveis a clientes elegíveis desde o lançamento. Nas imagens de Estudos/Catálogo e na descrição, indicar claramente a condição de acesso.
- Texto possível: “Recursos disponíveis conforme o acesso liberado para sua conta pela Ueno Assessoria.”
- Se o módulo continuar sem clientes reais elegíveis ou ainda estiver incompleto, remover suas imagens da primeira versão. Não usar uma conta de revisão para simular uma oferta inexistente.
- Não detectar revisor, localização da Apple, IP, nome de conta ou ambiente de revisão para mudar a experiência.
- Esta spec não define cobrança por conteúdo digital. Antes de vincular Estudos a pagamento ou a pacote pago, avaliar o modelo comercial à luz das regras de compras da Apple; concessão manual não substitui as exigências aplicáveis a compras no app.

Referência: [App Review Guidelines, 2.1, 2.3 e 2.3.1](https://developer.apple.com/app-store/review/guidelines/), consultadas em 16/09/2026. A especificação não garante aprovação pela Apple.

## 12. Plano de implementação e publicação

1. Inventariar rotas, consumidores de serviços e URLs de mídia; confirmar classificação de conteúdo ativo/rascunho. Resolver dependências de processos antes de bloquear o catálogo.
2. Criar tipos, normalizadores, fixtures e helpers de autorização; testar as condições permitidas e negadas.
3. Implementar callables, auditoria, revisão concorrente e entrega autorizada de mídia. Estender exclusão de conta para os novos documentos.
4. Implementar controles do admin, hook do mobile, guards de rotas e limpeza de cache, ainda com módulos globais desligados.
5. Testar o conjunto integrado nos emuladores, incluindo Firestore, Storage e funções. Testar clientes básico, Estudos, Catálogo, ambos e equipe.
6. Executar migração em dry-run: listar `materiais` e `servicos` sem `is_active`, `servico_variacoes` sem `ativo` (não `is_active`, ver seção 9), referências de mídia pública e clientes candidatos. `simulado_config` e `questoes` não entram nessa checagem — não têm campo próprio de ativo/publicado. Revisar o relatório antes da aplicação. Não conceder acesso em lote por inferência do status de processo.
7. Publicar backend/índices e adaptações de consumidores. Aguardar índices prontos. Publicar regras restritivas e migração de mídia em janela coordenada: versões antigas podem perder acesso aos módulos e não devem continuar com acesso amplo como solução de compatibilidade.
8. Publicar painel e novo build mobile no TestFlight. O build 9 não contém este modelo. Validar cadastro, concessão/revogação, mídia, processo existente e exclusão em iPhone físico.
9. Configurar concessões explícitas para clientes elegíveis e contas demonstrativas. Só ligar globalmente um módulo depois de validar seu fluxo completo.
10. Atualizar screenshots, descrição e notas; submeter a versão final com as mesmas regras que permanecerão em produção.

Rollback: desligar a disponibilidade global do módulo afetado e corrigir o problema mantendo o bloqueio no servidor. Não restaurar regras abertas ou habilitar usuários indiscriminadamente para fazer uma tela voltar a funcionar.

## 13. Critérios de aceite

- [ ] Novo cadastro não recebe Estudos/Catálogo, mesmo selecionando todos os interesses.
- [ ] Combinações básico, só Estudos, só Catálogo e ambos exibem exatamente as funções concedidas.
- [ ] Ausência de configuração/concessão, conta suspensa, e-mail não confirmado, exclusão em processamento ou concluída e vencimento negam acesso.
- [ ] Cliente e instrutor não conseguem editar concessões, motivos ou disponibilidade global via SDK/callable.
- [ ] Concessões e revogações geram auditoria atômica; repetição de operação não duplica eventos; edição concorrente não sobrescreve silenciosamente.
- [ ] Revogar Estudos não revoga Catálogo e vice-versa; desligar globalmente um módulo afeta todos os clientes, mas mantém a gestão administrativa.
- [ ] Cliente sem acesso não consegue ler conteúdo, questões, subcoleções ou arquivos por ID, URL ou deep link.
- [ ] Consultas de listagem funcionam com as regras e índices novos; conteúdos inativos/rascunhos não aparecem nem são legíveis diretamente.
- [ ] URLs permanentes antigas de arquivos restritos deixam de conceder acesso; URLs temporárias respeitam o prazo documentado e não são renovadas após revogação.
- [ ] Em rede normal, liberação/revogação aparece no app aberto em até 10 segundos; retorno do segundo plano, expiração e troca de conta atualizam o estado.
- [ ] Falha de rede mostra erro recuperável e não concede acesso offline com cache antigo.
- [ ] Revogar durante simulado/vídeo interrompe a experiência protegida sem apagar resultados anteriores nem permitir novas gravações indevidas.
- [ ] Um cliente nunca lê histórico, progresso, resultados ou concessões de outro cliente.
- [ ] Processo/contrato/agendamento próprio continua utilizável mesmo sem Catálogo; nova solicitação protegida não pode ser criada por chamada direta sem concessão.
- [ ] Exclusão de conta remove as novas concessões e históricos associados sem afetar outro cliente.
- [ ] Conta Apple e cliente real com as mesmas concessões têm a mesma experiência; nenhuma regra muda automaticamente após aprovação.
- [ ] Screenshots e descrição correspondem ao build e às condições reais de acesso.

## 14. Arquivos principais

Existentes a revisar: `packages/firebase/src/types.ts`, `packages/firebase/src/queries/materiais.ts`, queries de serviços/processos, `functions/src/index.ts`, `functions/src/account-deletion.ts`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `apps/web/src/pages/clientes/ClienteDetailPage.tsx`, rotas web, `PreferenciasTab.tsx`, layout de abas do cliente e telas de Início, Simulados, Catálogo, detalhes de serviço e material.

Novos previstos: queries/assinaturas de acesso em `packages/firebase`, helper de autorização no backend, `ClienteAcessosTab.tsx`, hook/guard mobile e testes unitários/de integração do modelo. Escolher os nomes finais conforme o padrão do repositório; os nomes propostos aqui não indicam arquivos já existentes.
