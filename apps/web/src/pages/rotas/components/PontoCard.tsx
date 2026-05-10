import { useState, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { MapPin, Pencil, Check, X, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const DEFAULT_CENTER = { lat: 35.1815, lng: 136.9066 } // Nagoya

interface LatLng {
  lat: number
  lng: number
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
      mapId="ueno-ponto-map"
      style={{ width: '100%', height: '220px', borderRadius: '8px' }}
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

interface PontoCardProps {
  label: string
  endereco: string
  nome: string
  onSave: (endereco: string, nome: string) => void
}

export function PontoCard({ label, endereco, nome, onSave }: PontoCardProps) {
  const [editing, setEditing] = useState(false)
  const [draftEndereco, setDraftEndereco] = useState(endereco)
  const [draftNome, setDraftNome] = useState(nome)

  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [mapKey, setMapKey] = useState(0)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)

  function handleEdit() {
    setDraftEndereco(endereco)
    setDraftNome(nome)
    setGeoError(null)

    if (endereco.trim() && MAPS_API_KEY) {
      setIsGeocoding(true)
      geocodeAddress(endereco.trim()).then((pos) => {
        setIsGeocoding(false)
        setMapCenter(pos ?? DEFAULT_CENTER)
        setMapKey((k) => k + 1)
      })
    } else {
      setMapCenter(DEFAULT_CENTER)
      setMapKey((k) => k + 1)
    }

    setEditing(true)
  }

  function handleSave() {
    onSave(draftEndereco, draftNome)
    setEditing(false)
  }

  function handleCancel() {
    setDraftEndereco(endereco)
    setDraftNome(nome)
    setEditing(false)
    setGeoError(null)
  }

  async function handleLocalizar() {
    if (!draftEndereco.trim()) return
    setIsGeocoding(true)
    setGeoError(null)
    const pos = await geocodeAddress(draftEndereco.trim())
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
    if (newAddress) setDraftEndereco(newAddress)
  }, [])

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {label}
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input
            placeholder="Nome do ponto (ex: Casa, Estação Nagoya)"
            value={draftNome}
            onChange={(e) => setDraftNome(e.target.value)}
          />

          <div className="flex gap-2">
            <Input
              placeholder="Endereço completo"
              value={draftEndereco}
              onChange={(e) => {
                setDraftEndereco(e.target.value)
                setGeoError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleLocalizar()
                }
              }}
            />
            {MAPS_API_KEY && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLocalizar}
                disabled={!draftEndereco.trim() || isGeocoding}
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
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {geoError}
            </div>
          )}

          {/* Mapa — sempre visível ao editar */}
          {MAPS_API_KEY && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">
                  Arraste o marcador para ajustar a localização exata.
                </p>
                {isReverseGeocoding && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Spinner className="h-3 w-3" /> Atualizando...
                  </span>
                )}
              </div>
              {isGeocoding ? (
                <div className="flex items-center justify-center h-[220px] rounded-lg border bg-muted text-sm text-muted-foreground gap-2">
                  <Spinner className="h-4 w-4" /> Carregando mapa...
                </div>
              ) : (
                <APIProvider apiKey={MAPS_API_KEY}>
                  <MapPicker key={mapKey} center={mapCenter} onMarkerDragEnd={handleMarkerDragEnd} />
                </APIProvider>
              )}
            </div>
          )}

          {draftEndereco.trim() && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(draftEndereco)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir no Google Maps
            </a>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave}>
              <Check className="mr-1 h-3.5 w-3.5" />
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="mr-1 h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {nome && <p className="font-medium text-sm">{nome}</p>}
          <p className="text-sm text-muted-foreground mt-0.5">
            {endereco || <span className="italic">Endereço não informado</span>}
          </p>
          {endereco && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir no Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  )
}
