import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/auth.store'
import { View, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Index() {
  const { session, isLoading } = useAuthStore()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [onboardingDone, setOnboardingDone] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(val === '1')
      setCheckingOnboarding(false)
    })
  }, [])

  if (isLoading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#1a32f5" />
      </View>
    )
  }

  if (!onboardingDone) return <Redirect href="/(auth)/onboarding" />

  if (!session) return <Redirect href="/(auth)/login" />

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
