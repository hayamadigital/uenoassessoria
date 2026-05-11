# Redesign — Módulo Financeiro (Mobile Admin)

**Data:** 2026-05-11  
**Status:** Aprovado  
**Arquivo alvo:** `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

---

## Objetivo

Substituir a UI atual do módulo Financeiro por uma tela orientada a análise, com seleção de mês, comparativo programado vs recebido, visão histórica de 6 meses e listas contextualizadas pelo mês escolhido.

---

## Decisões de design (aprovadas)

| Pergunta | Escolha |
|---|---|
| Navegação entre meses | **Tira horizontal de chips** embutida no header navy |
| Histórico + comparativo | **Barras duplas** (clara = programado, escura = recebido) |

---

## Estrutura da tela (top → bottom)

### 1. Header sticky — navy gradient

- Fundo `linear-gradient(160deg, #0F1F4D, #1E3A8A)`
- Linha superior: botão back + título "Financeiro" + ícone wallet
- Tira de meses: `ScrollView` horizontal com chips dos últimos 6 + próximos 2 meses
- Chip ativo: `background: rgba(255,255,255,0.2)`, texto branco
- Tocar chip → atualiza `mesSelecionado` (estado local `useState`)

### 2. KPI row — 3 cards lado a lado

Cada card tem: ícone colorido (fundo tonal) · label · valor principal · delta % vs mês anterior.

| Card | Dado | Cor |
|---|---|---|
| Recebido | `total_pago_mes` | verde `#16A34A` |
| A receber | `total_pendente` | laranja `#D97706` |
| Gastos | soma dos gastos do mês | vermelho `#DC2626` |

Delta calculado comparando com o mês imediatamente anterior (do array `resumos`).

### 3. Barra de progresso de recebimento

- Percentual: `total_pago_mes / (total_pago_mes + total_pendente) * 100`
- Barra com gradiente `#1E3A8A → #3B5BD9`
- Footer: 3 itens — Recebido · A receber (valor) · Saldo líquido (`total_pago_mes - totalGastosMes`)

### 4. Gráfico de barras duplas — histórico 6 meses

- Sempre mostra os 6 meses que terminam no mês atual selecionado
- Por mês: 2 barras agrupadas
  - **Clara** (`#DDE2EC`): programado = `total_pago_mes + total_pendente`
  - **Escura** (`#1E3A8A` / gradiente no ativo): recebido = `total_pago_mes`
- Altura normalizada pelo maior valor programado do conjunto
- Label abaixo com 3 letras do mês; mês ativo em azul bold
- Tocar barra de um mês → muda `mesSelecionado`

### 5. Lista de faturas

- Filtrada por `mesSelecionado` via `listPagamentosByMes`
- Cada item: linha colorida lateral (cor do status) · ícone tonal · nome · status pill + data vencimento · valor
- Status colors: pago=verde, pendente=laranja, cancelado=vermelho, estornado=cinza
- Empty state com ícone + texto

### 6. Lista de gastos

- Filtrada por `mesSelecionado` via `listGastos`
- Header da seção tem botão "+ Registrar" → `router.push('/modulos/financeiro/novo-gasto')`
- Cada item: ícone de categoria tonal · nome · pill de categoria + funcionário · valor vermelho · ícone de comprovante se existir
- Empty state tocável que navega para novo-gasto

### 7. Previsão — próximos 3 meses

- **Sempre** calcula a partir do mês atual real (`new Date()`), não do `mesSelecionado`
- 3 cards empilhados: +1m, +2m, +3m
- Badge azul com opacidade decrescente por distância
- Dados de `getPrevisaoProximosMeses`

---

## Estado local

```tsx
const [mesSelecionado, setMesSelecionado] = useState(getMesStr(0))
```

Derivações a partir de `mesSelecionado`:
- `mesesHistorico`: os 6 meses que terminam em `mesSelecionado`
- Queries `resumos`, `pagamentosMes`, `gastos` usam `mesSelecionado` como chave

Previsão usa sempre `getMesStr(0)` (mês real atual), independente do seletor.

---

## Queries utilizadas

| Query | Parâmetro | Uso |
|---|---|---|
| `getResumoMultiplosMeses` | `mesesHistorico` (6 meses) | KPIs + gráfico duplo |
| `listPagamentosByMes` | `mesSelecionado` | Lista de faturas |
| `listGastos` | `mesSelecionado` | Lista de gastos |
| `getPrevisaoProximosMeses` | `[+1m, +2m, +3m]` | Seção previsão |

---

## Arquivos modificados

- `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx` — rewrite completo

Nenhuma mudança em queries, types ou storage — dados já existentes são suficientes.

---

## Não está no escopo

- Tocar em fatura/gasto para ver detalhe (futuro)
- Editar ou deletar gasto nesta tela (apenas em `novo-gasto.tsx`)
- Exportar relatório
