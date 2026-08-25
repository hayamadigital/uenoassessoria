import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import { useAuthStore } from '@/stores/auth.store'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { StatusAgendamento } from '@ueno/firebase'

const STATUS: Record<StatusAgendamento, { label: string; bg: string; fg: string }> = {
  agendado: { label: 'Agendado', bg: '#DBEAFE', fg: '#1D4ED8' },
  confirmado: { label: 'Confirmado', bg: '#DCFCE7', fg: '#15803D' },
  em_andamento: { label: 'Em andamento', bg: '#FEF3C7', fg: '#92400E' },
  concluido: { label: 'Concluído', bg: '#F1F5F9', fg: '#475569' },
  cancelado: { label: 'Cancelado', bg: '#FEE2E2', fg: '#B91C1C' },
  faltou: { label: 'Ausente', bg: '#FEE2E2', fg: '#B91C1C' },
}

function formatDate(value: string) {
  return format(new Date(value), "EEEE, dd 'de' MMMM", { locale: ptBR })
}

function formatTimeRange(start: string, end: string) {
  return `${format(new Date(start), 'HH:mm')} - ${format(new Date(end), 'HH:mm')}`
}

export default function AgendaScreen() {
  const { session } = useAuthStore()
  const [nowIso] = useState(() => new Date().toISOString())

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['cliente', cliente?.id, 'proximo-agendamento', nowIso],
    queryFn: () => listAgendamentos(db, { cliente_id: cliente!.id, data_inicio: nowIso }),
    enabled: !!cliente,
  })

  const proximo = agendamentos
    .filter((item) => item.status !== 'cancelado' && item.status !== 'faltou')
    .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime())[0]

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color={colors.ink900} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerSub}>Agenda</Text>
            <Text style={s.headerTitle}>Próximo evento</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator color={colors.navy800} />
          </View>
        ) : !proximo ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={42} color={colors.ink300} />
            <Text style={s.emptyTitle}>Nenhum evento futuro</Text>
            <Text style={s.emptyText}>Quando houver um agendamento confirmado, ele aparecerá aqui.</Text>
          </View>
        ) : (
          <View style={s.eventCard}>
            <View style={s.eventTop}>
              <View style={s.dateBox}>
                <Text style={s.dateMonth}>{format(new Date(proximo.data_hora_inicio), 'MMM', { locale: ptBR }).toUpperCase()}</Text>
                <Text style={s.dateDay}>{format(new Date(proximo.data_hora_inicio), 'dd')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={[s.chip, { backgroundColor: STATUS[proximo.status].bg }]}>
                  <Text style={[s.chipTxt, { color: STATUS[proximo.status].fg }]}>{STATUS[proximo.status].label}</Text>
                </View>
                <Text style={s.eventTitle}>{proximo.servico?.nome ?? proximo.servico_nome ?? 'Evento Ueno'}</Text>
                <Text style={s.eventDate}>{formatDate(proximo.data_hora_inicio)}</Text>
              </View>
            </View>

            <View style={s.infoList}>
              <View style={s.infoRow}>
                <Ionicons name="time-outline" size={17} color={colors.navy800} />
                <Text style={s.infoText}>{formatTimeRange(proximo.data_hora_inicio, proximo.data_hora_fim)}</Text>
              </View>
              <View style={s.infoRow}>
                <Ionicons name="person-outline" size={17} color={colors.navy800} />
                <Text style={s.infoText}>{proximo.instrutor?.full_name ?? proximo.instrutor_nome ?? 'Instrutor a definir'}</Text>
              </View>
              <View style={s.infoRow}>
                <Ionicons name="location-outline" size={17} color={colors.navy800} />
                <Text style={s.infoText}>{proximo.local ?? 'Local a definir'}</Text>
              </View>
            </View>

            {proximo.notas_admin ? (
              <View style={s.noteBox}>
                <Text style={s.noteLabel}>Observação</Text>
                <Text style={s.noteText}>{proximo.notas_admin}</Text>
              </View>
            ) : null}

            {proximo.local ? (
              <TouchableOpacity
                style={s.mapBtn}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proximo.local!)}`)}
                activeOpacity={0.85}
              >
                <Ionicons name="map-outline" size={16} color={colors.white} />
                <Text style={s.mapBtnTxt}>Abrir localização</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 12, color: colors.ink500, fontWeight: '600' },
  headerTitle: { fontSize: 24, color: colors.ink900, fontWeight: '800', letterSpacing: -0.5 },
  loading: { paddingVertical: 70 },
  empty: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 18, padding: 28, alignItems: 'center' },
  emptyTitle: { color: colors.ink900, fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptyText: { color: colors.ink500, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 5 },
  eventCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 20, padding: 16 },
  eventTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  dateBox: { width: 58, height: 66, borderRadius: 14, backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { color: colors.navy800, fontSize: 10, fontWeight: '900' },
  dateDay: { color: colors.ink900, fontSize: 24, fontWeight: '900', marginTop: 1 },
  chip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginBottom: 7 },
  chipTxt: { fontSize: 10.5, fontWeight: '800' },
  eventTitle: { color: colors.ink900, fontSize: 18, fontWeight: '900', lineHeight: 22 },
  eventDate: { color: colors.ink500, fontSize: 12.5, marginTop: 4, textTransform: 'capitalize' },
  infoList: { marginTop: 18, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  infoText: { color: colors.ink800, fontSize: 13, fontWeight: '700', flex: 1 },
  noteBox: { marginTop: 14, borderRadius: 12, backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100, padding: 12 },
  noteLabel: { color: colors.navy800, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  noteText: { color: colors.ink700, fontSize: 13, lineHeight: 19 },
  mapBtn: { marginTop: 14, minHeight: 44, borderRadius: 12, backgroundColor: colors.navy800, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapBtnTxt: { color: colors.white, fontSize: 13, fontWeight: '900' },
})
