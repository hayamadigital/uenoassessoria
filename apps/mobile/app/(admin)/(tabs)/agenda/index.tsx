import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { createAgendamento, listAgendamentos, updateAgendamentoStatus, listAgendamentosByDate } from '@ueno/firebase/queries/agendamentos'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { listInstrutores } from '@ueno/firebase/queries/perfis'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { colors } from '@/theme'
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns'
import { enUS, ptBR } from 'date-fns/locale'
import type { AgendamentoInsert, StatusAgendamento, TipoEventoAgendamento } from '@ueno/firebase'

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

function toTimeString(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

function buildJSTIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const parsed = new Date(`${date}T${time}:00+09:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

interface EventFormState {
  tipo_evento: TipoEventoAgendamento
  data: string
  hora: string
  local: string
  observacao: string
  cliente_id: string
  instrutor_id: string
  servico_id: string
}

function makeInitialForm(date: Date): EventFormState {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setMinutes(0, 0, 0)
  nextHour.setHours(nextHour.getHours() + 1)
  return {
    tipo_evento: 'ueno',
    data: toJSTDateString(date),
    hora: toTimeString(nextHour),
    local: '',
    observacao: '',
    cliente_id: '',
    instrutor_id: '',
    servico_id: '',
  }
}

export default function AgendaAdminScreen() {
  const { t, i18n } = useTranslation('common')
  const today = startOfDay(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState<EventFormState>(() => makeInitialForm(today))
  const queryClient = useQueryClient()
  const session = useAuthStore((state) => state.session)
  const dateLocale = i18n.language === 'en' ? enUS : ptBR
  const timeLocale = i18n.language === 'en' ? 'en-US' : 'pt-BR'

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

  const { data: clientes } = useQuery({
    queryKey: ['admin-agenda-clientes'],
    queryFn: () => listClientes(db),
    staleTime: 60_000,
  })

  const { data: instrutores } = useQuery({
    queryKey: ['admin-agenda-instrutores'],
    queryFn: () => listInstrutores(db),
    staleTime: 60_000,
  })

  const { data: processosCliente, isLoading: loadingProcessos } = useQuery({
    queryKey: ['admin-agenda-processos-cliente', form.cliente_id],
    queryFn: () => listProcessosByCliente(db, form.cliente_id),
    enabled: isCreateOpen && form.tipo_evento === 'ueno' && !!form.cliente_id,
    staleTime: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAgendamento }) =>
      updateAgendamentoStatus(db, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-dia', dateStr] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos-semana'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (input: AgendamentoInsert) => createAgendamento(db, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-dia', dateStr] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos-semana'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      setIsCreateOpen(false)
      setForm(makeInitialForm(selectedDate))
    },
    onError: (err) => {
      Alert.alert(t('admin.calendar.save_failed'), err instanceof Error ? err.message : t('admin.calendar.try_again'))
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

  function updateForm(patch: Partial<EventFormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function openCreate() {
    setForm(makeInitialForm(selectedDate))
    setIsCreateOpen(true)
  }

  function submitEvent() {
    const inicio = buildJSTIso(form.data.trim(), form.hora.trim())
    if (!inicio) {
      Alert.alert(t('admin.calendar.invalid_datetime_title'), t('admin.calendar.invalid_datetime_message'))
      return
    }

    if (form.tipo_evento === 'ueno' && (!form.cliente_id || !form.instrutor_id || !form.servico_id)) {
      Alert.alert(t('admin.calendar.incomplete_title'), t('admin.calendar.incomplete_message'))
      return
    }

    const processoServico = processosCliente?.find((p) => p.servico_id === form.servico_id)
    const duracaoMin = form.tipo_evento === 'ueno'
      ? processoServico?.servico?.duracao_min ?? 60
      : 60

    createMutation.mutate({
      tipo_evento: form.tipo_evento,
      cliente_id: form.tipo_evento === 'ueno' ? form.cliente_id : null,
      instrutor_id: form.tipo_evento === 'ueno' ? form.instrutor_id : null,
      servico_id: form.tipo_evento === 'ueno' ? form.servico_id : null,
      data_hora_inicio: inicio,
      data_hora_fim: addMinutes(inicio, duracaoMin),
      status: 'agendado',
      local: form.local.trim() || null,
      notas_admin: form.observacao.trim() || null,
      notas_instrutor: null,
      created_by: session?.userId ?? null,
    })
  }

  const servicosContratadosAtivos = (processosCliente ?? [])
    .filter((p) => p.status === 'ativo' && p.servico?.is_active)
    .filter((p, index, arr) => arr.findIndex((item) => item.servico_id === p.servico_id) === index)

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerSub}>{format(selectedDate, 'MMMM yyyy', { locale: dateLocale })}</Text>
            <Text style={s.headerTitle}>{t('admin.tabs.calendar')}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.todayBtn} onPress={() => setSelectedDate(today)} activeOpacity={0.8}>
              <Ionicons name="today-outline" size={15} color={colors.navy800} />
              <Text style={s.todayTxt}>{t('today')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
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
                  {format(d, 'EEE', { locale: dateLocale }).slice(0, 3).toUpperCase()}
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
            { n: confirmados, l: t('admin.calendar.confirmed'), c: colors.navy600 },
            { n: emAndamento, l: t('admin.status.em_andamento'), c: colors.warn },
            { n: concluidos, l: t('admin.status.concluido'), c: colors.ok },
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
              ? t('today').toUpperCase()
              : format(selectedDate, 'EEEE, d MMM', { locale: dateLocale }).toUpperCase()}
          </Text>
          <Text style={s.sectionCount}>{t('admin.calendar.appointment_count', { count: agendamentos?.length ?? 0 })}</Text>
        </View>

        {/* Event list */}
        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : (agendamentos?.length ?? 0) === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={38} color={colors.ink200} />
            <Text style={s.emptyTxt}>{t('admin.calendar.no_appointments_day')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {agendamentos!.map((a) => {
              const cor = STATUS_COLOR[a.status]
              const isPessoal = (a as any).tipo_evento === 'pessoal'
              const hora = new Date(a.data_hora_inicio).toLocaleTimeString(timeLocale, {
                timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit',
              })
              const horaFim = a.data_hora_fim
                ? new Date(a.data_hora_fim).toLocaleTimeString(timeLocale, {
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
                          {isPessoal ? t('admin.calendar.personal_event') : (a as any).cliente?.profile?.full_name ?? '—'}
                        </Text>
                        <Text style={s.eventService} numberOfLines={1}>
                          {isPessoal ? a.notas_admin ?? t('admin.calendar.commitment_no_client') : (a as any).servico?.nome ?? '—'}
                        </Text>
                      </View>
                      <View style={[s.statusChip, { backgroundColor: cor + '18' }]}>
                        <Text style={[s.statusTxt, { color: cor }]}>{t(`admin.calendar.status.${a.status}`)}</Text>
                      </View>
                    </View>

                    <View style={s.eventMeta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color={colors.ink400} />
                        <Text style={s.eventMetaTxt}>{hora}{horaFim ? ` – ${horaFim}` : ''}</Text>
                      </View>
                      {isPessoal && (
                        <>
                          <View style={s.dot} />
                          <Ionicons name="bookmark-outline" size={12} color={colors.ink400} />
                          <Text style={s.eventMetaTxt}>{t('admin.calendar.personal')}</Text>
                        </>
                      )}
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
                          <Text style={[s.actionTxt, { color: colors.navy600 }]}>{t('admin.calendar.confirm')}</Text>
                        </TouchableOpacity>
                      )}
                      {(a.status === 'confirmado' || a.status === 'agendado') && (
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.ok }]}
                          onPress={() => statusMutation.mutate({ id: a.id, status: 'concluido' })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-done" size={12} color={colors.ok} />
                          <Text style={[s.actionTxt, { color: colors.ok }]}>{t('admin.calendar.finish')}</Text>
                        </TouchableOpacity>
                      )}
                      {a.status !== 'cancelado' && a.status !== 'concluido' && (
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.err }]}
                          onPress={() => statusMutation.mutate({ id: a.id, status: 'cancelado' })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={12} color={colors.err} />
                          <Text style={[s.actionTxt, { color: colors.err }]}>{t('cancel')}</Text>
                        </TouchableOpacity>
                      )}
                      {a.status !== 'faltou' && a.status !== 'concluido' && a.status !== 'cancelado' && (
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.ink400 }]}
                          onPress={() => statusMutation.mutate({ id: a.id, status: 'faltou' })}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.actionTxt, { color: colors.ink500 }]}>{t('admin.calendar.missed')}</Text>
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

      <Modal visible={isCreateOpen} transparent animationType="slide" onRequestClose={() => setIsCreateOpen(false)}>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalKicker}>{t('admin.calendar.new_event')}</Text>
                <Text style={s.modalTitle}>{t('admin.calendar.add_to_calendar')}</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setIsCreateOpen(false)} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color={colors.ink500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} contentContainerStyle={s.formBody} showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>{t('admin.calendar.event_type')}</Text>
              <View style={s.segment}>
                {([
                  { value: 'ueno', label: 'UENO' },
                  { value: 'pessoal', label: t('admin.calendar.personal') },
                ] as const).map((option) => {
                  const active = form.tipo_evento === option.value
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[s.segmentBtn, active && s.segmentBtnActive]}
                      onPress={() => updateForm({
                        tipo_evento: option.value,
                        cliente_id: option.value === 'pessoal' ? '' : form.cliente_id,
                        instrutor_id: option.value === 'pessoal' ? '' : form.instrutor_id,
                        servico_id: option.value === 'pessoal' ? '' : form.servico_id,
                      })}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.segmentTxt, active && s.segmentTxtActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View style={s.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>{t('date')}</Text>
                  <TextInput
                    value={form.data}
                    onChangeText={(value: string) => updateForm({ data: value })}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.ink300}
                    style={s.input}
                  />
                </View>
                <View style={{ width: 112 }}>
                  <Text style={s.fieldLabel}>{t('hour')}</Text>
                  <TextInput
                    value={form.hora}
                    onChangeText={(value: string) => updateForm({ hora: value })}
                    placeholder="HH:mm"
                    placeholderTextColor={colors.ink300}
                    style={s.input}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <Text style={s.fieldLabel}>{t('admin.calendar.location')}</Text>
              <TextInput
                value={form.local}
                onChangeText={(value: string) => updateForm({ local: value })}
                placeholder={t('admin.calendar.location_placeholder')}
                placeholderTextColor={colors.ink300}
                style={s.input}
              />

              <Text style={s.fieldLabel}>{t('admin.calendar.note')}</Text>
              <TextInput
                value={form.observacao}
                onChangeText={(value: string) => updateForm({ observacao: value })}
                placeholder={t('admin.calendar.internal_notes')}
                placeholderTextColor={colors.ink300}
                style={[s.input, s.textArea]}
                multiline
                textAlignVertical="top"
              />

              {form.tipo_evento === 'ueno' && (
                <>
                  <Text style={s.fieldLabel}>{t('admin.clients.client')}</Text>
                  <ScrollView style={s.optionList} nestedScrollEnabled>
                    {(clientes ?? []).map((cliente) => {
                      const active = form.cliente_id === cliente.id
                      return (
                        <TouchableOpacity
                          key={cliente.id}
                          style={[s.optionRow, active && s.optionRowActive]}
                          onPress={() => updateForm({
                            cliente_id: cliente.id,
                            instrutor_id: cliente.assigned_instrutor_id ?? form.instrutor_id,
                            servico_id: '',
                          })}
                          activeOpacity={0.85}
                        >
                          <View style={[s.radio, active && s.radioActive]}>
                            {active && <View style={s.radioInner} />}
                          </View>
                          <Text style={[s.optionTxt, active && s.optionTxtActive]} numberOfLines={1}>
                            {cliente.profile.full_name}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>

                  <Text style={s.fieldLabel}>{t('admin.calendar.instructor')}</Text>
                  <ScrollView style={s.optionList} nestedScrollEnabled>
                    {(instrutores ?? []).map((instrutor) => {
                      const active = form.instrutor_id === instrutor.id
                      return (
                        <TouchableOpacity
                          key={instrutor.id}
                          style={[s.optionRow, active && s.optionRowActive]}
                          onPress={() => updateForm({ instrutor_id: instrutor.id })}
                          activeOpacity={0.85}
                        >
                          <View style={[s.radio, active && s.radioActive]}>
                            {active && <View style={s.radioInner} />}
                          </View>
                          <Text style={[s.optionTxt, active && s.optionTxtActive]} numberOfLines={1}>
                            {instrutor.full_name}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>

                  <Text style={s.fieldLabel}>{t('admin.calendar.active_contracted_service')}</Text>
                  {form.cliente_id ? (
                    loadingProcessos ? (
                      <ActivityIndicator color={colors.navy800} style={{ marginVertical: 10 }} />
                    ) : servicosContratadosAtivos.length > 0 ? (
                      <ScrollView style={s.optionList} nestedScrollEnabled>
                        {servicosContratadosAtivos.map((processo) => {
                          const active = form.servico_id === processo.servico_id
                          return (
                            <TouchableOpacity
                              key={processo.servico_id}
                              style={[s.optionRow, active && s.optionRowActive]}
                              onPress={() => updateForm({ servico_id: processo.servico_id })}
                              activeOpacity={0.85}
                            >
                              <View style={[s.radio, active && s.radioActive]}>
                                {active && <View style={s.radioInner} />}
                              </View>
                              <Text style={[s.optionTxt, active && s.optionTxtActive]} numberOfLines={1}>
                                {processo.servico?.nome ?? t('admin.calendar.service')}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </ScrollView>
                    ) : (
                      <View style={s.infoBox}>
                        <Text style={s.infoTxt}>{t('admin.calendar.no_active_service')}</Text>
                      </View>
                    )
                  ) : (
                    <View style={s.infoBox}>
                      <Text style={s.infoTxt}>{t('admin.calendar.select_client_services')}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setIsCreateOpen(false)} activeOpacity={0.85}>
                <Text style={s.cancelTxt}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, createMutation.isPending && { opacity: 0.7 }]}
                onPress={submitEvent}
                disabled={createMutation.isPending}
                activeOpacity={0.85}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <Text style={s.saveTxt}>{t('save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.navy100, borderWidth: 1, borderColor: colors.navy800 + '30',
  },
  todayTxt: { fontSize: 12, fontWeight: '600', color: colors.navy800 },
  addBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.navy800,
  },

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

  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,16,32,0.38)',
  },
  modalSheet: {
    maxHeight: '92%', backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  modalKicker: { fontSize: 11, fontWeight: '700', color: colors.navy600, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.ink900, marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.ink50,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.ink100,
  },
  modalScroll: { flexGrow: 0 },
  formBody: { padding: 16, paddingBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.ink700, marginBottom: 7, marginTop: 12 },
  segment: {
    flexDirection: 'row', gap: 8, backgroundColor: colors.ink50, padding: 4, borderRadius: 12,
    borderWidth: 1, borderColor: colors.ink100,
  },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentBtnActive: { backgroundColor: colors.navy800 },
  segmentTxt: { fontSize: 12, fontWeight: '700', color: colors.ink500 },
  segmentTxtActive: { color: colors.white },
  twoCols: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  input: {
    minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.ink200,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.ink900,
    backgroundColor: colors.white,
  },
  textArea: { minHeight: 82, paddingTop: 11 },
  optionList: {
    gap: 7, padding: 8, backgroundColor: colors.ink50, borderRadius: 14,
    borderWidth: 1, borderColor: colors.ink100, maxHeight: 190,
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: 38, paddingHorizontal: 10, borderRadius: 10,
  },
  optionRowActive: { backgroundColor: colors.navy100 },
  optionTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink500 },
  optionTxtActive: { color: colors.navy900 },
  radio: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.ink300,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.navy800 },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy800 },
  infoBox: {
    borderRadius: 12, backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100,
    padding: 12,
  },
  infoTxt: { fontSize: 12, color: colors.ink500, fontWeight: '600' },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.ink100,
    backgroundColor: colors.white,
  },
  cancelBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.ink200,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelTxt: { fontSize: 13, fontWeight: '700', color: colors.ink500 },
  saveBtn: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.navy800,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
  },
  saveTxt: { fontSize: 13, fontWeight: '800', color: colors.white },
})
