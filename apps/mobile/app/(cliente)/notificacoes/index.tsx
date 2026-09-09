import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { colors } from '@/theme'
import { listNotificacoes, markAllNotificacoesAsRead } from '@ueno/firebase/queries/notificacoes'

export default function NotificacoesClienteScreen() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes', session?.userId],
    queryFn: () => listNotificacoes(db, session!.userId),
    enabled: !!session,
  })

  const markAllRead = async () => {
    if (!session || notificacoes.every((item) => item.lida)) return
    await markAllNotificacoesAsRead(db, session.userId)
    await queryClient.invalidateQueries({ queryKey: ['notificacoes', session.userId] })
    await queryClient.invalidateQueries({ queryKey: ['notif-unread', session.userId] })
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.ink800} /></TouchableOpacity>
        <Text style={s.title}>Notificações</Text>
        <TouchableOpacity onPress={markAllRead}><Text style={s.mark}>Marcar lidas</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {isLoading ? <Text style={s.empty}>Carregando notificações...</Text> : notificacoes.length === 0 ? <Text style={s.empty}>Você não tem notificações.</Text> : notificacoes.map((item) => (
          <View key={item.id} style={[s.card, !item.lida && s.unread]}>
            <View style={s.icon}><Ionicons name={item.lida ? 'notifications-outline' : 'notifications'} size={19} color={colors.navy800} /></View>
            <View style={s.body}><Text style={s.cardTitle}>{item.titulo}</Text><Text style={s.cardText}>{item.corpo}</Text><Text style={s.date}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text></View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.ink100, backgroundColor: colors.white },
  back: { padding: 4, marginRight: 12 }, title: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.ink900 }, mark: { color: colors.navy800, fontSize: 12, fontWeight: '600' },
  content: { padding: 18, gap: 10 }, card: { flexDirection: 'row', gap: 12, padding: 15, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100 }, unread: { borderColor: colors.navy800, backgroundColor: '#F5F7FF' }, icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8EDFF' }, body: { flex: 1 }, cardTitle: { fontWeight: '700', color: colors.ink900, fontSize: 15 }, cardText: { color: colors.ink600, marginTop: 4, lineHeight: 19 }, date: { color: colors.ink400, fontSize: 11, marginTop: 8 }, empty: { textAlign: 'center', color: colors.ink500, marginTop: 50 },
})
