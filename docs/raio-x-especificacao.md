# Raio-X da Especificação — UENO Assessoria

Confronto ponto a ponto entre a especificação enviada pelo dono do app e o código real do repositório (mobile, web admin, Cloud Functions e Firestore), com caminho de arquivo e fluxo de teste para cada item.

Levantamento feito lendo o código-fonte em 2026-09-15, com uma segunda passagem no mesmo dia incorporando o retorno do **Alexandre** (dono da UENO) sobre a lista original.

**Legenda**
- ✅ **Já existe** — comportamento confirmado no código correspondendo à especificação (5 itens)
- 🟡 **É melhoria** — a funcionalidade já existe, mas com lacuna concreta e pontual (13 itens)
- 🔴 **Precisa implementar** — nenhuma estrutura de dados ou tela correspondente foi encontrada (14 itens)
- ⚪ **Desconsiderado** — item descartado ou substituído por decisão do Alexandre (3 itens)

**Atualização (retorno do Alexandre):** preço por cidade agora tem valores e regras reais (item 5); itens **6, 21 e 22** foram descartados; item **19** muda de "ajuste de regra" para bloqueio total imediato; item **26** perde a exigência de tela dedicada; toda a trilha do instrutor (**29, 30, 31, 36, 37, 38**) fica para uma **Fase 2** — confirmada como valiosa, mas não prioritária agora.

---

## A · Primeiro contato e contratação

### 3. Cadastro básico no primeiro acesso — 🟡 É melhoria
A tela de registro e a função `selfRegister` já coletam nome, e-mail, senha, data de nascimento, província e cidade. Faltam três campos da especificação: **telefone** (existe no perfil, mas não é pedido no cadastro inicial), **qual serviço tem interesse** e **como conheceu a UENO** — nenhum dos dois existe no modelo de dados nem no formulário.
- Arquivos: `apps/mobile/app/(auth)/register.tsx`, `functions/src/index.ts:73 selfRegister`, `packages/utils/src/validators.ts:25 registerSchema`
- Testar: Abrir o app → "Novo acesso" → conferir que o formulário pede só os 6 campos atuais.

### 4. Área de serviços — sub-opções, seleção múltipla e requisitos — 🟡 É melhoria
A tela de serviço já usa variações cadastráveis (Carro AT/MT, Moto 50/400/1000cc etc.) e mostra chips selecionáveis. Dois gaps: a seleção é **única**; e não existe bloco de "quem pode / requisitos / quem não pode" antes do wizard.
- Arquivos: `apps/mobile/app/(cliente)/servicos/[id].tsx`
- Testar: Tab Serviços → abrir um serviço com variações → notar que ao trocar de chip a seleção anterior é substituída.

### 5. Valor automático de acordo com a cidade — 🔴 Precisa implementar
O serviço só tem preço fixo (`preco_jpy`) ou faixa (`preco_min_jpy`/`preco_max_jpy`). Não existe relação entre cidade, centro de exame (menkyou center) e preço.

> **Decisão do Alexandre:** não é só "preço por cidade" — é preço por **centro de exame + tipo de transmissão**, com elegibilidade por cidade. Regra em vigor desde junho de 2026:

| Menkyou center | Automático (AT) | Manual (MT) | Cidades com direito a escolher AT ou MT |
|---|---|---|---|
| Shizuoka | ¥60.000 | ¥75.000 | Makinohara, Fujieda, Yoshida, Shimada, Yaizu, Shizuoka-shi |
| Hamakita | ¥70.000 | ¥85.000 | — |

**Regras adicionais:** fora das 6 cidades listadas, quem ainda assim quiser fazer em Shizuoka só pode **manual** — Shizuoka é o único centro que aplica teste prático com carro manual, os demais centros só fazem automático. Busca (transporte) inclusa de Shimizu até Iwata; fora dessa faixa, o cliente se desloca até a estação de Shizuoka por conta própria. Os mesmos valores valem para clientes filipinos e do Sri Lanka, sem diferenciação por nacionalidade.
- Arquivos: `packages/firebase/src/types.ts — Servico, ServicoVariacao`

### 6. Contratação — forma de pagamento e parcelas — ⚪ Desconsiderado
> **Decisão do Alexandre:** "Pode desconsiderar. Eu mesmo coloco as parcelas manualmente — não precisa dar a opção do cliente escolher no aplicativo." O wizard de contratação do cliente segue só até o envio de documentos; o plano financeiro continua sendo montado manualmente pela UENO no admin, como já é hoje.
- Arquivos: `apps/mobile/app/(cliente)/servicos/[id].tsx`, `apps/web/src/pages/financeiro/FinanceiroPage.tsx`

### 7. Pagamentos — cliente só visualiza, UENO confirma — ✅ Já existe
A tela financeira do cliente é somente leitura: mostra pagamento e parcelas com status (Pendente/Pago/Atrasado/Cancelado/Estornado) e não tem nenhuma ação de "marcar como pago". No admin, é a UENO quem clica em "Pago".
- Arquivos: `apps/mobile/app/(cliente)/financeiro/index.tsx`, `apps/web/src/pages/financeiro/FinanceiroPage.tsx:395`
- Testar: Cliente: tab Processo → Financeiro (visão). Admin: Financeiro → botão "Pago".

### 8. Multa por atraso (¥100/dia) + avisos de vencimento — 🔴 Precisa implementar
Busca ampla por "multa", "atraso" (cálculo) e "juros" não encontrou nenhum código de cálculo. O status `atrasado` existe como rótulo na parcela, mas nada recalcula o valor.

> **Decisão do Alexandre:** confirmado como prioridade — quer o cálculo automático da multa **e** avisos: um lembrete perto do vencimento e outro quando a parcela já está atrasada, "para a pessoa não esquecer os pagamentos". Conecta direto com os lembretes automáticos do item 13.
- Arquivos: `packages/firebase/src/types.ts — Pagamento, Parcela`

### 9. Liberação do cliente pela UENO — 🟡 É melhoria
O conceito existe: todo cliente novo nasce com `status_processo: 'prospect'`, e cada processo evolui de `analise` para `ativo`. Falta uma ação administrativa explícita de "aprovar cadastro", separada da simples troca de status.
- Arquivos: `functions/src/index.ts:112 selfRegister`, `functions/src/index.ts:345 setUserActive`

---

## B · App do cliente no dia a dia

### 10. Home do cliente como painel do processo — 🟡 É melhoria
A Home já tem o essencial: saudação por nome, card "Processo ativo" com etapa atual, sino de notificações. Gaps: só mostra **um** processo mesmo com vários serviços simultâneos; "próxima etapa"/"próximo compromisso" não aparecem juntos no mesmo card.
- Arquivos: `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx:68,241-314`
- Testar: Login como cliente com processo ativo/análise → tab Início.

### 11. Etapas do processo — resumo + "ver processo completo" — 🟡 É melhoria
A tela de detalhe do processo já mostra a timeline completa. Falta a camada de resumo antes da lista inteira, com botão separado "ver processo completo".
- Arquivos: `apps/mobile/app/(cliente)/(tabs)/processos/[id].tsx:195-220`
- Testar: Home → "Ver detalhes" no card do processo ativo.

### 12. Documentos e taxas por compromisso — 🔴 Precisa implementar
`ProcessoEtapa` não tem campos de "documentos necessários" nem "taxa". A tela de documentos do cliente é só um histórico de uploads.

> **Decisão do Alexandre:** confirmado, com um caso concreto: muitos clientes renovam o visto e esquecem de levar o Jūminhyō atualizado no dia. Pede aviso específico de vencimento do visto — ou avisar quando a data de retorno agendada no menkyou center cair depois do visto já vencido. É uma checagem cruzada entre validade do visto e data do próximo compromisso, não só uma checklist estática.
- Arquivos: `packages/firebase/src/queries/etapas.ts`, `apps/mobile/app/(cliente)/documentos/index.tsx`

### 13. Notificações automáticas — 🟡 É melhoria
A infraestrutura existe (`sendNotification` + push via Expo), mas falta o gatilho **automático** (2 dias antes, ou quando a UENO edita algo).

> **Decisão do Alexandre:** prioridade confirmada para dois lembretes automáticos específicos: aviso sobre a prova e aviso sobre pagamento — mesmo gatilho que o item 8 precisa.
- Arquivos: `functions/src/index.ts:485 sendNotification`, `functions/src/index.ts:667 purgeExpiredRetainedAccounts (único onSchedule existente)`

### 14. Calendário de aulas — cliente escolhe só a data — 🔴 Precisa implementar
Não existe esse fluxo. O agendamento nasce com data **e** hora completas desde o início.
- Arquivos: `apps/web/src/pages/agendamentos/NovoAgendamentoPage.tsx`, `apps/mobile/app/(cliente)/agenda/index.tsx`

### 15. Horário definido depois pela UENO — 🔴 Precisa implementar
Consequência do item 14: sem o estado "data marcada, horário pendente", não existe a notificação de "horário confirmado".
- Arquivos: `packages/firebase/src/types.ts — Agendamento`

### 16. Pagamento da aula no dia — 🔴 Precisa implementar
`Agendamento` não tem campo de valor nem status de pagamento — só `local`, `notas_instrutor`, `notas_admin`.
- Arquivos: `packages/firebase/src/types.ts:176-195`

### 17. Cancelamento com aviso de regra + aceite — 🔴 Precisa implementar
Não há tela de cancelamento de processo ou aula com aviso de taxa e checkbox de concordância — só botões genéricos "Cancelar" de modais.

### 18. Contratar novos serviços sendo cliente ativo — ✅ Já existe
A tab Serviços continua visível mesmo com processo ativo. Contratar outro serviço cria um novo processo independente.
- Arquivos: `apps/mobile/app/(cliente)/(tabs)/_layout.tsx`
- Testar: Cliente com processo ativo → tab Serviços → abrir outro serviço → contratar.

### 19. Simulados e materiais — bloqueio total por enquanto — 🔴 Ação necessária
O bloqueio já existe, mas hoje libera com o processo em `ativo` **ou** `analise` — antes da aprovação formal.

> **Decisão do Alexandre:** mudança de plano — "a princípio vamos bloquear até fazermos todos os testes, e depois decidimos quem pode ou não acessar esses materiais." Não é mais um ajuste de regra, é bloquear o acesso por completo até decisão manual da UENO.
- Arquivos: `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx:100`, `apps/mobile/app/(cliente)/(tabs)/simulados/index.tsx:284`

### 33. Estrutura do menu do cliente — ✅ Já existe
Tabs atuais: Início, Simulados, Processos, Serviços, Perfil + sino de notificações. Bate com a especificação.
- Arquivos: `apps/mobile/app/(cliente)/(tabs)/_layout.tsx:130-139`

### 34–35. Princípio "o que o cliente precisa fazer agora" — 🟡 É melhoria
A Home com processo ativo já é mais objetiva que o catálogo genérico, mas ainda acumula acesso rápido, materiais recomendados e FAQ na mesma tela.
- Arquivos: `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx`

---

## C · Sistema administrativo

### 20. Painel principal — 🟡 É melhoria
O Dashboard já existe com métricas reais. Faltam: contagem de "hoje" por tipo, resumo financeiro do mês e alertas dedicados.
- Arquivos: `apps/web/src/pages/dashboard/DashboardPage.tsx`
- Testar: Login admin web → Dashboard (rota raiz).

### 21. Clientes com filtros por Serviço, Categoria e Etapa — ⚪ Desconsiderado
> **Decisão do Alexandre:** "Pode desconsiderar esses filtros, ele só colocou no geral" — não era um pedido real.
- Arquivos: `apps/web/src/pages/clientes/ClientesPage.tsx:66-117`

### 22. Filtros combinados — ⚪ Desconsiderado
> **Decisão do Alexandre:** mesma decisão do item 21 — descartado por enquanto.

### 23. Cadastro completo do cliente — ✅ Já existe
A ficha do cliente já tem todas as seções pedidas como abas próprias.
- Arquivos: `apps/web/src/pages/clientes/ClienteDetailPage.tsx + tabs/*.tsx`
- Testar: Clientes → abrir qualquer cliente → navegar pelas abas.

### 24. Agenda administrativa — 🟡 É melhoria
No mobile admin já existe calendário por semana. No web admin, é uma tabela plana filtrável — não um calendário clicável.
- Arquivos: `apps/mobile/app/(admin)/(tabs)/agenda/index.tsx:97-285`, `apps/web/src/pages/agendamentos/AgendamentosPage.tsx`

### 25. Financeiro — a receber / recebido / atrasado — ✅ Já existe
KPIs de "Pago no mês", "Pendente", "Cancelado" e total de cobranças, com seletor de mês. Único ponto solto: sem card de "Atrasado" separado.
- Arquivos: `apps/web/src/pages/financeiro/FinanceiroPage.tsx:310-332`
- Testar: Financeiro → trocar o seletor de mês no topo.

### 26. Pagamentos atrasados — 🟡 É melhoria
Não existe contagem automática de dias de atraso nem multa somada — depende do cálculo do item 8.

> **Decisão do Alexandre:** escopo reduzido — "não precisa de uma tela específica, só eu saber quem são os atrasados e como o sistema está cobrando." Basta aparecer em algum lugar que ele já usa (Dashboard ou lista de Clientes), sem tela nova dedicada.

### 27. Notificações administrativas segmentadas — 🟡 É melhoria
Os "Avisos" já permitem broadcast ou filtro por serviço. Falta segmentar por etapa específica e cliente específico.
- Arquivos: `apps/web/src/pages/avisos/AvisoFormPage.tsx:53-90`

### 28. Usuários e permissões (Administrador / Atendimento / Instrutor) — 🔴 Precisa implementar
Hoje só existem `admin` e `instrutor`. Não existe o papel **Atendimento** nem controle granular de visibilidade financeira.
- Arquivos: `apps/web/src/pages/configuracoes/tabs/UsuariosTab.tsx:36-44`, `firestore.rules:18,22`

---

## D · Instrutor, financeiro e indicações (Fase 2)

> **Decisão do Alexandre:** toda a trilha do instrutor (29, 30, 31, 36, 37, 38) fica para depois — não é descartada, entra numa Fase 2. Motivação dele: "seria bom para padronizar as aulas e eu conseguir parar de dar aula."

### 29. Relatório de aula com checkboxes técnicos — 🔴 Precisa implementar · Fase 2
"Avaliações" hoje é feedback de satisfação do cliente, sem relação com desempenho técnico. Não existe estrutura de checkboxes (Kakunin, curvas, S, L, alinhamento etc.) nem estrelas por aula.
- Arquivos: `packages/firebase/src/types.ts:396-409 Avaliacao`, `apps/mobile/app/(admin)/(tabs)/modulos/avaliacoes/index.tsx`

### 30. Pontos de atenção no perfil do aluno — 🔴 Precisa implementar · Fase 2
Nenhum vestígio no código. Depende do item 29.

### 31. Histórico de provas (aprovado/reprovado + motivo) — 🟡 É melhoria · Fase 2
Existe base reaproveitável: `ClienteHistorico` (texto livre). Falta estruturar tipo de prova, resultado e motivo.
- Arquivos: `packages/firebase/src/types.ts:562-569 ClienteHistorico`, `apps/web/src/pages/clientes/tabs/ClienteHistoricoTab.tsx`

### 32. Histórico completo evolutivo do cliente — 🟡 É melhoria
A aba Histórico já renderiza uma timeline cronológica. Falta tipagem por categoria (aula/prova) e cruzamento entre prova reprovada e treino seguinte.

> **Decisão do Alexandre:** "histórico evolutivo é bom para todos termos um controle" — confirmado como valioso, sem ressalva. Como se alimenta dos registros de aula/prova dos itens 29/31, a implementação prática anda junto da Fase 2, mesmo sendo útil desde já.
- Arquivos: `apps/web/src/pages/clientes/tabs/ClienteHistoricoTab.tsx`

### 36. "Meu Financeiro" do instrutor — 🔴 Precisa implementar · Fase 2
A área do instrutor tem só Agenda, Clientes, Hoje, Notificações e Perfil básico. Nenhuma tela ou query de financeiro do instrutor existe.
- Arquivos: `apps/mobile/app/(instrutor)/ — perfil/index.tsx:1-22`

### 37. Indicações e comissões — 🔴 Precisa implementar · Fase 2
Nenhum resultado no repositório para "indicação", "comissão" ou "origem do cliente".

### 38. Indicação editável por serviço + histórico de alterações — 🔴 Precisa implementar · Fase 2
Depende inteiramente do item 37 existir primeiro.

---

*Nota: os pontos 1-2 da especificação (objetivo do app e diagnóstico do problema atual) são contexto estratégico, não funcionalidades, por isso não entram nesta tabela.*
