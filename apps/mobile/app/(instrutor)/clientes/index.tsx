import { View, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { DataScreen, styles } from '@/components/DataScreen'
export default function Clientes() {
  const uid = useAuthStore(s => s.session?.userId)
  const result = useQuery({ queryKey: ['instrutor-clientes', uid], enabled: !!uid,
    queryFn: () => listClientes(db, { instrutor_id: uid! }) })
  return <DataScreen title="Meus clientes" loading={result.isLoading} error={result.isError}
    retry={() => { void result.refetch() }} empty={result.data?.length === 0 ? 'Nenhum cliente vinculado a você.' : undefined}>
    {result.data?.map(item => <View key={item.id} style={styles.card}>
      <Text style={styles.heading}>{item.profile.full_name}</Text>
      {item.profile.phone ? <Text style={styles.text}>{item.profile.phone}</Text> : null}
      {item.cidade_jp ? <Text style={styles.text}>{item.cidade_jp}</Text> : null}
    </View>)}
  </DataScreen>
}
