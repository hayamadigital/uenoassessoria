import { useState } from 'react'
import { View, Text, ScrollView, FlatList, ImageBackground, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { listEtapasByProcesso } from '@ueno/firebase/queries/etapas'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import { countUnreadNotificacoes } from '@ueno/firebase/queries/notificacoes'
import { listAvisosAtivos } from '@ueno/firebase/queries/avisos'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Aviso, TipoAviso } from '@ueno/firebase'

const FAQ_ITEMS = [
  { t: 'Documentação', q: 'Quais documentos preciso traduzir para o gaimen kirikae?' },
  { t: 'Trânsito', q: 'Posso usar a CNH brasileira no Japão temporariamente?' },
  { t: 'Prazos', q: 'Quanto tempo leva o processo de transferência?' },
  { t: 'Prova', q: 'Como funciona o exame prático no Japão?' },
  { t: 'Custos', q: 'Quanto custa o processo de habilitação completo?' },
]

const QUICK = [
  { label: 'Enviar\ndocumento', icon: 'cloud-upload-outline' as const, color: colors.navy800, route: '/(cliente)/documentos' },
  { label: 'Agendar\nconsulta', icon: 'calendar-outline' as const, color: '#0891B2', route: '/(cliente)/agenda' },
  { label: 'Falar com\nequipe', icon: 'chatbubble-outline' as const, color: '#0F766E', route: '/(cliente)/inicio' },
  { label: 'Faturas', icon: 'card-outline' as const, color: '#7E22CE', route: '/(cliente)/financeiro' },
]

const ETAPA_LABELS = ['Contratação', 'Documentos', 'Análise', 'Departamento', 'Aprovação']

const TIPO_AVISO_COLORS: Record<TipoAviso, [string, string]> = {
  logistica:         ['#DC2626', '#F59E0B'],
  promocao:          ['#7C3AED', '#3B82F6'],
  data_comemorativa: ['#1D4ED8', '#7C3AED'],
  geral:             ['#0F766E', '#0891B2'],
}

const TIPO_AVISO_LABEL: Record<TipoAviso, string> = {
  logistica: 'LOGÍSTICA',
  promocao: 'PROMOÇÃO',
  data_comemorativa: 'DATA COMEMORATIVA',
  geral: 'AVISO',
}

export default function InicioScreen() {
  const { session } = useAuthStore()
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: processos } = useQuery({
    queryKey: ['processos', cliente?.id],
    queryFn: () => listProcessosByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const activeProcesso = processos?.find((p) => p.status === 'ativo')

  const { data: etapas } = useQuery({
    queryKey: ['etapas', activeProcesso?.id],
    queryFn: () => listEtapasByProcesso(db, activeProcesso!.id),
    enabled: !!activeProcesso,
  })

  const { data: agendamentos } = useQuery({
    queryKey: ['agendamentos', 'prox', cliente?.id],
    queryFn: () => listAgendamentos(db, { cliente_id: cliente!.id }),
    enabled: !!cliente,
  })

  const { data: unread = 0 } = useQuery({
    queryKey: ['notif-unread', session?.userId],
    queryFn: () => countUnreadNotificacoes(db, session!.userId),
    enabled: !!session,
  })

  const nomeServico = (activeProcesso as any)?.servico?.nome as string | undefined

  const { data: avisos = [] } = useQuery({
    queryKey: ['avisos-ativos', nomeServico],
    queryFn: () => listAvisosAtivos(db, nomeServico),
    staleTime: 5 * 60 * 1000,
  })

  const now = new Date()
  const proxAgendamento = agendamentos
    ?.filter((a) => new Date(a.data_hora_inicio) > now)
    .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime())[0]

  const totalEtapas = etapas?.length ?? 5
  const etapasConcluidas = etapas?.filter((e) => e.status === 'concluido').length ?? 0
  const etapaAtual = etapas?.find((e) => e.status === 'em_andamento') ?? etapas?.find((e) => e.status === 'pendente')

  const firstName = session?.fullName?.split(' ')[0] ?? 'Cliente'

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Avatar name={session?.fullName ?? 'Cliente'} size={42} url={session?.avatarUrl} />
            <View style={{ marginLeft: 11 }}>
              <Text style={s.greetSub}>{greeting}</Text>
              <Text style={s.greetName}>{session?.fullName ?? '—'}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.bellWrap} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.ink700} />
            {unread > 0 && <View style={s.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Avisos */}
        {avisos.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionLabel}>AVISOS</Text>
            <FlatList
              data={avisos}
              keyExtractor={(a) => a.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <AvisoBannerCard
                  aviso={item}
                  onPress={() => router.push(`/(cliente)/avisos/${item.id}` as any)}
                />
              )}
              contentContainerStyle={{ paddingRight: 4 }}
            />
          </View>
        )}

        {/* Processo ativo hero */}
        {activeProcesso ? (
          <TouchableOpacity
            style={s.heroCard}
            activeOpacity={0.88}
            onPress={() => router.push('/(cliente)/processos')}
          >
            {/* Círculos decorativos */}
            <View style={s.heroCircle1} />
            <View style={s.heroCircle2} />

            <View style={s.heroTopRow}>
              <View style={s.processoActivePill}>
                <View style={s.processoActiveDot} />
                <Text style={s.processoActiveTxt}>Processo ativo</Text>
              </View>
              <Text style={s.heroId}>#{activeProcesso.id.slice(-4).toUpperCase()}</Text>
            </View>

            <Text style={s.heroServiceLabel}>SERVIÇO</Text>
            <Text style={s.heroServiceName}>{(activeProcesso as any).servico?.nome ?? 'Serviço'}</Text>

            {/* Stepper */}
            <View style={s.stepper}>
              {Array.from({ length: totalEtapas }).map((_, i) => {
                const done = i < etapasConcluidas
                const cur = i === etapasConcluidas
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i < totalEtapas - 1 ? 1 : 0 }}>
                    <View style={[s.stepDot, done && s.stepDone, cur && s.stepCur]}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: done ? colors.navy900 : cur ? colors.navy800 : 'rgba(255,255,255,0.5)' }}>
                        {done ? '✓' : i + 1}
                      </Text>
                    </View>
                    {i < totalEtapas - 1 && <View style={[s.stepLine, { backgroundColor: done ? '#5EEAD4' : 'rgba(255,255,255,.18)' }]} />}
                  </View>
                )
              })}
            </View>

            <View style={s.heroBottom}>
              <View>
                <Text style={s.heroStepLabel}>Etapa atual</Text>
                <Text style={s.heroStepName}>{etapaAtual?.titulo ?? 'Em andamento'}</Text>
              </View>
              <View style={s.heroDetRow}>
                <Text style={s.heroDetTxt}>Ver detalhes </Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,.85)" />
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Acesso rápido */}
        <Text style={s.sectionLabel}>ACESSO RÁPIDO</Text>
        <View style={s.quickGrid}>
          {QUICK.map((q) => (
            <TouchableOpacity key={q.label} style={s.quickItem} onPress={() => router.push(q.route as any)} activeOpacity={0.75}>
              <View style={s.quickIconWrap}>
                <Ionicons name={q.icon} size={22} color={q.color} />
              </View>
              <Text style={s.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Próximo agendamento */}
        {proxAgendamento && (
          <TouchableOpacity style={s.nextAppt} activeOpacity={0.8} onPress={() => router.push('/(cliente)/agenda')}>
            <View style={s.nextApptDate}>
              <Text style={s.nextApptMon}>
                {format(new Date(proxAgendamento.data_hora_inicio), 'MMM', { locale: ptBR }).toUpperCase()}
              </Text>
              <Text style={s.nextApptDay}>
                {format(new Date(proxAgendamento.data_hora_inicio), 'd')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nextApptSubtitle}>PRÓXIMO AGENDAMENTO</Text>
              <Text style={s.nextApptTitle}>{(proxAgendamento as any).servico?.nome ?? 'Agendamento'}</Text>
              <View style={s.nextApptTimeRow}>
                <Ionicons name="time-outline" size={12} color={colors.ink500} />
                <Text style={s.nextApptTime}>
                  {' '}{format(new Date(proxAgendamento.data_hora_inicio), 'HH:mm')}
                  {proxAgendamento.local ? ` · ${proxAgendamento.local}` : ''}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.navy800} />
          </TouchableOpacity>
        )}

        {/* FAQ */}
        <View style={s.faqHeader}>
          <Text style={s.sectionLabel}>PERGUNTAS FREQUENTES</Text>
          <TouchableOpacity><Text style={s.verTudo}>Ver tudo</Text></TouchableOpacity>
        </View>
        <View style={{ gap: 8, marginBottom: 8 }}>
          {FAQ_ITEMS.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={s.faqCard}
              activeOpacity={0.75}
              onPress={() => setFaqOpen(faqOpen === i ? null : i)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.faqTag}>{f.t.toUpperCase()}</Text>
                <Text style={s.faqQ}>{f.q}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.ink400} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  greetSub: { fontSize: 12, color: colors.ink500 },
  greetName: { fontSize: 15, fontWeight: '600', color: colors.ink900, letterSpacing: -0.3 },
  bellWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.white },

  heroCard: {
    borderRadius: 24, padding: 18, marginBottom: 20,
    backgroundColor: colors.navy800,
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 36, elevation: 10,
    overflow: 'hidden',
  },
  heroCircle1: { position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,.05)' },
  heroCircle2: { position: 'absolute', right: -60, bottom: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,.04)' },

  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  processoActivePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.16)' },
  processoActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5EEAD4' },
  processoActiveTxt: { fontSize: 11, color: 'white', fontWeight: '600' },
  heroId: { fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: '500' },
  heroServiceLabel: { fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: '500', marginBottom: 2 },
  heroServiceName: { fontSize: 18, fontWeight: '700', color: 'white', letterSpacing: -0.4, marginBottom: 14 },

  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#5EEAD4' },
  stepCur: { backgroundColor: 'white', shadowColor: 'white', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4 },

  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroStepLabel: { fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 2 },
  heroStepName: { fontSize: 14, fontWeight: '600', color: 'white' },
  heroDetRow: { flexDirection: 'row', alignItems: 'center' },
  heroDetTxt: { fontSize: 12, color: 'rgba(255,255,255,.85)', fontWeight: '500' },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickIconWrap: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 10.5, fontWeight: '500', color: colors.ink700, textAlign: 'center', lineHeight: 14 },

  nextAppt: {
    backgroundColor: colors.navy50, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: colors.navy100,
    flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 24,
  },
  nextApptDate: { width: 48, height: 54, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  nextApptMon: { fontSize: 9, color: colors.navy800, fontWeight: '700', letterSpacing: 0.5 },
  nextApptDay: { fontSize: 18, fontWeight: '700', color: colors.navy800, lineHeight: 20 },
  nextApptSubtitle: { fontSize: 10, color: colors.navy700, fontWeight: '600', letterSpacing: 0.6, marginBottom: 2 },
  nextApptTitle: { fontSize: 14, fontWeight: '600', color: colors.ink900, marginBottom: 2 },
  nextApptTimeRow: { flexDirection: 'row', alignItems: 'center' },
  nextApptTime: { fontSize: 12, color: colors.ink500 },

  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  verTudo: { fontSize: 12, color: colors.navy800, fontWeight: '600' },
  faqCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  faqTag: { fontSize: 9.5, color: colors.ink400, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  faqQ: { fontSize: 13, fontWeight: '500', color: colors.ink900, lineHeight: 18 },
})

function AvisoBannerCard({ aviso, onPress }: { aviso: Aviso; onPress: () => void }) {
  const [c0, c1] = TIPO_AVISO_COLORS[aviso.tipo]
  return (
    <TouchableOpacity style={bs.card} activeOpacity={0.88} onPress={onPress}>
      <ImageBackground
        source={{ uri: aviso.banner_url }}
        style={bs.img}
        imageStyle={{ borderRadius: 12 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={bs.gradient}
        >
          <View style={[bs.tag, { backgroundColor: c0 }]}>
            <Text style={bs.tagTxt}>{TIPO_AVISO_LABEL[aviso.tipo]}</Text>
          </View>
          <Text style={bs.cardTitle} numberOfLines={2}>{aviso.titulo}</Text>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  )
}

const bs = StyleSheet.create({
  card: { width: 160, height: 80, borderRadius: 12, overflow: 'hidden', marginRight: 10 },
  img: { width: 160, height: 80 },
  gradient: { flex: 1, justifyContent: 'flex-end', padding: 8, borderRadius: 12 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 3 },
  tagTxt: { fontSize: 7.5, fontWeight: '700', color: 'white', letterSpacing: 0.3 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: 'white', lineHeight: 14 },
})
