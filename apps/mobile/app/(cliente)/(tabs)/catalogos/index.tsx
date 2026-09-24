import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { AppImage } from '@/components/AppImage'
import { colors } from '@/theme'
import type { Servico } from '@ueno/firebase'

const SERVICO_COLORS = [colors.navy800, '#0891B2', '#0F766E', '#7E22CE', colors.warn]
function formatPrecoServico(servico: Servico) {
  if (servico.usa_variacoes) return 'Variações'
  if (servico.preco_variavel && servico.preco_min_jpy != null && servico.preco_max_jpy != null) {
    return `¥ ${servico.preco_min_jpy.toLocaleString('ja-JP')} - ¥ ${servico.preco_max_jpy.toLocaleString('ja-JP')}`
  }
  return servico.preco_jpy != null
    ? `¥ ${servico.preco_jpy.toLocaleString('ja-JP')}`
    : 'Sob consulta'
}

export default function CatalogoScreen() {
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
                onView={() => router.push(`/(cliente)/servicos/${serv.id}` as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  )
}

function ServicoCard({
  servico,
  color,
  onView,
}: {
  servico: Servico
  color: string
  onView: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUri = servico.imagem_url?.trim()

  return (
    <TouchableOpacity style={s.card} onPress={onView} activeOpacity={0.88}>
      <View style={[s.cardBanner, { backgroundColor: color + '18' }]}>
        {imageUri && !imageFailed ? (
          <>
            <AppImage
              source={{ uri: imageUri }}
              style={s.cardBannerImage}
              onError={() => setImageFailed(true)}
            />
            <View style={s.cardBannerOverlay} />
          </>
        ) : (
          <>
            <Ionicons name="car-outline" size={36} color={color} />
            <Text style={[s.cardBannerTxt, { color: color + '80' }]}>Imagem do serviço</Text>
          </>
        )}
      </View>
      <View style={{ padding: 16 }}>
        <Text style={s.cardTitle}>{servico.nome}</Text>
        <Text style={s.cardDesc} numberOfLines={3}>{servico.descricao}</Text>
        <View style={s.cardBottom}>
          <View>
            <Text style={s.cardPriceLabel}>A PARTIR DE</Text>
            <Text style={s.cardPrice}>{formatPrecoServico(servico)}</Text>
          </View>
          <View style={s.cardBtn}>
            <Text style={s.cardBtnTxt}>Ver serviço</Text>
            <Ionicons name="chevron-forward" size={14} color="white" />
          </View>
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

  card: {
    backgroundColor: colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: colors.ink100,
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
    overflow: 'hidden',
  },
  cardBanner: { height: 112, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row', overflow: 'hidden', position: 'relative' },
  cardBannerImage: { width: '100%', height: '100%' },
  cardBannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9, 24, 41, 0.06)' },
  cardBannerTxt: { fontSize: 12, fontWeight: '500' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink900, letterSpacing: -0.3, marginBottom: 6, lineHeight: 20 },
  cardDesc: { fontSize: 12.5, color: colors.ink500, lineHeight: 18, marginBottom: 14 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.ink100, borderStyle: 'dashed' },
  cardPriceLabel: { fontSize: 10, color: colors.ink400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardPrice: { fontSize: 15, fontWeight: '700', color: colors.ink900, marginTop: 1 },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.navy800,
  },
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
