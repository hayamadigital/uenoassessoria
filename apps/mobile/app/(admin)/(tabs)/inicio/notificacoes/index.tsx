import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors } from '@/theme'

const NOTIF_ITEMS = [
  {
    icon: 'cloud-upload-outline' as const,
    color: colors.navy800,
    title: 'Ricardo enviou novo documento',
    desc: 'Histórico de viagem · aguardando análise',
    time: 'agora',
    unread: true,
  },
  {
    icon: 'card-outline' as const,
    color: colors.ok,
    title: 'Pagamento confirmado · ¥ 78.000',
    desc: 'Patrícia Yamamoto · Transferência CNH',
    time: 'há 12 min',
    unread: true,
  },
  {
    icon: 'calendar-outline' as const,
    color: '#0891B2',
    title: 'Nova solicitação de agendamento',
    desc: 'Bruno Saito · Aula prática · 16/mai 14:00',
    time: 'há 1h',
    unread: true,
  },
  {
    icon: 'star-outline' as const,
    color: colors.warn,
    title: 'Avaliação 5 estrelas recebida',
    desc: 'Carlos Oda — "Yuki me acompanhou em tudo..."',
    time: 'há 3h',
    unread: false,
  },
  {
    icon: 'chatbubble-outline' as const,
    color: '#7E22CE',
    title: '3 mensagens não lidas',
    desc: 'Marina, Lucas e Bruno',
    time: 'hoje',
    unread: false,
  },
]

const FILTERS = ['Todas · 12', 'Documentos · 4', 'Pagamentos · 2', 'Agenda · 3']

export default function NotificacoesAdminScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notificações</Text>
        </View>
        <TouchableOpacity style={s.markAllBtn}>
          <Text style={s.markAllTxt}>Marcar todas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
          {FILTERS.map((f, i) => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, i === 0 && s.filterChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipTxt, i === 0 && s.filterChipTxtActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ gap: 9 }}>
          {NOTIF_ITEMS.map((item, i) => (
            <View key={i} style={[s.notifCard, item.unread && s.notifCardUnread]}>
              <View style={[s.notifIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.notifTop}>
                  <Text style={s.notifTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.notifTime}>{item.time}</Text>
                </View>
                <Text style={s.notifDesc} numberOfLines={2}>{item.desc}</Text>
              </View>
              {item.unread && <View style={[s.unreadDot, { backgroundColor: colors.navy800 }]} />}
            </View>
          ))}
        </View>

        <View style={s.sendCard}>
          <View style={s.sendIcon}>
            <Ionicons name="send-outline" size={20} color={colors.navy800} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sendTitle}>Enviar notificação</Text>
            <Text style={s.sendDesc}>Envie alertas para clientes ou toda a base.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.navy800} />
        </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  markAllTxt: { fontSize: 12, fontWeight: '600', color: colors.navy800 },

  scroll: { flex: 1 },
  content: { paddingVertical: 16, paddingBottom: 32, gap: 0 },

  filtersScroll: { marginBottom: 14 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink200,
  },
  filterChipActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  filterChipTxt: { fontSize: 12, fontWeight: '600', color: colors.ink700 },
  filterChipTxtActive: { color: colors.white },

  notifCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', gap: 11, alignItems: 'flex-start',
    marginHorizontal: 16, marginBottom: 9, position: 'relative',
  },
  notifCardUnread: {
    backgroundColor: colors.navy50, borderColor: colors.navy100,
  },
  notifIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  notifTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink900, letterSpacing: -0.2 },
  notifTime: { fontSize: 10.5, color: colors.ink400, flexShrink: 0 },
  notifDesc: { fontSize: 11.5, color: colors.ink500, lineHeight: 16 },
  unreadDot: { width: 7, height: 7, borderRadius: 999, position: 'absolute', top: 13, right: 13 },

  sendCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100,
    borderRadius: 14, padding: 14, marginHorizontal: 16, marginTop: 6,
  },
  sendIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  sendTitle: { fontSize: 13, fontWeight: '600', color: colors.ink900 },
  sendDesc: { fontSize: 11, color: colors.ink500, marginTop: 1 },
})
