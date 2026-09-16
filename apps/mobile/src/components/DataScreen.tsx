import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/theme'

export function DataScreen({ title, loading, error, retry, empty, children, back = false }: {
  title: string; back?: boolean; loading?: boolean; error?: boolean; retry?: () => void; empty?: string; children?: ReactNode
}) {
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <>{back ? <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}><Text style={styles.link}>Voltar</Text></TouchableOpacity> : null}</>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Carregando" color={colors.navy800} /> : error ?
        <View style={styles.card}><Text style={styles.text}>Não foi possível carregar os dados.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={retry} style={styles.button}><Text style={styles.link}>Tentar novamente</Text></TouchableOpacity>
        </View> : empty ? <Text style={styles.text}>{empty}</Text> : children}
    </ScrollView>
  </SafeAreaView>
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 }, content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink900 },
  card: { backgroundColor: colors.white, padding: 18, borderRadius: 16, gap: 8 },
  heading: { fontSize: 17, fontWeight: '600', color: colors.ink900 },
  text: { fontSize: 15, lineHeight: 23, color: colors.ink600 },
  button: { paddingVertical: 12, minHeight: 44 }, link: { fontSize: 15, fontWeight: '600', color: colors.navy800 },
})
