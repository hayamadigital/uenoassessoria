import { StyleSheet, Text, TextInput, View } from 'react-native'
import { colors } from '@/theme'

/** Mascara dígitos livres no formato canônico AAAA-MM-DD. */
export function maskDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
    .filter(Boolean)
    .join('-')
}

/** `true` para vazio ou data ISO válida (AAAA-MM-DD). */
export function isValidDate(value: string): boolean {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(dt.getTime()) &&
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === m &&
    dt.getUTCDate() === d
  )
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'AAAA-MM-DD',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const invalid = !!value && !isValidDate(value)
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text: string) => onChange(maskDate(text))}
        placeholder={placeholder}
        placeholderTextColor={colors.ink300}
        keyboardType="number-pad"
        maxLength={10}
        style={[s.input, invalid && s.inputInvalid]}
      />
      {invalid ? <Text style={s.err}>Data inválida — use AAAA-MM-DD</Text> : null}
    </View>
  )
}

const s = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.ink700, fontWeight: '700', fontSize: 12.5 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.ink200,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.ink900,
    backgroundColor: colors.white,
    fontSize: 14,
  },
  inputInvalid: { borderColor: colors.red },
  err: { color: colors.red, fontSize: 11.5 },
})
