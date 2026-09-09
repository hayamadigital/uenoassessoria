import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/auth.store'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { session, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#1a32f5" />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/onboarding" />

  switch (session.role) {
    case 'admin':
      return <Redirect href="/(admin)/(tabs)/inicio" />
    case 'instrutor':
      return <Redirect href="/(instrutor)/hoje" />
    case 'cliente':
      return <Redirect href="/(cliente)/(tabs)/inicio" />
    default:
      return <Redirect href="/(auth)/login" />
  }
}
