import { useState, useEffect, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { MapPin, AlertCircle, ExternalLink } from 'lucide-react'
import type { TipoPonto } from '@ueno/firebase'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const DEFAULT_CENTER = { lat: 35.1815, lng: 136.9066 } // Nagoya

interface LatLng {
  lat: number
  lng: number
}

interface EditEnderecoDialogProps {
  open: boolean
  clienteNome: string
  enderecoAtual: string
  tipoAtual: TipoPonto
  nomeAtual: string
  onClose: () => void
  onSave: (endereco: string, tipo: TipoPonto, nome: string) => void
}

const tipoLabel: Record<TipoPonto, string> = {
  residencia: 'Residência',
  estacao_trem: 'Estação de Trem',
  outro: 'Outro',
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${MAPS_API_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.status === 'OK' && json.results.length > 0) {
    return json.results[0].geometry.location as LatLng
  }
  return null
}

async function reverseGeocode(latlng: LatLng): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latlng.lat},${latlng.lng}&key=${MAPS_API_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.status === 'OK' && json.results.length > 0) {
    return json.results[0].formatted_address as string
  }
  return null
}

function MapPicker({
  center,
  onMarkerDragEnd,
}: {
  center: LatLng
  onMarkerDragEnd: (pos: LatLng) => void
}) {
  const [markerPos, setMarkerPos] = useState<LatLng>(center)

  function handleDragEnd(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
    setMarkerPos(pos)
    onMarkerDragEnd(pos)
  }

  return (
    <Map
      defaultCenter={center}
      defaultZoom={16}
      mapId="ueno-map"
      style={{ width: '100%', height: '280px', borderRadius: '8px' }}
      gestureHandling="cooperative"
      disableDefaultUI
      zoomControl
    >
      <AdvancedMarker
        position={markerPos}
        draggable
        onDragEnd={handleDragEnd}
        title="Arraste para ajustar"
      />
    </Map>
  )
}

export function EditEnderecoDialog({
  open,
  clienteNome,
  enderecoAtual,
  tipoAtual,
  nomeAtual,
  onClose,
  onSave,
}: EditEnderecoDialogProps) {
  const [endereco, setEndereco] = useState(enderecoAtual)
  const [tipo, setTipo] = useState<TipoPonto>(tipoAtual)
  const [nome, setNome] = useState(nomeAtual)

  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [mapKey, setMapKey] = useState(0)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)

  useEffect(() => {
    if (open) {
      setEndereco(enderecoAtual)
      setTipo(tipoAtual)
      setNome(nomeAtual)
      setGeoError(null)

      if (enderecoAtual.trim() && MAPS_API_KEY) {
        setIsGeocoding(true)
        geocodeAddress(enderecoAtual.trim()).then((pos) => {
          setIsGeocoding(false)
          setMapCenter(pos ?? DEFAULT_CENTER)
          setMapKey((k) => k + 1)
        })
      } else {
        setMapCenter(DEFAULT_CENTER)
        setMapKey((k) => k + 1)
      }
    }
  }, [open, enderecoAtual, tipoAtual, nomeAtual])

  function handleTipoChange(t: TipoPonto) {
    setTipo(t)
    if (!nome || nome === tipoLabel[tipo]) {
      setNome(tipoLabel[t])
    }
  }

  async function handleLocalizar() {
    if (!endereco.trim()) return
    setIsGeocoding(true)
    setGeoError(null)

    const pos = await geocodeAddress(endereco.trim())
    setIsGeocoding(false)

    if (!pos) {
      setGeoError('Endereço não encontrado. Tente ser mais específico.')
      return
    }
    setMapCenter(pos)
    setMapKey((k) => k + 1)
  }

  const handleMarkerDragEnd = useCallback(async (pos: LatLng) => {
    setIsReverseGeocoding(true)
    const newAddress = await reverseGeocode(pos)
    setIsReverseGeocoding(false)
    if (newAddress) setEndereco(newAddress)
  }, [])

  function handleSave() {
    onSave(endereco, tipo, nome || tipoLabel[tipo])
    onClose()
  }

  const hasMapsKey = !!MAPS_API_KEY

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className={hasMapsKey ? 'max-w-2xl' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>Ponto de Coleta — {clienteNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo do ponto */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tipo de ponto</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(tipoLabel) as TipoPonto[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTipoChange(t)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    tipo === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-input'
                  }`}
                >
                  {tipoLabel[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Nome do ponto */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Nome do ponto <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Input
              placeholder="ex: Estação Nagoya, Porta Sul"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Endereço</label>
            <div className="flex gap-2">
              <Input
                placeholder="Endereço completo"
                value={endereco}
                onChange={(e) => {
                  setEndereco(e.target.value)
                  setGeoError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleLocalizar()
                  }
                }}
              />
              {hasMapsKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLocalizar}
                  disabled={!endereco.trim() || isGeocoding}
                  className="shrink-0"
                >
                  {isGeocoding ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5">Localizar</span>
                </Button>
              )}
            </div>

            {geoError && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {geoError}
              </div>
            )}
          </div>

          {/* Mapa — sempre visível */}
          {hasMapsKey && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium">Localização no mapa</p>
                {isReverseGeocoding && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Spinner className="h-3 w-3" /> Atualizando endereço...
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Arraste o marcador para ajustar a localização exata.
              </p>
              {isGeocoding ? (
                <div className="flex items-center justify-center h-[280px] rounded-lg border bg-muted text-sm text-muted-foreground gap-2">
                  <Spinner className="h-4 w-4" /> Carregando mapa...
                </div>
              ) : (
                <APIProvider apiKey={MAPS_API_KEY}>
                  <MapPicker key={mapKey} center={mapCenter} onMarkerDragEnd={handleMarkerDragEnd} />
                </APIProvider>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          {endereco.trim() && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mr-auto"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir no Google Maps
            </a>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!endereco.trim()}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
