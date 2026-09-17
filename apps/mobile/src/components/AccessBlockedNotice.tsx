import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, shadows } from '@/theme'

interface AccessBlockedNoticeProps {
  titulo: string
  mensagem: string
  icone?: keyof typeof Ionicons.glyphMap
  onTentarNovamente?: () => void
  tentandoNovamente?: boolean
  onVoltar?: () => void
}

export function AccessBlockedNotice({
  titulo,
  mensagem,
  icone = 'lock-closed-outline',
  onTentarNovamente,
  tentandoNovamente,
  onVoltar,
}: AccessBlockedNoticeProps) {
  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <Ionicons name={icone} size={36} color={colors.navy800} />
      </View>
      <Text style={s.title}>{titulo}</Text>
      <Text style={s.message}>{mensagem}</Text>

      {onTentarNovamente && (
        <TouchableOpacity
          style={[s.primaryButton, tentandoNovamente && s.disabled]}
          onPress={onTentarNovamente}
          disabled={tentandoNovamente}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          {tentandoNovamente ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={s.primaryButtonText}>Tentar novamente</Text>
          )}
        </TouchableOpacity>
      )}

      {onVoltar && (
        <TouchableOpacity style={s.secondaryButton} onPress={onVoltar} accessibilityRole="button">
          <Text style={s.secondaryButtonText}>Voltar para o Início</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy100,
    marginBottom: 20,
    ...shadows.sm,
  },
  title: {
    color: colors.ink900,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: colors.ink500,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  primaryButton: {
    marginTop: 24,
    minWidth: 200,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryButton: { paddingVertical: 14, paddingHorizontal: 12, marginTop: 8 },
  secondaryButtonText: { color: colors.ink500, fontSize: 14, fontWeight: '500' },
  disabled: { opacity: 0.6 },
})
