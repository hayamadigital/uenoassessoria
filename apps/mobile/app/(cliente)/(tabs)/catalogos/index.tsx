import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { colors } from '@/theme'
import type { Servico } from '@ueno/firebase'

const SERVICO_COLORS = [colors.navy800, '#0891B2', '#0F766E', '#7E22CE', colors.warn]
const SERVICO_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  default: 'car-outline',
  aula: 'school-outline',
  traducao: 'language-outline',
  interprete: 'chatbubbles-outline',
  habilitacao: 'shield-checkmark-outline',
}

type Categoria = 'todos' | 'cnh' | 'aulas' | 'documentacao' | 'interprete'

const FILTROS: { label: string; value: Categoria }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'CNH', value: 'cnh' },
  { label: 'Aulas', value: 'aulas' },
  { label: 'Documentação', value: 'documentacao' },
  { label: 'Intérprete', value: 'interprete' },
]

export default function CatalogoScreen() {
  const [filtro, setFiltro] = useState<Categoria>('todos')
  const [selected, setSelected] = useState<Servico | null>(null)

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => listServicos(db, true),
  })

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.headerRow}>
          <Text style={s.headerSub}>O que oferecemos</Text>
          <Text style={s.headerTitle}>Catálogo de serviços</Text>
        </View>

        {/* Hero banner */}
        <View style={s.heroBanner}>
          <View style={s.heroCircle1} />
          <View style={s.kanji}><Text style={s.kanjiTxt}>上野</Text></View>
          <View style={{ position: 'relative', padding: 18, height: 160, justifyContent: 'space-between' }}>
            <View style={s.heroPill}>
              <Ionicons name="star" size={10} color="white" />
              <Text style={s.heroPillTxt}> Promoção especial</Text>
            </View>
            <View>
              <Text style={s.heroTitle}>Pronto para dirigir{'\n'}no Japão?</Text>
              <Text style={s.heroSubtitle}>Conheça nossos serviços e escolha o ideal para você.</Text>
            </View>
          </View>
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsRow}>
          {FILTROS.map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={[s.pill, filtro === value && s.pillActive]}
              onPress={() => setFiltro(value)}
              activeOpacity={0.8}
            >
              <Text style={[s.pillTxt, filtro === value && s.pillTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginTop: 24 }} />
        ) : (servicos ?? []).length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🗂</Text>
            <Text style={s.emptyTitle}>Nenhum serviço disponível no momento</Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {(servicos ?? []).map((serv, i) => (
              <ServicoCard
                key={serv.id}
                servico={serv}
                color={SERVICO_COLORS[i % SERVICO_COLORS.length]}
                onPress={() => setSelected(serv)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom sheet detalhe */}
      {selected && (
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <ScrollView>
            <View style={{ padding: 20 }}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>{selected.nome}</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close-circle" size={26} color={colors.ink300} />
                </TouchableOpacity>
              </View>
              <Text style={s.sheetDesc}>{selected.descricao}</Text>
              {selected.preco_jpy != null && (
                <View style={s.sheetPriceRow}>
                  <View>
                    <Text style={s.sheetPriceLabel}>A PARTIR DE</Text>
                    <Text style={s.sheetPrice}>¥ {selected.preco_jpy.toLocaleString('ja-JP')}</Text>
                  </View>
                  <TouchableOpacity style={s.sheetBtn} activeOpacity={0.85}>
                    <Text style={s.sheetBtnTxt}>Contratar</Text>
                    <Ionicons name="chevron-forward" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  )
}

function ServicoCard({ servico, color, onPress }: { servico: Servico; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
      {/* Banner placeholder */}
      <View style={[s.cardBanner, { backgroundColor: color + '18' }]}>
        <Ionicons name="car-outline" size={36} color={color} />
        <Text style={[s.cardBannerTxt, { color: color + '80' }]}>Imagem do serviço</Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={s.cardTitle}>{servico.nome}</Text>
        <Text style={s.cardDesc} numberOfLines={3}>{servico.descricao}</Text>
        <View style={s.cardBottom}>
          <View>
            <Text style={s.cardPriceLabel}>A PARTIR DE</Text>
            {servico.preco_jpy != null
              ? <Text style={s.cardPrice}>¥ {servico.preco_jpy.toLocaleString('ja-JP')}</Text>
              : <Text style={s.cardPrice}>Sob consulta</Text>
            }
          </View>
          <TouchableOpacity style={[s.cardBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.85}>
            <Text style={s.cardBtnTxt}>Contratar</Text>
            <Ionicons name="chevron-forward" size={14} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  headerRow: { marginBottom: 14 },
  headerSub: { fontSize: 12, color: colors.ink500 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.ink900, letterSpacing: -0.5, marginTop: 2 },

  heroBanner: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 18, height: 160,
    backgroundColor: colors.navy800,
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 10,
    position: 'relative',
  },
  heroCircle1: { position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,.06)' },
  kanji: { position: 'absolute', right: 14, top: 8 },
  kanjiTxt: { fontSize: 54, fontWeight: '700', color: 'rgba(255,255,255,.06)', fontFamily: 'serif' },
  heroPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.16)', alignSelf: 'flex-start' },
  heroPillTxt: { fontSize: 11, color: 'white', fontWeight: '600' },
  heroTitle: { fontSize: 18, fontWeight: '700', color: 'white', letterSpacing: -0.4, lineHeight: 24, marginBottom: 4 },
  heroSubtitle: { fontSize: 11.5, color: 'rgba(255,255,255,.85)' },

  pillsScroll: { marginBottom: 18 },
  pillsRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink200 },
  pillActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  pillTxt: { fontSize: 12, fontWeight: '600', color: colors.ink700 },
  pillTxtActive: { color: 'white' },

  card: {
    backgroundColor: colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: colors.ink100,
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
    overflow: 'hidden',
  },
  cardBanner: { height: 96, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row' },
  cardBannerTxt: { fontSize: 12, fontWeight: '500' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink900, letterSpacing: -0.3, marginBottom: 6, lineHeight: 20 },
  cardDesc: { fontSize: 12.5, color: colors.ink500, lineHeight: 18, marginBottom: 14 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.ink100, borderStyle: 'dashed' },
  cardPriceLabel: { fontSize: 10, color: colors.ink400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardPrice: { fontSize: 15, fontWeight: '700', color: colors.ink900, marginTop: 1 },
  cardBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  cardBtnTxt: { fontSize: 13, fontWeight: '600', color: 'white' },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.ink200, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.ink900, letterSpacing: -0.3, flex: 1, marginRight: 12 },
  sheetDesc: { fontSize: 14, color: colors.ink500, lineHeight: 22, marginBottom: 20 },
  sheetPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.ink100 },
  sheetPriceLabel: { fontSize: 10, color: colors.ink400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetPrice: { fontSize: 18, fontWeight: '700', color: colors.ink900, marginTop: 1 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.navy800, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  sheetBtnTxt: { fontSize: 14, fontWeight: '600', color: 'white' },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.ink500 },
})
