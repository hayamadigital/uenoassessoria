import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getAviso } from '@ueno/firebase/queries/avisos'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TipoAviso } from '@ueno/firebase'

const { width: SCREEN_W } = Dimensions.get('window')
const HERO_HEIGHT = 260

const TIPO_LABEL: Record<TipoAviso, string> = {
  logistica: 'Logística',
  promocao: 'Promoção',
  data_comemorativa: 'Data Comemorativa',
  geral: 'Aviso',
}

const TIPO_COLORS: Record<TipoAviso, { bg: string; text: string }> = {
  logistica:         { bg: '#FEE2E2', text: '#991B1B' },
  promocao:          { bg: '#EDE9FE', text: '#5B21B6' },
  data_comemorativa: { bg: '#FEF9C3', text: '#854D0E' },
  geral:             { bg: '#F1F5F9', text: '#475569' },
}

export default function AvisoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [activeIndex, setActiveIndex] = useState(0)

  const { data: aviso, isLoading } = useQuery({
    queryKey: ['aviso', id],
    queryFn: () => getAviso(db, id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink50 }}>
        <ActivityIndicator color={colors.navy800} />
      </View>
    )
  }

  if (!aviso) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink50 }}>
        <Text style={{ color: colors.ink500 }}>Aviso não encontrado</Text>
      </View>
    )
  }

  const allImages = [aviso.banner_url, ...aviso.imagens_carrossel]
  const tipoColors = TIPO_COLORS[aviso.tipo]

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink50 }}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <View style={{ height: HERO_HEIGHT, width: SCREEN_W }}>
          <FlatList
            data={allImages}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
              setActiveIndex(idx)
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{ width: SCREEN_W, height: HERO_HEIGHT }}
                resizeMode="cover"
              />
            )}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[s.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="white" />
          </TouchableOpacity>

          {/* Dots */}
          {allImages.length > 1 && (
            <View style={s.dotsRow}>
              {allImages.map((_, i) => (
                <View
                  key={i}
                  style={[s.dot, i === activeIndex ? s.dotActive : s.dotInactive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={s.content}>
          <View style={[s.tipoBadge, { backgroundColor: tipoColors.bg }]}>
            <Text style={[s.tipoTxt, { color: tipoColors.text }]}>
              {TIPO_LABEL[aviso.tipo].toUpperCase()}
            </Text>
          </View>

          <Text style={s.titulo}>{aviso.titulo}</Text>

          <View style={s.datesRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.ink500} />
            <Text style={s.dates}>
              {' '}
              {format(new Date(aviso.data_publicacao), "d 'de' MMM", { locale: ptBR })}
              {' → '}
              {format(new Date(aviso.data_encerramento), "d 'de' MMM yyyy", { locale: ptBR })}
            </Text>
          </View>

          <Text style={s.descricao}>{aviso.descricao}</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { height: 4, borderRadius: 2 },
  dotActive: { width: 16, backgroundColor: 'white' },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.5)' },

  content: { padding: 20, paddingBottom: 36 },

  tipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  tipoTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 8,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dates: { fontSize: 13, color: colors.ink500 },

  descricao: {
    fontSize: 15,
    color: colors.ink700,
    lineHeight: 22,
  },
})
