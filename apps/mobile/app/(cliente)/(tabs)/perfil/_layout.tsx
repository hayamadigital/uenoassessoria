import { Stack } from 'expo-router'

export const unstable_settings = {
  initialRouteName: 'index',
}

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dados-pessoais" />
      <Stack.Screen name="habilitacoes" />
      <Stack.Screen name="entrada-saida" />
      <Stack.Screen name="endereco" />
      <Stack.Screen name="contatos" />
      <Stack.Screen name="preferencias" />
      <Stack.Screen name="notificacoes" />
      <Stack.Screen name="alterar-senha" />
    </Stack>
  )
}
