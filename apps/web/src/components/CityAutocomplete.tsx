import { useState, type ChangeEvent } from 'react'
import { searchCidadesJapao, type CidadeJapao } from '@ueno/utils/cidades-japao'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

interface CityAutocompleteProps {
  value: string
  onChangeText: (text: string) => void
  onSelectCity: (city: CidadeJapao) => void
  error?: boolean
  placeholder?: string
}

/** Busca de cidade do Japão com sugestões locais (sem chamada de rede) — ver docs/cadastro-evento-especificacao.md. */
export function CityAutocomplete({ value, onChangeText, onSelectCity, error, placeholder }: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CidadeJapao[]>([])
  const [focused, setFocused] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value
    onChangeText(text)
    setSuggestions(searchCidadesJapao(text))
  }

  function handleSelect(city: CidadeJapao) {
    onSelectCity(city)
    setSuggestions([])
  }

  const showDropdown = focused && suggestions.length > 0

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder ?? 'Ex: Nagoya, Toyota…'}
        autoComplete="off"
        className={cn(error && 'border-destructive')}
      />
      {showDropdown && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {suggestions.map((item) => (
            <button
              key={`${item.cidade}-${item.provincia}`}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => handleSelect(item)}
            >
              <span className="font-medium">{item.cidade}</span>
              <span className="text-xs text-muted-foreground">{item.provincia}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
