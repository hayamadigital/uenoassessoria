import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { listAgendamentos, updateAgendamentoStatus, listAgendamentosByDate } from '@ueno/firebase/queries/agendamentos'
import { colors } from '@/theme'
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { StatusAgendamento } from '@ueno/firebase'

const STATUS_LABEL: Record<StatusAgendamento, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
}

const STATUS_COLOR: Record<StatusAgendamento, string> = {
  agendado: '#7C3AED',
  confirmado: colors.navy600,
  em_andamento: colors.warn,
  concluido: colors.ok,
  cancelado: colors.err,
  faltou: colors.ink400,
}

function getWeekDays(anchor: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startOfDay(anchor), i - 3))
}

function toJSTDateString(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

export default function AgendaAdminScreen() {
  const today = startOfDay(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const queryClient = useQueryClient()

  const weekDays = getWeekDays(selectedDate)
  const dateStr = toJSTDateString(selectedDate)

  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['agendamentos-dia', dateStr],
    queryFn: () => listAgendamentosByDate(db, dateStr),
    refetchInterval: 60_000,
  })

  const { data: semanaAll } = useQuery({
    queryKey: ['agendamentos-semana'],
    queryFn: () => listAgendamentos(db, {
      data_inicio: new Date(`${toJSTDateString(weekDays[0])}T00:00:00+09:00`).toISOString(),
      data_fim: new Date(`${toJSTDateString(weekDays[6])}T23:59:59+09:00`).toISOString(),
    }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAgendamento }) =>
      updateAgendamentoStatus(db, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-dia', dateStr] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos-semana'] })
    },
  })

  const confirmados = (agendamentos ?? []).filter((a) => a.status === 'confirmado').length
  const emAndamento = (agendamentos ?? []).filter((a) => a.status === 'em_andamento').length
  const concluidos = (agendamentos ?? []).filter((a) => a.status === 'concluido').length

  function countForDay(d: Date): number {
    return (semanaAll ?? []).filter((a) => {
      try { return isSameDay(parseISO(a.data_hora_inicio), d) }
      catch { return false }
    }).length
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerSub}>{format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}</Text>
            <Text style={s.headerTitle}>Calendário</Text>
          </View>
          <TouchableOpacity style={s.todayBtn} onPress={() => setSelectedDate(today)} activeOpacity={0.8}>
            <Ionicons name="today-outline" size={15} color={colors.navy800} />
            <Text style={s.todayTxt}>Hoje</Text>
          </TouchableOpacity>
        </View>

        {/* Week strip */}
        <View style={s.weekStrip}>
          {weekDays.map((d, i) => {
            const isToday = isSameDay(d, today)
            const isSelected = isSameDay(d, selectedDate)
            const cnt = countForDay(d)
            return (
              <TouchableOpacity key={i} style={s.dayCol} onPress={() => setSelectedDate(d)} activeOpacity={0.7}>
                <Text style={[s.dayName, isSelected && s.dayNameActive]}>
                  {format(d, 'EEE', { locale: ptBR }).slice(0, 3).toUpperCase()}
                </Text>
                <View style={[s.dayCircle, isSelected && s.dayCircleActive, isToday && !isSelected && s.dayCircleToday]}>
                  <Text style={[s.dayNum, isSelected && s.dayNumActive, isToday && !isSelected && { color: colors.navy800 }]}>
                    {format(d, 'd')}
                  </Text>
                </View>
                {cnt > 0 && (
                  <View style={[s.dayDot, isSelected && { backgroundColor: 'white' }]} />
                )}
                {cnt === 0 && <View style={{ height: 5 }} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Summary stats */}
        <View style={s.statsRow}>
          {[
            { n: confirmados, l: 'Confirmados', c: colors.navy600 },
            { n: emAndamento, l: 'Em andamento', c: colors.warn },
            { n: concluidos, l: 'Concluídos', c: colors.ok },
          ].map(({ n, l, c }) => (
            <View key={l} style={s.statCard}>
              <Text style={[s.statN, { color: c }]}>{n}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Day label */}
        <View style={s.sectionRow}>
          <Text style={s.sectionLabel}>
            {isSameDay(selectedDate, today)
              ? 'HOJE'
              : format(selectedDate, "EEEE, d 'de' MMM", { locale: ptBR }).toUpperCase()}
          </Text>
          <Text style={s.sectionCount}>{agendamentos?.length ?? 0} agendamentos</Text>
        </View>

        {/* Event list */}
        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : (agendamentos?.length ?? 0) === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={38} color={colors.ink200} />
            <Text style={s.emptyTxt}>Sem agendamentos neste dia</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {agendamentos!.map((a) => {
              const cor = STATUS_COLOR[a.status]
              const hora = new Date(a.data_hora_inicio).toLocaleTimeString('pt-BR', {
                timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit',
              })
              const horaFim = a.data_hora_fim
                ? new Date(a.data_hora_fim).toLocaleTimeString('pt-BR', {
                    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit',
                  })
                : null
              return (
                <View key={a.id} style={s.eventCard}>
                  <View style={[s.eventBorder, { backgroundColor: cor }]} />
                  <View style={s.eventMain}>
                    <View style={s.eventTopRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.eventName} numberOfLines={1}>
                          {(a as any).cliente?.profile?.full_name ?? '—'}
                        </Text>
                        <Text style={s.eventService} numberOfLines={1}>
                          {(a as any).servico?.nome ?? '—'}
                        </Text>
                      </View>
                      <View style={[s.statusChip, { backgroundColor: cor + '18' }]}>
                        <Text style={[s.statusTxt, { color: cor }]}>{STATUS_LABEL[a.status]}</Text>
                      </View>
                    </View>

                    <View style={s.eventMeta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color={colors.ink400} />
                        <Text style={s.eventMetaTxt}>{hora}{horaFim ? ` – ${horaFim}` : ''}</Text>
                      </View>
                      {(a as any).instrutor?.full_name && (
                        <>
                          <View style={s.dot} />
                          <Ionicons name="person-outline" size={12} color={colors.ink400} />
                          <Text style={s.eventMetaTxt} numberOfLines={1}>{(a as any).instrutor.full_name}</Text>
                        </>
                      )}
                    </View>

                    {/* Action buttons */}
                    <View style={s.actions}>
                      {a.status === 'agendado' && (
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.navy600 }]}
                          onPress={() => statusMutation.mutate({ id: a.id, status: 'confirmado' })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark" size={12} color={colors.navy600} />
                          <Text style={[s.actionTxt, { color: colors.navy600 }]}>Confirmar</Text>
                        </TouchableOpacity>
                      )}
                      {(a.status === 'confirmado' || a.status === 'agendado') && (
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.ok }]}
                          onPress={() => statusMutation.mutate({ id: a.id, status: 'concluido' })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-done" size={12} color={colors.ok} />
                          <Text style={[s.actionTxt, { color: colors.ok }]}>Concluir</Text>
                        </TouchableOpacity>
                      )}
                      {a.status !== 'cancelado' && a.status !== 'concluido' && (
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.err }]}
                          onPress={() => statusMutation.mutate({ id: a.id, status: 'cancelado' })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={12} color={colors.err} />
                          <Text style={[s.actionTxt, { color: colors.err }]}>Cancelar</Text>
                        </TouchableOpacity>
                      )}
                      {a.status !== 'faltou' && a.status !== 'concluido' && a.status !== 'cancelado' && (
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.ink400 }]}
                          onPress={() => statusMutation.mutate({ id: a.id, status: 'faltou' })}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.actionTxt, { color: colors.ink500 }]}>Faltou</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
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
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  headerSub: { fontSize: 11, color: colors.ink500, textTransform: 'capitalize' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.ink900, letterSpacing: -0.4, marginTop: 1 },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.navy100, borderWidth: 1, borderColor: colors.navy800 + '30',
  },
  todayTxt: { fontSize: 12, fontWeight: '600', color: colors.navy800 },

  weekStrip: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  dayCol: { flex: 1, alignItems: 'center', gap: 5 },
  dayName: { fontSize: 10, fontWeight: '600', color: colors.ink400, letterSpacing: 0.5 },
  dayNameActive: { color: colors.navy800 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: colors.navy800 },
  dayCircleToday: { borderWidth: 1.5, borderColor: colors.navy800 },
  dayNum: { fontSize: 14, fontWeight: '600', color: colors.ink700 },
  dayNumActive: { color: 'white' },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.navy600 },

  statsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  statCard: {
    flex: 1, backgroundColor: colors.ink50, borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: colors.ink100,
  },
  statN: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  statL: { fontSize: 10, color: colors.ink500, marginTop: 2, textAlign: 'center' },

  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, letterSpacing: 0.8 },
  sectionCount: { fontSize: 12, color: colors.ink400 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTxt: { fontSize: 14, color: colors.ink400, fontWeight: '500' },

  eventCard: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16,
    borderWidth: 1, borderColor: colors.ink100, overflow: 'hidden',
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  eventBorder: { width: 4 },
  eventMain: { flex: 1, padding: 13 },
  eventTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  eventName: { fontSize: 13.5, fontWeight: '700', color: colors.ink900, letterSpacing: -0.2 },
  eventService: { fontSize: 11.5, color: colors.ink500, marginTop: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, flexShrink: 0 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  eventMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 10, borderTopWidth: 1, borderTopColor: colors.ink100, paddingTop: 8,
  },
  eventMetaTxt: { fontSize: 11, color: colors.ink500 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.ink400 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  actionTxt: { fontSize: 11, fontWeight: '600' },
})
