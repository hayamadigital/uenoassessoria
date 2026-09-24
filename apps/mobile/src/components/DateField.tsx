import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { formatDateBR, parseDateInput } from '@ueno/utils/date'
import { colors } from '@/theme'

/**
 * Campo de data por seletor de calendário.
 *
 * Contrato: `value` e `onChange` trafegam SEMPRE em ISO `AAAA-MM-DD` (formato canônico
 * de armazenamento); a tela mostra `DD/MM/AAAA`. Não há digitação livre, então não existe
 * mais o caso de "formato errado" que fazia a data do cadastro ser rejeitada aqui.
 *
 * Valor legado em `DD/MM/AAAA` vindo do banco é aceito na leitura (via parseDateInput),
 * para as telas funcionarem mesmo antes da migração rodar.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Selecionar data',
  maximumDate,
  minimumDate,
}: {
  /** Opcional: telas com estilo próprio de label (ex. cadastro) renderizam o seu e omitem aqui. */
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maximumDate?: Date
  minimumDate?: Date
}) {
  const [open, setOpen] = useState(false)

  const iso = parseDateInput(value)
  // Meio-dia UTC evita que o picker exiba o dia anterior em fusos negativos.
  const selectedDate = iso ? new Date(`${iso}T12:00:00Z`) : new Date()

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    // No Android o próprio diálogo fecha; no iOS o spinner fica inline até confirmar.
    if (Platform.OS !== 'ios') setOpen(false)
    if (event.type === 'dismissed' || !date) return
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    onChange(`${year}-${month}-${day}`)
  }

  const display = formatDateBR(value)

  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <Pressable
        style={s.input}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={display ? `${label ?? 'Data'}: ${display}. Toque para alterar.` : `${label ?? 'Data'}. Toque para selecionar a data.`}
      >
        <Text style={display ? s.value : s.placeholder}>{display || placeholder}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.ink500} />
      </Pressable>

      {value && !iso ? (
        <Text style={s.warn}>Data em formato antigo — toque para corrigir.</Text>
      ) : null}

      {open ? (
        <>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="pt-BR"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable style={s.doneBtn} onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={s.doneTxt}>Concluir</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.ink700, fontWeight: '700', fontSize: 12.5 },
  input: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.ink200,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  value: { color: colors.ink900, fontSize: 14 },
  placeholder: { color: colors.ink300, fontSize: 14 },
  warn: { color: colors.warn, fontSize: 11.5 },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 },
  doneTxt: { color: colors.navy800, fontWeight: '700', fontSize: 14 },
})
