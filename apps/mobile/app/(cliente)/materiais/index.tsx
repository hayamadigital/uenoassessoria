import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Stub() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Text style={s.icon}>🚧</Text>
        <Text style={s.title}>Em desenvolvimento</Text>
        <Text style={s.sub}>Esta seção será implementada em breve.</Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 48, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#0B1020', marginBottom: 6 },
  sub: { fontSize: 13, color: '#5A6478', textAlign: 'center', lineHeight: 20 },
})
