import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listContratos } from '@ueno/firebase/queries/contratos'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { DataScreen, styles } from '@/components/DataScreen'
const labels: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Aguardando assinatura', assinado: 'Assinado', cancelado: 'Cancelado' }
export default function Contratos() {
  const uid = useAuthStore(s => s.session?.userId)
  const result = useQuery({ queryKey: ['meus-contratos', uid], enabled: !!uid,
    queryFn: async () => { const cliente = await getClienteByProfileId(db, uid!); return listContratos(db, cliente.id) } })
  async function open(url: string) {
    try { if (!url.startsWith('https://')) throw new Error(); await Linking.openURL(url) }
    catch { Alert.alert('Não foi possível abrir', 'Tente novamente ou entre em contato com a equipe.') }
  }
  return <DataScreen back title="Meus contratos" loading={result.isLoading} error={result.isError}
    retry={() => { void result.refetch() }} empty={result.data?.length === 0 ? 'Você ainda não tem contratos.' : undefined}>
    {result.data?.map(item => <View key={item.id} style={styles.card}>
      <Text style={styles.heading}>{item.titulo}</Text><Text style={styles.text}>{labels[item.status] ?? item.status}</Text>
      {item.pdf_url ? <TouchableOpacity accessibilityRole="link" style={styles.button} onPress={() => { void open(item.pdf_url!) }}><Text style={styles.link}>Abrir contrato</Text></TouchableOpacity> : <Text style={styles.text}>O documento estará disponível quando a equipe finalizar o envio.</Text>}
    </View>)}
  </DataScreen>
}
