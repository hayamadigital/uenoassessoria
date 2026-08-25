# Financeiro Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `financeiro/index.tsx` with month-selector header, KPI row, progress bar, dual-bar history chart, and filtered faturas/gastos/previsão sections.

**Architecture:** Single file rewrite. State `mesSelecionado` drives all data queries except `previsão` (always anchored to real current date). Month chips span -6 to +2 relative to today. Bar chart always shows 6 months ending at `mesSelecionado`.

**Tech Stack:** React Native, Expo Router, TanStack Query, date-fns, @expo/vector-icons, existing firebase queries.

---

## File

- Rewrite: `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

---

### Task 1: State, helpers, and query wiring

**Files:**
- Rewrite: `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

- [ ] **Step 1: Replace the file with state skeleton + all queries**

```tsx
import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import {
  getResumoMultiplosMeses,
  listPagamentosByMes,
  getPrevisaoProximosMeses,
  listGastos,
} from '@ueno/firebase/queries/financeiro'
import { colors, shadows } from '@/theme'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinalidadeGasto } from '@ueno/firebase/types'

// ── Helpers ──────────────────────────────────────────────────────

function getMesStr(offset: number): string {
  return format(addMonths(new Date(), offset), 'yyyy-MM')
}

function getMesLabel(mes: string): string {
  const [y, m] = mes.split('-')
  return format(new Date(Number(y), Number(m) - 1, 1), 'MMM', { locale: ptBR })
}

function getMesFull(mes: string): string {
  const [y, m] = mes.split('-')
  return format(new Date(Number(y), Number(m) - 1, 1), 'MMMM yyyy', { locale: ptBR })
}

// 6 months ending at 'mes' (inclusive)
function getMesesHistorico(mes: string): string[] {
  const base = parseISO(`${mes}-01`)
  return Array.from({ length: 6 }, (_, i) =>
    format(subMonths(base, 5 - i), 'yyyy-MM')
  )
}

// Chips: -6 to +2 relative to today (9 months total)
const MESES_CHIPS = Array.from({ length: 9 }, (_, i) => getMesStr(i - 6))

// ── Constants ────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  pago: colors.ok,
  pendente: colors.warn,
  cancelado: colors.err,
  estornado: colors.ink400,
}

const STATUS_LABEL: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}

const FINALIDADE_LABEL: Record<FinalidadeGasto, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  material: 'Material',
  comunicacao: 'Comunicação',
  manutencao: 'Manutenção',
  outros: 'Outros',
}

const FINALIDADE_COLOR: Record<FinalidadeGasto, string> = {
  alimentacao: '#EA580C',
  transporte: '#0891B2',
  material: colors.navy800,
  comunicacao: '#7E22CE',
  manutencao: '#CA8A04',
  outros: colors.ink400,
}

const FINALIDADE_ICON: Record<FinalidadeGasto, keyof typeof Ionicons.glyphMap> = {
  alimentacao: 'restaurant-outline',
  transporte: 'car-outline',
  material: 'cube-outline',
  comunicacao: 'chatbubble-outline',
  manutencao: 'construct-outline',
  outros: 'ellipsis-horizontal-outline',
}

const MAX_BAR_HEIGHT = 52 // px — tallest bar in dual chart

// ── Screen ───────────────────────────────────────────────────────

export default function FinanceiroScreen() {
  const [mesSelecionado, setMesSelecionado] = useState(getMesStr(0))

  const mesesHistorico = getMesesHistorico(mesSelecionado)
  const mesesPrevisao = [getMesStr(1), getMesStr(2), getMesStr(3)]

  const { data: resumos, isLoading: loadingResumos } = useQuery({
    queryKey: ['fin-resumos', mesesHistorico.join(',')],
    queryFn: () => getResumoMultiplosMeses(db, mesesHistorico),
  })

  const { data: pagamentos, isLoading: loadingPagamentos } = useQuery({
    queryKey: ['fin-pagamentos-mes', mesSelecionado],
    queryFn: () => listPagamentosByMes(db, mesSelecionado),
  })

  const { data: gastos, isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos-mes', mesSelecionado],
    queryFn: () => listGastos(db, mesSelecionado),
  })

  const { data: previsao, isLoading: loadingPrevisao } = useQuery({
    queryKey: ['fin-previsao', mesesPrevisao.join(',')],
    queryFn: () => getPrevisaoProximosMeses(db, mesesPrevisao),
  })

  // ── Derived values ──────────────────────────────────────────────

  const resumoAtual = resumos?.find((r) => r.mes === mesSelecionado)
  const idxAtual = mesesHistorico.indexOf(mesSelecionado)
  const resumoAnterior = idxAtual > 0 ? resumos?.find((r) => r.mes === mesesHistorico[idxAtual - 1]) : undefined

  const totalGastos = (gastos ?? []).reduce((acc, g) => acc + g.valor_jpy, 0)
  const totalPago = resumoAtual?.total_pago_mes ?? 0
  const totalPendente = resumoAtual?.total_pendente ?? 0
  const totalProgramado = totalPago + totalPendente
  const pctRecebido = totalProgramado > 0 ? Math.round((totalPago / totalProgramado) * 100) : 0
  const saldoLiquido = totalPago - totalGastos

  function calcDelta(atual: number, anterior: number | undefined): number | null {
    if (!anterior || anterior === 0) return null
    return Math.round(((atual - anterior) / anterior) * 100)
  }

  const deltaRecebido = calcDelta(totalPago, resumoAnterior?.total_pago_mes)
  const deltaGastos = calcDelta(totalGastos, undefined) // gastos sem histórico comparativo por ora

  // Bar chart heights
  const programados = mesesHistorico.map((mes) => {
    const r = resumos?.find((rr) => rr.mes === mes)
    return (r?.total_pago_mes ?? 0) + (r?.total_pendente ?? 0)
  })
  const maxProgramado = Math.max(1, ...programados)

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={{ padding: 20, color: colors.ink900 }}>
          Mês selecionado: {mesSelecionado}{'\n'}
          Total pago: ¥{totalPago.toLocaleString('ja-JP')}{'\n'}
          Pendente: ¥{totalPendente.toLocaleString('ja-JP')}{'\n'}
          Gastos: ¥{totalGastos.toLocaleString('ja-JP')}{'\n'}
          Pct: {pctRecebido}%
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
})
```

- [ ] **Step 2: Verificar que o app compila e os dados aparecem no debug text**

Rode `npx expo start` na pasta `apps/mobile` e confirme que o mês atual e os valores financeiros aparecem na tela sem erro de console.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx
git commit -m "feat(financeiro): add state, helpers and query wiring"
```

---

### Task 2: Header com tira de meses

**Files:**
- Modify: `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

- [ ] **Step 1: Substituir o `<Text>` de debug pelo header block**

Substitua o conteúdo do `return` pelo seguinte (mantendo os mesmos imports e derivações acima):

```tsx
  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={s.headerBlock}>
        {/* Círculo decorativo de fundo */}
        <View style={s.headerCircle} />

        {/* Top row */}
        <View style={s.headerTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerSub}>Módulo</Text>
            <Text style={s.headerTitle}>Financeiro</Text>
          </View>
          <View style={s.headerIcon}>
            <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        {/* Month strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipStrip}
        >
          {MESES_CHIPS.map((mes) => {
            const active = mes === mesSelecionado
            return (
              <TouchableOpacity
                key={mes}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setMesSelecionado(mes)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                  {getMesLabel(mes)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* conteúdo virá nas próximas tasks */}
        <View style={{ height: 400 }} />
      </ScrollView>

    </SafeAreaView>
  )
```

- [ ] **Step 2: Adicionar styles do header ao StyleSheet**

Substitua `const s = StyleSheet.create({...})` por:

```tsx
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },

  // ── Header ──────────────────────────────────────────────────
  headerBlock: {
    backgroundColor: colors.navy800,
    paddingTop: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
    ...shadows.lg,
  },
  headerCircle: {
    position: 'absolute', right: -40, top: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  chipStrip: { gap: 6, paddingBottom: 14, paddingRight: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipTxt: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  chipTxtActive: { color: '#fff' },
})
```

- [ ] **Step 3: Verificar header no simulador**

O header navy aparece com botão back, título "Financeiro" e tira de chips. Tocar chips diferentes muda o mês selecionado (visível pelo chip ativo).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx
git commit -m "feat(financeiro): add navy header with month chip strip"
```

---

### Task 3: KPI row + barra de progresso

**Files:**
- Modify: `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

- [ ] **Step 1: Substituir `<View style={{ height: 400 }} />` pelo conteúdo desta task**

```tsx
        {/* ── KPI ROW ────────────────────────────────────────── */}
        {loadingResumos ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={s.kpiRow}>
              {/* Recebido */}
              <View style={s.kpiCard}>
                <View style={[s.kpiIconBox, { backgroundColor: colors.ok + '18' }]}>
                  <Ionicons name="arrow-down-circle-outline" size={16} color={colors.ok} />
                </View>
                <Text style={s.kpiLbl}>Recebido</Text>
                <Text style={[s.kpiVal, { color: colors.ok }]}>
                  ¥{totalPago > 0 ? (totalPago / 1000).toFixed(0) + 'k' : '—'}
                </Text>
                {deltaRecebido !== null && (
                  <Text style={[s.kpiDelta, { color: deltaRecebido >= 0 ? colors.ok : colors.err }]}>
                    {deltaRecebido >= 0 ? '↑' : '↓'} {Math.abs(deltaRecebido)}%
                  </Text>
                )}
              </View>

              {/* A receber */}
              <View style={s.kpiCard}>
                <View style={[s.kpiIconBox, { backgroundColor: colors.warn + '18' }]}>
                  <Ionicons name="time-outline" size={16} color={colors.warn} />
                </View>
                <Text style={s.kpiLbl}>A receber</Text>
                <Text style={[s.kpiVal, { color: colors.warn }]}>
                  ¥{totalPendente > 0 ? (totalPendente / 1000).toFixed(0) + 'k' : '—'}
                </Text>
                <Text style={[s.kpiDelta, { color: colors.ink400 }]}>
                  {(pagamentos ?? []).filter((p) => p.status === 'pendente').length} fat.
                </Text>
              </View>

              {/* Gastos */}
              <View style={s.kpiCard}>
                <View style={[s.kpiIconBox, { backgroundColor: colors.err + '18' }]}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={colors.err} />
                </View>
                <Text style={s.kpiLbl}>Gastos</Text>
                <Text style={[s.kpiVal, { color: colors.err }]}>
                  ¥{totalGastos > 0 ? (totalGastos / 1000).toFixed(0) + 'k' : '—'}
                </Text>
                <Text style={[s.kpiDelta, { color: colors.ink400 }]}>
                  {(gastos ?? []).length} itens
                </Text>
              </View>
            </View>

            {/* ── PROGRESS BAR ───────────────────────────────── */}
            <View style={s.progCard}>
              <View style={s.progHeader}>
                <Text style={s.progTitle}>Recebimento do mês</Text>
                <Text style={s.progPct}>{pctRecebido}%</Text>
              </View>
              <View style={s.progMeta}>
                <Text style={s.progMetaTxt}>
                  Recebido <Text style={{ color: colors.navy800, fontWeight: '700' }}>
                    ¥{totalPago.toLocaleString('ja-JP')}
                  </Text>
                </Text>
                <Text style={s.progMetaTxt}>
                  Meta <Text style={{ color: colors.ink900, fontWeight: '700' }}>
                    ¥{totalProgramado.toLocaleString('ja-JP')}
                  </Text>
                </Text>
              </View>
              <View style={s.progBarBg}>
                <View style={[s.progBarFill, { width: `${pctRecebido}%` as any }]} />
              </View>
              <View style={s.progFooter}>
                <View style={s.progFootItem}>
                  <View style={[s.progDot, { backgroundColor: colors.navy800 }]} />
                  <Text style={s.progFootTxt}>Recebido</Text>
                </View>
                <View style={s.progFootItem}>
                  <View style={[s.progDot, { backgroundColor: colors.warn }]} />
                  <Text style={s.progFootTxt}>
                    A receber <Text style={{ color: colors.warn, fontWeight: '700' }}>
                      ¥{totalPendente.toLocaleString('ja-JP')}
                    </Text>
                  </Text>
                </View>
                <View style={s.progFootItem}>
                  <View style={[s.progDot, { backgroundColor: colors.ink200 }]} />
                  <Text style={s.progFootTxt}>
                    Saldo <Text style={{ color: colors.navy800, fontWeight: '700' }}>
                      ¥{saldoLiquido.toLocaleString('ja-JP')}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* placeholder para próximas tasks */}
        <View style={{ height: 300 }} />
```

- [ ] **Step 2: Adicionar styles KPI + progress ao StyleSheet (após `chipTxtActive`)**

```tsx
  // ── KPI row ─────────────────────────────────────────────────
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14,
    padding: 11, borderWidth: 1, borderColor: colors.ink100, ...shadows.sm,
  },
  kpiIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLbl: { fontSize: 9, color: colors.ink400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  kpiVal: { fontSize: 15, fontWeight: '800', letterSpacing: -0.4 },
  kpiDelta: { fontSize: 9, marginTop: 3 },

  // ── Progress bar ─────────────────────────────────────────────
  progCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: colors.ink100, marginBottom: 10, ...shadows.sm,
  },
  progHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progTitle: { fontSize: 10, fontWeight: '700', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.7 },
  progPct: { fontSize: 18, fontWeight: '800', color: colors.navy800, letterSpacing: -0.5 },
  progMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progMetaTxt: { fontSize: 10, color: colors.ink400 },
  progBarBg: { height: 10, backgroundColor: colors.ink100, borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  progBarFill: { height: '100%', backgroundColor: colors.navy700, borderRadius: 5 },
  progFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  progFootItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progDot: { width: 6, height: 6, borderRadius: 2 },
  progFootTxt: { fontSize: 9, color: colors.ink500 },
```

- [ ] **Step 3: Verificar KPI e progress no simulador**

Os 3 cards aparecem com valores (ou `—` se sem dados). A barra de progresso reflete o percentual correto. Trocar de mês atualiza os valores.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx
git commit -m "feat(financeiro): add KPI row and progress bar card"
```

---

### Task 4: Gráfico de barras duplas

**Files:**
- Modify: `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

- [ ] **Step 1: Substituir o placeholder `<View style={{ height: 300 }} />` pelo gráfico + próximo placeholder**

```tsx
        {/* ── DUAL BAR CHART ─────────────────────────────────── */}
        {!loadingResumos && (
          <View style={s.chartCard}>
            <View style={s.chartHeader}>
              <Text style={s.chartTitle}>Histórico — 6 meses</Text>
              <View style={s.chartLegend}>
                <View style={s.legItem}>
                  <View style={[s.legDot, { backgroundColor: colors.ink200 }]} />
                  <Text style={s.legTxt}>Prog.</Text>
                </View>
                <View style={s.legItem}>
                  <View style={[s.legDot, { backgroundColor: colors.navy800 }]} />
                  <Text style={s.legTxt}>Rec.</Text>
                </View>
              </View>
            </View>

            <View style={s.chartBars}>
              {mesesHistorico.map((mes, idx) => {
                const r = resumos?.find((rr) => rr.mes === mes)
                const prog = (r?.total_pago_mes ?? 0) + (r?.total_pendente ?? 0)
                const rec = r?.total_pago_mes ?? 0
                const hProg = Math.max(4, Math.round((prog / maxProgramado) * MAX_BAR_HEIGHT))
                const hRec = prog > 0 ? Math.max(4, Math.round((rec / maxProgramado) * MAX_BAR_HEIGHT)) : 4
                const isActive = mes === mesSelecionado
                return (
                  <TouchableOpacity
                    key={mes}
                    style={s.barGroup}
                    onPress={() => setMesSelecionado(mes)}
                    activeOpacity={0.7}
                  >
                    <View style={s.barGroupBars}>
                      <View style={[s.barSingle, { height: hProg, backgroundColor: isActive ? colors.ink200 : colors.ink100 }]} />
                      <View style={[s.barSingle, { height: hRec, backgroundColor: isActive ? colors.navy800 : colors.navy600 + '88' }]} />
                    </View>
                    <Text style={[s.barLbl, isActive && s.barLblActive]}>
                      {getMesLabel(mes)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* placeholder */}
        <View style={{ height: 300 }} />
```

- [ ] **Step 2: Adicionar styles do gráfico ao StyleSheet**

```tsx
  // ── Dual bar chart ───────────────────────────────────────────
  chartCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: colors.ink100, marginBottom: 10, ...shadows.sm,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartTitle: { fontSize: 10, fontWeight: '700', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.7 },
  chartLegend: { flexDirection: 'row', gap: 10 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legDot: { width: 8, height: 8, borderRadius: 2 },
  legTxt: { fontSize: 9, color: colors.ink400 },
  chartBars: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: MAX_BAR_HEIGHT + 18 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barGroupBars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end', width: '100%' },
  barSingle: { flex: 1, borderRadius: 3 },
  barLbl: { fontSize: 8, color: colors.ink400, textTransform: 'capitalize' },
  barLblActive: { color: colors.navy800, fontWeight: '700' },
```

- [ ] **Step 3: Verificar gráfico no simulador**

As barras duplas aparecem para os 6 meses. Tocar numa barra muda `mesSelecionado` (chip ativo muda e KPIs atualizam).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx
git commit -m "feat(financeiro): add dual-bar history chart"
```

---

### Task 5: Lista de faturas e lista de gastos

**Files:**
- Modify: `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

- [ ] **Step 1: Substituir o placeholder `<View style={{ height: 300 }} />` pelas listas**

```tsx
        {/* ── FATURAS ────────────────────────────────────────── */}
        <View style={s.secRow}>
          <Text style={s.secLbl}>Faturas — {getMesFull(mesSelecionado)}</Text>
        </View>

        {loadingPagamentos ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 16 }} />
        ) : (pagamentos ?? []).length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="receipt-outline" size={26} color={colors.ink300} />
            <Text style={s.emptyTxt}>Nenhuma fatura neste mês</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {(pagamentos ?? []).map((p, idx) => {
              const cor = STATUS_COLOR[p.status] ?? colors.ink400
              return (
                <View
                  key={p.id}
                  style={[s.listItem, idx < (pagamentos ?? []).length - 1 && s.listItemBorder]}
                >
                  <View style={[s.listAccent, { backgroundColor: cor }]} />
                  <View style={[s.listIconBox, { backgroundColor: cor + '18' }]}>
                    <Ionicons
                      name={p.status === 'pago' ? 'checkmark-circle-outline' : p.status === 'pendente' ? 'time-outline' : 'close-circle-outline'}
                      size={14}
                      color={cor}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.listName} numberOfLines={1}>{p.descricao}</Text>
                    <View style={s.listMeta}>
                      <View style={[s.statusPill, { backgroundColor: cor + '18' }]}>
                        <Text style={[s.statusTxt, { color: cor }]}>{STATUS_LABEL[p.status] ?? p.status}</Text>
                      </View>
                      {p.data_vencimento && (
                        <Text style={s.listDate}>
                          {p.status === 'pago' ? 'pago' : 'venc.'} {format(new Date(p.data_vencimento), 'dd/MM', { locale: ptBR })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={[s.listVal, { color: p.status === 'pago' ? colors.ok : p.status === 'pendente' ? colors.warn : colors.ink400 }]}>
                    ¥{p.valor_jpy.toLocaleString('ja-JP')}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* ── GASTOS ─────────────────────────────────────────── */}
        <View style={[s.secRow, { marginTop: 8 }]}>
          <Text style={s.secLbl}>Gastos — {getMesFull(mesSelecionado)}</Text>
          <TouchableOpacity
            style={s.addBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/modulos/financeiro/novo-gasto' as any)}
          >
            <Ionicons name="add" size={13} color="#fff" />
            <Text style={s.addBtnTxt}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {loadingGastos ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 16 }} />
        ) : (gastos ?? []).length === 0 ? (
          <TouchableOpacity
            style={s.emptyCard}
            activeOpacity={0.8}
            onPress={() => router.push('/modulos/financeiro/novo-gasto' as any)}
          >
            <Ionicons name="cash-outline" size={26} color={colors.ink300} />
            <Text style={s.emptyTxt}>Nenhum gasto registrado</Text>
            <Text style={s.emptySubTxt}>Toque para registrar</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.listCard}>
            {(gastos ?? []).map((g, idx) => {
              const cor = FINALIDADE_COLOR[g.finalidade] ?? colors.ink400
              return (
                <View
                  key={g.id}
                  style={[s.listItem, idx < (gastos ?? []).length - 1 && s.listItemBorder]}
                >
                  <View style={[s.listIconBox, { backgroundColor: cor + '18' }]}>
                    <Ionicons name={FINALIDADE_ICON[g.finalidade]} size={14} color={cor} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.listName} numberOfLines={1}>{g.descricao}</Text>
                    <View style={s.listMeta}>
                      <View style={[s.statusPill, { backgroundColor: cor + '18' }]}>
                        <Text style={[s.statusTxt, { color: cor }]}>{FINALIDADE_LABEL[g.finalidade]}</Text>
                      </View>
                      <Text style={s.listDate} numberOfLines={1}>{g.funcionario_nome}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={[s.listVal, { color: colors.err }]}>
                      ¥{g.valor_jpy.toLocaleString('ja-JP')}
                    </Text>
                    {g.comprovante_url && (
                      <Ionicons name="image-outline" size={11} color={colors.ink300} />
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* placeholder previsão */}
        <View style={{ height: 200 }} />
```

- [ ] **Step 2: Adicionar styles das listas ao StyleSheet**

```tsx
  // ── Sections ─────────────────────────────────────────────────
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  secLbl: { fontSize: 10, fontWeight: '700', color: colors.ink400, textTransform: 'uppercase', letterSpacing: 0.8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.navy800, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addBtnTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },

  emptyCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 24,
    borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', gap: 6, marginBottom: 10,
  },
  emptyTxt: { fontSize: 12, color: colors.ink400 },
  emptySubTxt: { fontSize: 10, color: colors.navy800, fontWeight: '600' },

  // ── List card (faturas + gastos) ─────────────────────────────
  listCard: {
    backgroundColor: colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: colors.ink100,
    overflow: 'hidden', marginBottom: 10, ...shadows.sm,
  },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  listAccent: { width: 3, height: 36, borderRadius: 2, flexShrink: 0 },
  listIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listName: { fontSize: 12, fontWeight: '600', color: colors.ink900, marginBottom: 4 },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  statusTxt: { fontSize: 9, fontWeight: '700' },
  listDate: { fontSize: 9, color: colors.ink400 },
  listVal: { fontSize: 12, fontWeight: '800', letterSpacing: -0.3, flexShrink: 0 },
```

- [ ] **Step 3: Verificar listas no simulador**

Faturas e gastos do mês selecionado aparecem com ícones, pills de status/categoria e valores. Empty states mostram ícone e texto.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx
git commit -m "feat(financeiro): add faturas and gastos lists"
```

---

### Task 6: Seção de previsão + remover placeholder + StyleSheet final

**Files:**
- Modify: `apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx`

- [ ] **Step 1: Substituir `<View style={{ height: 200 }} />` pela seção de previsão**

```tsx
        {/* ── PREVISÃO ───────────────────────────────────────── */}
        <View style={[s.secRow, { marginTop: 8 }]}>
          <Text style={s.secLbl}>Previsão — próximos meses</Text>
        </View>

        {loadingPrevisao ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 16 }} />
        ) : (
          <View style={[s.listCard, { marginBottom: 0 }]}>
            {(previsao ?? []).map((p, i) => {
              const opacities = ['FF', 'CC', '99'] as const
              return (
                <View
                  key={p.mes}
                  style={[s.listItem, i < (previsao ?? []).length - 1 && s.listItemBorder]}
                >
                  <View style={[s.prevBadge, { backgroundColor: colors.navy800 + opacities[i] }]}>
                    <Text style={s.prevBadgeTxt}>+{i + 1}m</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prevMes}>{getMesFull(p.mes)}</Text>
                    <Text style={s.prevQtd}>
                      {p.quantidade} fatura{p.quantidade !== 1 ? 's' : ''} pendente{p.quantidade !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={s.prevVal}>
                    {p.total_previsto > 0 ? `¥${p.total_previsto.toLocaleString('ja-JP')}` : '¥ —'}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
```

- [ ] **Step 2: Adicionar styles da previsão ao StyleSheet**

```tsx
  // ── Previsão ─────────────────────────────────────────────────
  prevBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  prevBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  prevMes: { fontSize: 12, fontWeight: '600', color: colors.ink900, textTransform: 'capitalize' },
  prevQtd: { fontSize: 10, color: colors.ink400, marginTop: 1 },
  prevVal: { fontSize: 14, fontWeight: '800', color: colors.navy800, letterSpacing: -0.4 },
```

- [ ] **Step 3: Verificar tela completa no simulador**

Percorrer a tela completa: header → KPI → progress → gráfico → faturas → gastos → previsão. Trocar meses via chips e via barras do gráfico, confirmar que KPIs e listas atualizam.

- [ ] **Step 4: Commit final**

```bash
git add apps/mobile/app/(admin)/(tabs)/modulos/financeiro/index.tsx
git commit -m "feat(financeiro): complete redesign with previsão section"
```

---

## Self-Review

**Spec coverage:**

| Requisito | Task |
|---|---|
| Header sticky navy + tira de meses | Task 2 |
| KPI row (recebido, a receber, gastos) | Task 3 |
| Barra de progresso programado vs recebido | Task 3 |
| Barras duplas 6 meses | Task 4 |
| Lista de faturas filtrada por mês | Task 5 |
| Lista de gastos filtrada por mês | Task 5 |
| Botão registrar gasto | Task 5 |
| Previsão +1m +2m +3m ancorada no mês real | Task 6 |
| Tocar barra muda mesSelecionado | Task 4 |

**Placeholders:** Nenhum — todo código está completo.

**Consistência de tipos:**
- `getMesFull` → `string`, usado em Task 5 e 6 ✓
- `getMesLabel` → `string` (3 letras), usado em Task 4 ✓
- `MAX_BAR_HEIGHT` definido em Task 1, referenciado em Task 4 styles ✓
- `FINALIDADE_ICON` definido em Task 1, usado em Task 5 ✓
- `programados` / `maxProgramado` definidos em Task 1, usados em Task 4 ✓
