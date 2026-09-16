import { View, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { formatInTimeZone } from 'date-fns-tz'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { DataScreen, styles } from './DataScreen'

const statusLabels: Record<string, string> = { agendado: 'Agendado', confirmado: 'Confirmado', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado', faltou: 'Ausente' }
export function InstructorAgenda({ today = false }: { today?: boolean }) {
  const uid = useAuthStore(s => s.session?.userId)
  const date = formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd')
  const result = useQuery({
    queryKey: ['instrutor-agenda', uid, today, date], enabled: !!uid,
    queryFn: () => listAgendamentos(db, { instrutor_id: uid!,
      data_inicio: new Date(`${date}T00:00:00+09:00`).toISOString(),
      ...(today ? { data_fim: new Date(`${date}T23:59:59.999+09:00`).toISOString() } : {}),
    }),
  })
  return <DataScreen title={today ? 'Hoje' : 'Agenda'} loading={result.isLoading} error={result.isError}
    retry={() => { void result.refetch() }} empty={result.data?.length === 0 ? 'Nenhum agendamento neste período.' : undefined}>
    {result.data?.map(item => <View style={styles.card} key={item.id}>
      <Text style={styles.heading}>{item.servico?.nome ?? item.servico_nome ?? 'Agendamento'}</Text>
      <Text style={styles.text}>{formatInTimeZone(new Date(item.data_hora_inicio), 'Asia/Tokyo', 'dd/MM/yyyy HH:mm')} – {formatInTimeZone(new Date(item.data_hora_fim), 'Asia/Tokyo', 'HH:mm')} (Japão)</Text>
      <Text style={styles.text}>{item.cliente?.profile.full_name ?? 'Cliente não informado'}</Text>
      {item.local ? <Text style={styles.text}>{item.local}</Text> : null}
      <Text style={styles.text}>{statusLabels[item.status] ?? item.status}</Text>
    </View>)}
  </DataScreen>
}
