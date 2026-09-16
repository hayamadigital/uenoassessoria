import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { signOut } from 'firebase/auth'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { DataScreen, styles } from '@/components/DataScreen'
import { AccountLinks } from '@/components/AccountLinks'
export default function Perfil() {
  const { session, clear } = useAuthStore()
  const cache = useQueryClient()
  async function logout() {
    try { await signOut(auth); cache.clear(); clear(); router.replace('/(auth)/login') }
    catch { Alert.alert('Não foi possível sair', 'Tente novamente.') }
  }
  return <DataScreen title="Meu perfil"><View style={styles.card}>
    <Text style={styles.heading}>{session?.fullName}</Text><Text style={styles.text}>{session?.email}</Text>
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.push('/(instrutor)/perfil/alterar-senha')}><Text style={styles.link}>Alterar senha</Text></TouchableOpacity>
    <AccountLinks />
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { void logout() }}><Text style={styles.link}>Sair</Text></TouchableOpacity>
  </View></DataScreen>
}
