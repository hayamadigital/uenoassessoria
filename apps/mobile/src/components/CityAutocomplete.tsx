import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { searchCidadesJapao, type CidadeJapao } from '@ueno/utils/cidades-japao'
import { colors } from '@/theme'

interface CityAutocompleteProps {
  value: string
  onChangeText: (text: string) => void
  onSelectCity: (city: CidadeJapao) => void
  placeholder?: string
  error?: boolean
}

/** Busca de cidade do Japão com sugestões locais (sem chamada de rede) — ver docs/cadastro-evento-especificacao.md. */
export function CityAutocomplete({ value, onChangeText, onSelectCity, placeholder, error }: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CidadeJapao[]>([])
  const [focused, setFocused] = useState(false)

  function handleChangeText(text: string) {
    onChangeText(text)
    setSuggestions(searchCidadesJapao(text))
  }

  function handleSelect(city: CidadeJapao) {
    onSelectCity(city)
    setSuggestions([])
  }

  const showDropdown = focused && suggestions.length > 0

  return (
    <View style={s.wrap}>
      <TextInput
        style={[s.input, error && s.inputErr]}
        placeholder={placeholder ?? 'Ex: Nagoya, Toyota…'}
        placeholderTextColor={colors.ink400}
        autoCapitalize="words"
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {showDropdown && (
        <View style={s.dropdown}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={`${item.cidade}-${item.provincia}`}
              style={s.dropdownItem}
              activeOpacity={0.7}
              onPress={() => handleSelect(item)}
            >
              <Text style={s.dropdownItemText}>{item.cidade}</Text>
              <Text style={s.dropdownItemSub}>{item.provincia}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 20 },
  input: {
    backgroundColor: colors.ink50,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.ink900,
    borderWidth: 1,
    borderColor: colors.ink100,
  },
  inputErr: { borderColor: colors.err },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    maxHeight: 220,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink50,
  },
  dropdownItemText: { fontSize: 14, color: colors.ink900, fontWeight: '600' },
  dropdownItemSub: { fontSize: 12, color: colors.ink500 },
})
