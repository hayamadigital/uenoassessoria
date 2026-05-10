import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { MapPin, Pencil, Plus, ExternalLink, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import {
  listDestinos,
  createDestino,
  updateDestino,
  toggleDestinoAtivo,
} from '@ueno/firebase/queries/destinos'
import type { DestinoFixo } from '@ueno/firebase'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const DEFAULT_CENTER = { lat: 35.1815, lng: 136.9066 } // Nagoya

interface LatLng { lat: number; lng: number }

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

function MapPicker({ center, onMarkerDragEnd }: { center: LatLng; onMarkerDragEnd: (pos: LatLng) => void }) {
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
      mapId="ueno-destinos-map"
      style={{ width: '100%', height: '220px', borderRadius: '8px' }}
      gestureHandling="cooperative"
      disableDefaultUI
      zoomControl
    >
      <AdvancedMarker position={markerPos} draggable onDragEnd={handleDragEnd} title="Arraste para ajustar" />
    </Map>
  )
}

const destinoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  endereco: z.string().min(1, 'Endereço obrigatório'),
})
type DestinoInput = z.infer<typeof destinoSchema>

export function LocaisTab() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<DestinoFixo | null>(null)

  // Map state for dialog
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [mapKey, setMapKey] = useState(0)
  const [showMap, setShowMap] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: destinos = [], isLoading } = useQuery({
    queryKey: ['destinos'],
    queryFn: () => listDestinos(db),
  })

  const {
    register,
    handleSubmit,
    reset: resetForm,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DestinoInput>({
    resolver: zodResolver(destinoSchema),
    defaultValues: { nome: '', endereco: '' },
  })

  const watchedEndereco = watch('endereco')

  const saveMutation = useMutation({
    mutationFn: async (data: DestinoInput) => {
      if (editando) {
        return updateDestino(db, editando.id, data)
      }
      return createDestino(db, data)
    },
    onSuccess: () => {
      setSaveError(null)
      queryClient.invalidateQueries({ queryKey: ['destinos'] })
      handleCloseDialog()
    },
    onError: (err) => {
      setSaveError(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleDestinoAtivo(db, id, !isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinos'] })
    },
  })

  async function geocodeAndCenter(address: string) {
    if (!address.trim() || !MAPS_API_KEY) return
    setIsGeocoding(true)
    setGeoError(null)
    const pos = await geocodeAddress(address.trim())
    setIsGeocoding(false)
    if (!pos) {
      setGeoError('Endereço não encontrado. Tente ser mais específico.')
      return
    }
    setMapCenter(pos)
    setMapKey((k) => k + 1)
    setShowMap(true)
  }

  const handleMarkerDragEnd = useCallback(async (pos: LatLng) => {
    setIsReverseGeocoding(true)
    const newAddress = await reverseGeocode(pos)
    setIsReverseGeocoding(false)
    if (newAddress) setValue('endereco', newAddress)
  }, [setValue])

  function handleOpenAdd() {
    setEditando(null)
    resetForm({ nome: '', endereco: '' })
    setShowMap(false)
    setGeoError(null)
    setDialogOpen(true)
  }

  function handleOpenEdit(destino: DestinoFixo) {
    setEditando(destino)
    resetForm({ nome: destino.nome, endereco: destino.endereco })
    setGeoError(null)
    if (destino.endereco.trim() && MAPS_API_KEY) {
      setIsGeocoding(true)
      setShowMap(true)
      geocodeAddress(destino.endereco.trim()).then((pos) => {
        setIsGeocoding(false)
        setMapCenter(pos ?? DEFAULT_CENTER)
        setMapKey((k) => k + 1)
      })
    } else {
      setShowMap(false)
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditando(null)
    resetForm({ nome: '', endereco: '' })
    setGeoError(null)
    setSaveError(null)
    setShowMap(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Locais de Destino</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Destinos fixos disponíveis no planejamento de rotas (Menkyo Center, locais de treino, etc.).
            </p>
          </div>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar Local
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : destinos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum local cadastrado.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Endereço</th>
                  <th className="pb-2 font-medium w-24">Status</th>
                  <th className="pb-2 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {destinos.map((d) => (
                  <tr key={d.id} className="py-3">
                    <td className="py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        {d.nome}
                      </div>
                    </td>
                    <td className="py-3 max-w-xs">
                      <p className="text-muted-foreground truncate">
                        {d.endereco || <span className="italic">Sem endereço</span>}
                      </p>
                      {d.endereco && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.endereco)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver no Maps
                        </a>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge variant={d.is_active ? 'success' : 'secondary'}>
                        {d.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(d)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={toggleMutation.isPending && (toggleMutation.variables as any)?.id === d.id}
                          onClick={() => toggleMutation.mutate({ id: d.id, isActive: d.is_active })}
                        >
                          {d.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog() }}>
        <DialogContent className={MAPS_API_KEY ? 'max-w-lg' : 'max-w-md'}>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Local' : 'Adicionar Local'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input {...register('nome')} placeholder="Ex: Menkyo Center" />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <div className="flex gap-2">
                <Input
                  {...register('endereco')}
                  placeholder="Endereço completo (japonês ou romaji)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      geocodeAndCenter(watchedEndereco)
                    }
                  }}
                />
                {MAPS_API_KEY && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => geocodeAndCenter(watchedEndereco)}
                    disabled={!watchedEndereco?.trim() || isGeocoding}
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
              {errors.endereco && (
                <p className="text-xs text-destructive">{errors.endereco.message}</p>
              )}
              {geoError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {geoError}
                </div>
              )}
              {watchedEndereco?.trim() && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(watchedEndereco)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir no Google Maps
                </a>
              )}
            </div>

            {/* Mapa — só exibido após "Localizar" */}
            {MAPS_API_KEY && showMap && (
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

            {saveError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {saveError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting || saveMutation.isPending}>
                {editando ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
