import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors } from '@/theme'

const SLIDES = [
  { title: 'Sua habilitação japonesa, sem complicação', desc: 'Acompanhe etapas, envie documentos e agende sua consulta — tudo em um só lugar.', icon: '🚗' },
  { title: 'Documentos e processos em ordem', desc: 'Envie seus documentos direto pelo app e acompanhe a análise em tempo real.', icon: '📋' },
  { title: 'Estude com simulados oficiais', desc: 'Pratique com questões reais e acompanhe seu progresso antes da prova.', icon: '📖' },
  { title: 'Fale com sua equipe Ueno', desc: 'Chat direto com seu assessor para tirar dúvidas e receber orientações.', icon: '💬' },
]

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', '1')
    router.replace('/(auth)/login')
  }

  const next = () => { if (step < SLIDES.length - 1) setStep(step + 1); else finish() }
  const slide = SLIDES[step]

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.topRow}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i <= step ? s.dotActive : s.dotInactive]} />
            ))}
          </View>
          <TouchableOpacity onPress={finish}>
            <Text style={s.skipTxt}>Pular</Text>
          </TouchableOpacity>
        </View>

        <View style={s.illuWrap}>
          <View style={s.circle}>
            <Text style={s.icon}>{slide.icon}</Text>
          </View>
        </View>

        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.desc}>{slide.desc}</Text>

        <View style={s.actions}>
          {step > 0 && (
            <TouchableOpacity style={s.backCircle} onPress={() => setStep(step - 1)} activeOpacity={0.8}>
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.btn, step === 0 && { flex: 1 }]} onPress={next} activeOpacity={0.85}>
            <Text style={s.btnTxt}>{step === SLIDES.length - 1 ? 'Começar' : 'Continuar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, padding: 24, paddingBottom: 32 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 4, borderRadius: 2, width: 32 },
  dotActive: { backgroundColor: colors.navy800 },
  dotInactive: { backgroundColor: colors.ink200 },
  skipTxt: { fontSize: 13, color: colors.ink400, fontWeight: '500' },
  illuWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  circle: {
    width: 180, height: 180, borderRadius: 90, backgroundColor: colors.navy800,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12,
  },
  icon: { fontSize: 72 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink900, letterSpacing: -0.6, textAlign: 'center', marginBottom: 16, lineHeight: 36 },
  desc: { fontSize: 15, color: colors.ink500, textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 8 },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  backCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: colors.ink700, lineHeight: 28 },
  btn: { flex: 2, backgroundColor: colors.navy800, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
})
