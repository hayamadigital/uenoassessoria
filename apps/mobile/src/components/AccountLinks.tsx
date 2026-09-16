import { Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { styles } from './DataScreen'
export function AccountLinks() {
  return <>
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.push('/privacidade')}><Text style={styles.link}>Política de privacidade</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.push('/excluir-conta')}><Text style={[styles.link, { color: '#B91C1C' }]}>Excluir minha conta</Text></TouchableOpacity>
  </>
}
