import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listAvaliacoes } from '@ueno/firebase/queries/avaliacoes'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function Stars({ nota }: { nota: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= nota ? 'star' : 'star-outline'}
          size={12}
          color={i <= nota ? colors.warn : colors.ink300}
        />
      ))}
    </View>
  )
}

const TIPO_LABEL: Record<string, string> = {
  servico: 'Serviço',
  material: 'Material',
  simulado: 'Simulado',
}

export default function AvaliacoesAdminScreen() {
  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: ['admin-avaliacoes'],
    queryFn: () => listAvaliacoes(db),
  })

  const media = avaliacoes && avaliacoes.length > 0
    ? (avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)
    : '—'
  const pendentes = (avaliacoes ?? []).filter((a) => !a.respondido_em).length

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Módulos · Avaliações</Text>
          <Text style={s.headerTitle}>Feedbacks</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Highlight card */}
        <View style={s.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroLabel}>MÉDIA GERAL</Text>
            <Text style={s.heroScore}>{media}</Text>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons key={i} name="star" size={14} color="rgba(255,255,255,0.9)" />
              ))}
            </View>
          </View>
          <View style={{ gap: 10, alignItems: 'flex-end' }}>
            <View style={s.heroStat}>
              <Text style={s.heroStatN}>{avaliacoes?.length ?? 0}</Text>
              <Text style={s.heroStatL}>Total</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={[s.heroStatN, { color: '#FCD34D' }]}>{pendentes}</Text>
              <Text style={s.heroStatL}>Pendentes</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionLabel}>FEEDBACKS RECEBIDOS</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : (avaliacoes ?? []).length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="star-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTxt}>Nenhuma avaliação ainda</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(avaliacoes ?? []).map((av) => {
              const dt = av.created_at
                ? format(new Date(av.created_at), "d 'de' MMM", { locale: ptBR })
                : '—'
              const tipoLabel = TIPO_LABEL[av.tipo] ?? av.tipo
              return (
                <View key={av.id} style={s.avCard}>
                  <View style={s.avTop}>
                    <View style={s.avNameRow}>
                      <View style={s.avAvatar}>
                        <Text style={s.avAvatarTxt}>
                          {(av.cliente_nome ?? '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.avName} numberOfLines={1}>
                          {av.cliente_nome ?? 'Cliente'}
                        </Text>
                        <Text style={s.avMeta}>{tipoLabel} · {dt}</Text>
                      </View>
                    </View>
                    <Stars nota={av.nota} />
                  </View>
                  {av.comentario ? (
                    <Text style={s.avComment} numberOfLines={3}>{av.comentario}</Text>
                  ) : null}
                  {!av.respondido_em && (
                    <TouchableOpacity style={s.respondBtn}>
                      <Text style={s.respondBtnTxt}>Responder</Text>
                    </TouchableOpacity>
                  )}
                  {av.respondido_em && av.resposta_admin ? (
                    <View style={s.responseBox}>
                      <Text style={s.responseLabel}>Resposta da assessoria</Text>
                      <Text style={s.responseText} numberOfLines={2}>{av.resposta_admin}</Text>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  heroCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.warn, borderRadius: 18, padding: 18, marginBottom: 20,
  },
  heroLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroScore: { fontSize: 40, fontWeight: '700', color: colors.white, letterSpacing: -1, marginTop: 2 },
  heroStat: { alignItems: 'flex-end' },
  heroStatN: { fontSize: 20, fontWeight: '700', color: colors.white, letterSpacing: -0.5 },
  heroStatL: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  avCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.ink100, gap: 10,
  },
  avTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warn + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  avAvatarTxt: { fontSize: 14, fontWeight: '700', color: colors.warn },
  avName: { fontSize: 13, fontWeight: '600', color: colors.ink900 },
  avMeta: { fontSize: 11, color: colors.ink500, marginTop: 1 },
  avComment: { fontSize: 12.5, color: colors.ink700, lineHeight: 18 },
  respondBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9,
    backgroundColor: colors.navy800,
  },
  respondBtnTxt: { fontSize: 12, fontWeight: '600', color: colors.white },
  responseBox: {
    backgroundColor: colors.navy50, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.navy100,
  },
  responseLabel: { fontSize: 10, fontWeight: '600', color: colors.navy800, marginBottom: 3 },
  responseText: { fontSize: 12, color: colors.ink700, lineHeight: 17 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 13, color: colors.ink400 },
})
