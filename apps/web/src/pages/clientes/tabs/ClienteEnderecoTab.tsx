import { useState, useCallback, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { Search, ExternalLink, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { db } from '@/lib/firebase'
import { updateCliente } from '@ueno/firebase/queries/clientes'
import { enderecoJpSchema, type EnderecoJpInput } from '@ueno/utils/validators'
import type { ClienteWithProfile } from '@ueno/firebase'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const DEFAULT_CENTER = { lat: 35.1815, lng: 136.9066 } // Nagoya

interface Context {
  cliente: ClienteWithProfile
}

interface ZipcloudResult {
  status: number
  message: string | null
  results: Array<{
    zipcode: string
    prefcode: string
    address1: string
    address2: string
    address3: string
  }> | null
}

interface LatLng {
  lat: number
  lng: number
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${MAPS_API_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.status === 'OK' && json.results?.length > 0) {
    return json.results[0].geometry.location as LatLng
  }
  return null
}

async function reverseGeocode(latlng: LatLng): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latlng.lat},${latlng.lng}&key=${MAPS_API_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.status === 'OK' && json.results?.length > 0) {
    return json.results[0].formatted_address as string
  }
  return null
}

function buildMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function MapEmbed({
  center,
  onDragEnd,
}: {
  center: LatLng
  onDragEnd: (pos: LatLng) => void
}) {
  const [pos, setPos] = useState<LatLng>(center)

  function handleDragEnd(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return
    const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
    setPos(newPos)
    onDragEnd(newPos)
  }

  return (
    <Map
      defaultCenter={center}
      defaultZoom={16}
      mapId="ueno-cliente-map"
      style={{ width: '100%', height: '260px', borderRadius: '8px' }}
      gestureHandling="cooperative"
      disableDefaultUI
      zoomControl
    >
      <AdvancedMarker position={pos} draggable onDragEnd={handleDragEnd} title="Arraste para ajustar" />
    </Map>
  )
}

export function ClienteEnderecoTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()

  const [cepError, setCepError] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [mapKey, setMapKey] = useState(0)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<EnderecoJpInput>({
    resolver: zodResolver(enderecoJpSchema),
    defaultValues: {
      cep_jp: cliente.cep_jp ?? '',
      endereco_jp: cliente.endereco_jp ?? '',
      provincia_jp: cliente.provincia_jp ?? '',
      cidade_jp: cliente.cidade_jp ?? '',
      bairro_jp: cliente.bairro_jp ?? '',
      numero_bloco_jp: cliente.numero_bloco_jp ?? '',
      apartamento_jp: cliente.apartamento_jp ?? '',
      complemento_jp: cliente.complemento_jp ?? '',
      mapa_link_jp: cliente.mapa_link_jp ?? '',
    },
  })

  const mapaLink = watch('mapa_link_jp')

  function assembleAddress(
    provincia: string,
    cidade: string,
    bairro: string,
    numero: string,
    apto: string,
    enderecoCompleto?: string,
  ): string {
    if (enderecoCompleto?.trim()) return enderecoCompleto.trim()
    return [provincia, cidade, bairro, numero, apto].filter(Boolean).join(' ')
  }

  // Geocodifica o endereço existente ao montar o componente
  useEffect(() => {
    if (!MAPS_API_KEY) return
    const addr = assembleAddress(
      cliente.provincia_jp ?? '',
      cliente.cidade_jp ?? '',
      cliente.bairro_jp ?? '',
      cliente.numero_bloco_jp ?? '',
      cliente.apartamento_jp ?? '',
      cliente.endereco_jp ?? '',
    )
    if (!addr.trim()) return

    setIsGeocoding(true)
    geocodeAddress(addr).then((coords) => {
      setIsGeocoding(false)
      if (coords) {
        setMapCenter(coords)
        setMapKey((k) => k + 1)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // apenas no mount

  async function buscarCep() {
    const cep = (watch('cep_jp') ?? '').replace(/[^0-9]/g, '')
    if (cep.length !== 7) {
      setCepError('CEP deve ter 7 dígitos (formato: 〒XXX-XXXX)')
      return
    }
    setCepError(null)
    setCepLoading(true)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cep}`)
      const json: ZipcloudResult = await res.json()
      if (!json.results || json.results.length === 0) {
        setCepError('CEP não encontrado')
        return
      }
      const r = json.results[0]
      if (!r) { setCepError('CEP não encontrado'); return }

      setValue('provincia_jp', r.address1, { shouldDirty: true, shouldTouch: true })
      setValue('cidade_jp', r.address2, { shouldDirty: true, shouldTouch: true })
      if (r.address3) setValue('bairro_jp', r.address3, { shouldDirty: true, shouldTouch: true })

      if (MAPS_API_KEY) {
        const fullAddress = assembleAddress(
          r.address1,
          r.address2,
          r.address3 ?? '',
          watch('numero_bloco_jp') ?? '',
          watch('apartamento_jp') ?? '',
          watch('endereco_jp') ?? '',
        )
        const mapsUrl = buildMapsSearchUrl(fullAddress)
        setValue('mapa_link_jp', mapsUrl, { shouldDirty: true, shouldTouch: true })

        setIsGeocoding(true)
        const coords = await geocodeAddress(fullAddress)
        setIsGeocoding(false)
        if (coords) {
          setMapCenter(coords)
          setMapKey((k) => k + 1)
        }
      }
    } catch {
      setCepError('Erro ao buscar CEP. Verifique sua conexão.')
    } finally {
      setCepLoading(false)
    }
  }

  const handleMarkerDragEnd = useCallback(async (pos: LatLng) => {
    setIsReverseGeocoding(true)
    const address = await reverseGeocode(pos)
    setIsReverseGeocoding(false)
    if (address) {
      const mapsUrl = buildMapsSearchUrl(address)
      setValue('mapa_link_jp', mapsUrl, { shouldDirty: true, shouldTouch: true })
    }
  }, [setValue])

  const mutation = useMutation({
    mutationFn: (data: EnderecoJpInput) =>
      updateCliente(db, cliente.id, {
        cep_jp: data.cep_jp || null,
        endereco_jp: data.endereco_jp || null,
        provincia_jp: data.provincia_jp || null,
        cidade_jp: data.cidade_jp || null,
        bairro_jp: data.bairro_jp || null,
        numero_bloco_jp: data.numero_bloco_jp || null,
        apartamento_jp: data.apartamento_jp || null,
        complemento_jp: data.complemento_jp || null,
        mapa_link_jp: data.mapa_link_jp || null,
      }),
    onSuccess: (_, variables) => {
      reset(variables)
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id] })
      setSavedOk(true)
      setSaveError(null)
      setTimeout(() => setSavedOk(false), 3000)
    },
    onError: (err) => {
      setSaveError(`Erro ao salvar: ${String(err)}`)
    },
  })

  async function onSubmit(data: EnderecoJpInput) {
    setSaveError(null)
    mutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço no Japão</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* CEP com busca automática */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Código Postal (〒)</Label>
            <div className="flex gap-2">
              <Input
                {...register('cep_jp')}
                placeholder="000-0000"
                className="max-w-[180px]"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarCep() } }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={buscarCep}
                isLoading={cepLoading}
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
            {cepError && <p className="text-xs text-destructive">{cepError}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Endereço completo em japonês</Label>
            <textarea
              {...register('endereco_jp')}
              className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ex: 愛知県名古屋市中区栄1丁目2-3 ○○マンション101"
            />
          </div>

          <div className="space-y-2">
            <Label>Província (都道府県)</Label>
            <Input {...register('provincia_jp')} placeholder="Ex: 愛知県" />
          </div>
          <div className="space-y-2">
            <Label>Cidade (市区町村)</Label>
            <Input {...register('cidade_jp')} placeholder="Ex: 名古屋市" />
          </div>
          <div className="space-y-2">
            <Label>Bairro / Localidade</Label>
            <Input {...register('bairro_jp')} />
          </div>
          <div className="space-y-2">
            <Label>Número / Bloco</Label>
            <Input {...register('numero_bloco_jp')} placeholder="Ex: 2-3-4" />
          </div>
          <div className="space-y-2">
            <Label>Apartamento</Label>
            <Input {...register('apartamento_jp')} placeholder="Ex: 101" />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input {...register('complemento_jp')} />
          </div>

          {/* Link do mapa */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Localização no Mapa</Label>
            <div className="flex gap-2">
              <Input
                {...register('mapa_link_jp')}
                placeholder="Gerado automaticamente ao buscar CEP"
                className="flex-1"
              />
              {mapaLink && (
                <a
                  href={mapaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent"
                  title="Abrir no Google Maps"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Mapa — sempre visível */}
          {MAPS_API_KEY && (
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Localização
                </Label>
                {isReverseGeocoding && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Spinner className="h-3 w-3" /> Atualizando link...
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Arraste o marcador para ajustar a localização exata.
              </p>
              {isGeocoding ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center border rounded-lg bg-muted">
                  <Spinner size="sm" />
                  Carregando mapa...
                </div>
              ) : (
                <APIProvider apiKey={MAPS_API_KEY}>
                  <MapEmbed key={mapKey} center={mapCenter} onDragEnd={handleMarkerDragEnd} />
                </APIProvider>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {saveError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveError}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
          {savedOk ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Salvo!
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </div>
    </form>
  )
}
