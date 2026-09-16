# Especificação — Home e Detalhe do Processo (Múltiplos Processos + Resumo)

Cobre os itens 10, 11 e 34-35 do `docs/raio-x-especificacao.md`. Sem decisão explícita do Alexandre sobre estes três ainda — são melhorias já mapeadas no raio-x original, mantidas com classificação 🟡.

---

## 1. O que já existe e o que falta

| Peça | Estado atual | Gap |
|---|---|---|
| Card de processo na Home | `activeProcesso = processos?.find((p) => p.status === 'ativo' \|\| p.status === 'analise')` — pega só o **primeiro** processo que bate, mesmo se o cliente tiver mais de um | 🔴 precisa virar uma lista, um card por processo |
| "Próximo compromisso" no card da Home | `proxAgendamento` é calculado sobre **todos** os agendamentos do cliente (`listAgendamentos(db, { cliente_id })`), sem filtrar por serviço/processo | 🔴 se o cliente tem 2 processos, o compromisso mostrado pode ser do processo errado |
| "Próxima etapa" | Não existe — só há `etapaAtual` (primeira `em_andamento` ou `pendente`) | 🔴 falta calcular a etapa seguinte na sequência |
| Tela de detalhe do processo (`processos/[id].tsx`) | Abre direto na seção "Etapas" com a timeline **completa** (`s.timeline`, linha ~198) | 🔴 falta uma camada de resumo antes, com botão "Ver processo completo" |
| Princípio "o que fazer agora" (itens 34-35) | Home com processo ativo já prioriza o hero card, mas ainda mostra Acesso Rápido + Próximo Agendamento + Materiais recomendados + FAQ na mesma rolagem | 🟡 aceitável, mas pode ficar mais enxuto — ver seção 5 |

Arquivos envolvidos:
- `apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx` (linhas 62-100 lógica de dados, 241-383 `ActiveHome`)
- `apps/mobile/app/(cliente)/(tabs)/processos/[id].tsx` (linhas 102-250)
- `packages/firebase/src/queries/processos.ts` (`listProcessosByCliente`)
- `packages/firebase/src/queries/etapas.ts` (`listEtapasByProcesso`)
- `packages/firebase/src/queries/agendamentos.ts` (`listAgendamentos`)

Não é necessária nenhuma mudança de schema — é reestruturação de como os dados já existentes são buscados e compostos na tela. Mobile apenas; não existe home de cliente no web (o app do cliente é só mobile).

---

## 2. Fluxo do usuário

```
Cliente com 2+ processos ativos abre a Home
  → vê 1 card por processo (não mais um card só)
  → cada card mostra: nome do serviço, etapa atual, próxima etapa,
    próximo compromisso (filtrado para aquele serviço/processo)
  → toca em "Ver detalhes" de um card
      → abre a tela do processo já no RESUMO
        (etapa atual / próxima etapa / próximo compromisso em destaque)
      → toca em "Ver processo completo"
          → revela a timeline inteira (o que já existe hoje)
```

---

## 3. Cálculo por processo

Para cada processo em `processos.filter(p => p.status === 'ativo' || p.status === 'analise')`:

1. Buscar as etapas do processo (`listEtapasByProcesso(db, processo.id)`), já ordenadas por `ordem` (a query já usa `orderBy('ordem')`).
2. `etapaAtual` = primeira com `status === 'em_andamento'`, senão primeira com `status === 'pendente'`.
3. `etapaProxima` = a próxima etapa na lista ordenada **depois** de `etapaAtual` (por índice), se existir.
4. `proximoCompromisso` = do conjunto de `agendamentos` do cliente, filtrar por `agendamento.servico_id === processo.servico_id` (o mesmo padrão que `ProcessoDetailScreen` já usa para filtrar pagamentos por `pagamento.servico_id === processo.servico_id`, linha 140), pegar o mais próximo no futuro.

Isso é só composição client-side sobre queries que já existem — nenhuma nova função de backend.

```ts
// apps/mobile/app/(cliente)/(tabs)/inicio/index.tsx — substituir o cálculo de activeProcesso único
const activeProcessos = processos?.filter((p) => p.status === 'ativo' || p.status === 'analise') ?? []

function useProcessoResumo(processo: ClienteProcesso, agendamentos: Agendamento[]) {
  const { data: etapas } = useQuery({
    queryKey: ['etapas', processo.id],
    queryFn: () => listEtapasByProcesso(db, processo.id),
  })
  const etapaAtual = etapas?.find((e) => e.status === 'em_andamento') ?? etapas?.find((e) => e.status === 'pendente')
  const idx = etapaAtual ? etapas!.indexOf(etapaAtual) : -1
  const etapaProxima = idx >= 0 ? etapas?.[idx + 1] : undefined
  const proximoCompromisso = agendamentos
    .filter((a) => a.servico_id === processo.servico_id && new Date(a.data_hora_inicio) > new Date())
    .sort((a, b) => +new Date(a.data_hora_inicio) - +new Date(b.data_hora_inicio))[0]
  return { etapaAtual, etapaProxima, proximoCompromisso }
}
```

Com poucos processos simultâneos por cliente (normalmente 1-3), N chamadas de `listEtapasByProcesso` em paralelo é aceitável — mesmo padrão de custo que já existe hoje para o processo único.

---

## 4. Mudanças na Home (`inicio/index.tsx`)

- `ActiveHome` deixa de receber `activeProcesso` (singular) e passa a receber `activeProcessos: ClienteProcesso[]`.
- O hero card vira uma lista (`FlatList` horizontal ou cards empilhados verticalmente — reaproveitar o mesmo visual do `heroCard` atual, linhas 751-785 do `StyleSheet`) — um card por processo, cada um levando para `processos/${processo.id}` ao tocar.
- Dentro de cada card: etapa atual (já existe: `heroStepLabel`/`heroStepName`) **mais** próxima etapa e próximo compromisso do próprio processo, todos juntos no mesmo card (hoje "próximo compromisso" é uma seção separada embaixo, `s.nextAppt`, compartilhada entre todos os processos).
- Seção "PRÓXIMO AGENDAMENTO" separada (linha 328-352) deixa de existir como bloco único — cada informação já está dentro do card do processo correspondente.
- Com 1 processo só, o comportamvento visual deve ficar equivalente ao de hoje (não introduzir escada/scroll horizontal desnecessário para o caso comum).

---

## 5. Mudanças no detalhe do processo (`processos/[id].tsx`)

- Adicionar, logo abaixo do `heroCard` atual (linha 161-177) e antes da seção "Parcelas e datas", um bloco de resumo:
  - Etapa atual (nome + status)
  - Próxima etapa (nome, se houver)
  - Próximo compromisso (data/hora, se houver — reaproveitar dado já calculado na seção 3)
  - Botão "Ver processo completo"
- A seção "Etapas" (linha 187-220, com a timeline cheia) só fica visível depois de tocar em "Ver processo completo" — controlar com um `useState<boolean>` local (`mostrarCompleto`), sem precisar de rota nova nem parâmetro na URL.
- Seções "Parcelas e datas" e "Contrato" continuam como estão hoje (fora do escopo deste ajuste).

---

## 6. Nota de design (itens 34-35)

Sem prescrever pixel a pixel: quando há processo(s) ativo(s), a Home deveria responder primeiro "o que eu preciso fazer agora" — os cards de processo (com próxima etapa e compromisso) são a resposta a essa pergunta e devem ficar no topo, como já estão. Os blocos "Materiais recomendados" e "FAQ" que vêm depois podem continuar existindo, mas são conteúdo de apoio, não a ação principal — considerar deixá-los mais compactos (ex.: 1 card em vez de carrossel) ou movê-los para depois da lista de processos quando ela cresce (2+ cards), para não competir visualmente com a informação que o cliente realmente precisa agora. Isso é uma recomendação de prioridade de conteúdo, não uma mudança estrutural obrigatória — pode ser avaliado durante a implementação.

---

## 7. Ordem sugerida de implementação

1. Extrair o helper de resumo por processo (seção 3) num hook/util reaproveitável pelos dois lugares (Home e detalhe do processo).
2. Atualizar `processos/[id].tsx` com o resumo + botão "Ver processo completo" (mudança isolada, mais simples de validar sozinha).
3. Atualizar `inicio/index.tsx` para a lista de cards por processo, reaproveitando o helper do passo 1.
4. Testar com um cliente de teste que tenha 2 processos ativos simultâneos (criar pelo admin: `Clientes → cliente → Processo → Novo processo`, com serviços diferentes).
5. Ajustar densidade visual da Home (seção 6) por último, depois que a estrutura de dados estiver correta.

---

## 8. Critérios de aceite

- [ ] Cliente com 2 processos ativos simultâneos vê 2 cards na Home, cada um com etapa atual, próxima etapa e próximo compromisso **específicos daquele processo** (não misturados).
- [ ] "Ver detalhes" de cada card leva ao processo correto.
- [ ] A tela de detalhe do processo abre mostrando o resumo (etapa atual/próxima/próximo compromisso), com a timeline completa escondida até tocar em "Ver processo completo".
- [ ] O próximo compromisso mostrado pertence ao serviço daquele processo, não a outro processo do mesmo cliente.
- [ ] Cliente com 1 processo só continua com experiência equivalente à atual (sem regressão).
- [ ] Cliente sem processo ativo continua vendo a `FreeHome` sem nenhuma alteração.

---

## 9. Fora de escopo agora

- Redesenho visual completo da Home (cores, ilustrações, novo hero) — só estrutura de dados e composição de conteúdo.
- Ordenação inteligente de qual processo aparece primeiro (ex.: por prazo mais urgente) — por enquanto, ordem natural da lista retornada por `listProcessosByCliente`.
- Qualquer mudança na tela de "Parcelas e datas" ou "Contrato" dentro do detalhe do processo.
- Versão web deste fluxo (não existe home de cliente no `apps/web` — é área administrativa).
