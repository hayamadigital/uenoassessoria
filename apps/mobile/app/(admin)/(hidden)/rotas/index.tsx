import { Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { formatInTimeZone } from 'date-fns-tz'
import { listRotasDia } from '@ueno/firebase/queries/rotas'
import { db } from '@/lib/firebase'
import { DataScreen, styles } from '@/components/DataScreen'
export default function Rotas() {
  const date = formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd')
  const result = useQuery({ queryKey: ['rotas-dia', date], queryFn: () => listRotasDia(db, date) })
  return <DataScreen back title="Rotas de hoje" loading={result.isLoading} error={result.isError} retry={() => { void result.refetch() }} empty={result.data?.length === 0 ? 'Nenhuma rota planejada para hoje.' : undefined}>
    {result.data?.map(item => <View style={styles.card} key={item.id}>
      <Text style={styles.heading}>{item.ponto_partida_nome ?? 'Origem'} → {item.ponto_destino_nome ?? 'Destino'}</Text>
      <Text style={styles.text}>{item.ponto_partida_endereco}</Text>
      <Text style={styles.text}>{item.ponto_destino_endereco}</Text>
      {item.notas ? <Text style={styles.text}>{item.notas}</Text> : null}
    </View>)}
  </DataScreen>
}
