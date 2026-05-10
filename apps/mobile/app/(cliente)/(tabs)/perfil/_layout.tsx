import { Stack } from 'expo-router'

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="alterar-senha" options={{ title: 'Alterar Senha' }} />
    </Stack>
  )
}
