# Especificação — Notificações Administrativas Segmentadas

Referência: `docs/raio-x-especificacao.md`, item 27 (🟡 melhoria).

Contexto: os "Avisos" já cobrem comunicados amplos (feriados, promoções, mudanças no Menkyou Center) com segmentação por tipo de serviço. Falta o caso "preciso avisar só quem está na etapa X" ou "preciso avisar só este cliente específico", hoje só possível chamando `sendNotification` manualmente fora de qualquer tela do admin.

---

## 1. O que já existe e o que falta

Levantamento em `apps/web/src/pages/avisos/AvisoFormPage.tsx` e `functions/src/index.ts:485` (`sendNotification`).

| Peça | Status |
|---|---|
| Criar aviso com título, tipo, descrição, imagens, período de publicação | ✅ já existe (`AvisoFormPage.tsx`) |
| Segmentar por "todos" (broadcast) | ✅ já existe (`broadcast`, linha 53) |
| Segmentar por tipo de processo/serviço (multi-seleção) | ✅ já existe (`tiposProcesso`, linhas 54, 426-444) |
| Segmentar por etapa específica do processo (ex. "aguardando teste de volante") | 🔴 não existe |
| Segmentar por cliente específico | 🔴 não existe — só via `sendNotification` chamada manualmente, sem tela |
| Combinar filtros (ex. Transferência + aguardando teste de volante) | 🔴 não existe |
| Tela unificada "escolher destinatário" | 🔴 não existe — hoje são dois mecanismos desconectados (Avisos vs. `sendNotification` avulsa) |

`Aviso` é pensado para comunicados persistentes (banner, carrossel, período de publicação/encerramento) — já é o formato certo para "todos" e "por serviço". Notificações pontuais e segmentadas (etapa, cliente) usam a coleção `notificacoes` + `sendNotification`, que é mais leve (push + registro, sem banner/imagens). Esta spec não funde os dois modelos — mantém `Aviso` como está e constrói a segmentação fina em cima de `notificacoes`/`sendNotification`, com uma tela própria.

---

## 2. Fluxo do usuário (equipe UENO)

```
Equipe abre /notificacoes (hoje é um stub "Em desenvolvimento...")
  → clica "Nova notificação"
  → escreve título + mensagem
  → escolhe o destinatário:
      ○ Todos os clientes
      ○ Por serviço (multi-seleção, mesma lista de tipos_processo já usada em Avisos)
      ○ Por etapa específica (ex. "Prova escrita", "Aguardando entrevista" — lista vem de
        ProcessoEtapa.nome distintos já cadastrados)
      ○ Cliente específico (busca por nome, mesmo padrão de busca já usado em /clientes)
      ○ Combinação: serviço + etapa (ex. Transferência + Aguardando teste de volante)
  → pré-visualização mostra "Vai para N cliente(s)"
  → confirma envio
      → grava um doc em `notificacoes` por destinatário resolvido
      → dispara push via Expo (mesmo mecanismo de sendNotification)
```

---

## 3. Modelo de dados

### 3.1 Função de resolução de destinatários (nova, em `functions/src/index.ts` ou módulo próprio)

```ts
type DestinatarioFiltro =
  | { tipo: 'todos' }
  | { tipo: 'servico'; servico_ids: string[] }
  | { tipo: 'etapa'; etapa_nome: string; servico_ids?: string[] } // servico_ids opcional para combinar
  | { tipo: 'cliente'; cliente_id: string }

// Resolve o filtro para uma lista de profile_id (destinatário de sendNotification)
async function resolveDestinatarios(filtro: DestinatarioFiltro): Promise<string[]>
```

- `'todos'`: todos os `profile_id` de clientes ativos (mesma base que `Aviso.broadcast` já usa implicitamente).
- `'servico'`: `cliente_processos` com `servico_id in servico_ids` e `status === 'ativo'` → `cliente_id` → `profile_id`.
- `'etapa'`: `processo_etapas` com `nome === etapa_nome` (e, se `servico_ids` vier junto, filtra também pelo processo pai ser de um desses serviços) e status relevante (ex. `em_andamento` ou `pendente`, a definir com a UENO caso a caso) → `cliente_id` do processo pai → `profile_id`.
- `'cliente'`: só o `profile_id` daquele cliente.

### 3.2 Callable Function nova

```ts
export const sendSegmentedNotification = onCall(async (request) => {
  // valida isAdmin(), monta DestinatarioFiltro a partir de request.data,
  // chama resolveDestinatarios, e para cada profile_id chama a mesma lógica
  // interna já usada por sendNotification (grava em `notificacoes` + push Expo)
})
```

Reaproveita a lógica de push/gravação já existente em `sendNotification` (`functions/src/index.ts:485`) — não duplica o envio, só adiciona a camada de resolução de destinatários antes de chamá-la em loop.

---

## 4. Tela web

Novo arquivo `apps/web/src/pages/notificacoes/NovaNotificacaoPage.tsx` (substitui o stub atual de `/notificacoes`), reaproveitando:
- O padrão de segmentação por serviço já existente em `AvisoFormPage.tsx:414-445` (checkboxes de `tiposProcesso`).
- A lista de clientes/busca já existente em `apps/web/src/pages/clientes/ClientesPage.tsx` para o modo "cliente específico".
- Um `<select>` de etapas distintas — pode ser hardcoded na primeira versão (lista fixa das etapas padrão: Documentos, Entrada, Entrevista, Prova escrita, Aula, Teste de volante, Aprovado, Finalizado, já usadas em outras partes do sistema) em vez de buscar dinamicamente todas as etapas cadastradas.

`/notificacoes` também deve continuar listando o histórico de notificações já enviadas (contagem de destinatários, data, quem enviou) — é a página que hoje é só um stub, então essa listagem é nova também, mas simples (query em `notificacoes` agrupada por `titulo`+`created_at` do envio em lote).

---

## 5. Ordem sugerida de implementação

1. `resolveDestinatarios` + `sendSegmentedNotification` nas Cloud Functions, com testes cobrindo os 4 tipos de filtro.
2. Tela `NovaNotificacaoPage.tsx` com os 4 modos de segmentação.
3. Listagem de histórico de envios em `/notificacoes`.
4. Validar contagem de destinatários antes de confirmar o envio (evitar mandar para 0 pessoas por engano — mostrar erro claro em vez de enviar silenciosamente).

---

## 6. Critérios de aceite

- [ ] Enviar para "todos" alcança todos os clientes ativos.
- [ ] Enviar por serviço alcança só clientes com processo ativo naquele(s) serviço(s).
- [ ] Enviar por etapa alcança só clientes com processo numa etapa com aquele nome.
- [ ] Combinar serviço + etapa restringe corretamente (interseção, não união).
- [ ] Enviar para "cliente específico" alcança só aquele cliente.
- [ ] A pré-visualização de "N cliente(s)" bate com quem de fato recebe a notificação.
- [ ] `/notificacoes` deixa de ser um stub e mostra o histórico de envios.

---

## 7. Fora de escopo agora

- Templates de mensagem reutilizáveis.
- Agendamento de envio futuro (a notificação sai na hora, não numa data programada — isso é diferente do agendamento automático de lembretes de `docs/multa-lembretes-especificacao.md`, que é orientado por evento/data do próprio compromisso, não por escolha manual do admin).
- Métricas de leitura/engajamento além do campo `lida`/`lida_em` que já existe em `notificacoes`.
