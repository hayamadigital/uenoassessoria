import { Stack, Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/auth.store'
import { ActivityIndicator, View } from 'react-native'
import { colors } from '@/theme'

export default function AdminLayout() {
  const { session, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.navy800} />
      </View>
    )
  }

  if (!session || session.role !== 'admin') {
    return <Redirect href="/(auth)/login" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
