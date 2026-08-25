import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Upload, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { db, storage } from '@/lib/firebase'
import { getAviso, createAviso, updateAviso } from '@ueno/firebase/queries/avisos'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { uploadFile, avisoBannerPath, avisoCarrosselPath } from '@ueno/firebase/storage'
import { useAuthStore } from '@/stores/auth.store'
import { getJSTDayStartUTC, getJSTDayEndUTC } from '@ueno/utils/date'
import type { TipoAviso, AvisoInsert, ConteudoAvisoTipo, LayoutImagensAviso } from '@ueno/firebase'

const TIPO_OPTIONS: { value: TipoAviso; label: string }[] = [
  { value: 'logistica', label: 'Logística' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'data_comemorativa', label: 'Data Comemorativa' },
  { value: 'geral', label: 'Geral' },
]

interface Props {
  id?: string
}

export function AvisoFormPage({ id }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.session?.userId)
  const isEdit = !!id

  const { data: aviso, isLoading: isLoadingAviso } = useQuery({
    queryKey: ['aviso', id],
    queryFn: () => getAviso(db, id!),
    enabled: isEdit,
  })

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => listServicos(db),
  })

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoAviso>('geral')
  const [conteudoTipo, setConteudoTipo] = useState<ConteudoAvisoTipo>('texto')
  const [imagensLayout, setImagensLayout] = useState<LayoutImagensAviso>('carrossel')
  const [descricao, setDescricao] = useState('')
  const [dataPublicacao, setDataPublicacao] = useState('')
  const [dataEncerramento, setDataEncerramento] = useState('')
  const [broadcast, setBroadcast] = useState(true)
  const [tiposProcesso, setTiposProcesso] = useState<string[]>([])

  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [carrosselUrls, setCarrosselUrls] = useState<string[]>([])
  const [carrosselFiles, setCarrosselFiles] = useState<File[]>([])
  const [carrosselPreviews, setCarrosselPreviews] = useState<string[]>([])

  const [error, setError] = useState('')

  useEffect(() => {
    if (!aviso) return
    setTitulo(aviso.titulo)
    setTipo(aviso.tipo)
    setConteudoTipo(aviso.conteudo_tipo ?? 'texto')
    setImagensLayout(aviso.imagens_layout ?? (aviso.conteudo_tipo === 'imagens' ? 'lista' : 'carrossel'))
    setDescricao(aviso.descricao)
    setDataPublicacao(aviso.data_publicacao.slice(0, 10))
    setDataEncerramento(aviso.data_encerramento.slice(0, 10))
    setBroadcast(aviso.broadcast)
    setTiposProcesso(aviso.tipos_processo)
    setBannerUrl(aviso.banner_url)
    setBannerPreview(aviso.banner_url)
    setCarrosselUrls(aviso.imagens_carrossel)
    setCarrosselPreviews(aviso.imagens_carrossel)
  }, [aviso])

  const mutation = useMutation({
    mutationFn: async () => {
      setError('')
      if (!titulo.trim()) throw new Error('Título obrigatório')
      if (conteudoTipo === 'texto' && !descricao.trim()) throw new Error('Descrição obrigatória')
      if (!dataPublicacao) throw new Error('Data de publicação obrigatória')
      if (!dataEncerramento) throw new Error('Data de encerramento obrigatória')
      if (dataEncerramento <= dataPublicacao) throw new Error('Data de encerramento deve ser após publicação')
      if (!broadcast && tiposProcesso.length === 0) throw new Error('Selecione ao menos um tipo de processo ou marque broadcast')
      if (!bannerUrl && !bannerFile) throw new Error('Banner principal obrigatório')

      const baseInput: AvisoInsert = {
        titulo: titulo.trim(),
        tipo,
        descricao: descricao.trim(),
        conteudo_tipo: conteudoTipo,
        banner_url: bannerUrl,
        imagens_layout: conteudoTipo === 'imagens' ? 'lista' : imagensLayout,
        pdf_url: null,
        imagens_carrossel: carrosselUrls,
        data_publicacao: getJSTDayStartUTC(dataPublicacao),
        data_encerramento: getJSTDayEndUTC(dataEncerramento),
        broadcast,
        tipos_processo: broadcast ? [] : tiposProcesso,
        created_by: userId ?? '',
      }

      if (isEdit) {
        // In edit mode, we already have the real document ID
        let finalBannerUrl = bannerUrl
        if (bannerFile) {
          finalBannerUrl = await uploadFile(storage, avisoBannerPath(id!, bannerFile.name), bannerFile)
        }
        const newCarrosselUrls = await Promise.all(
          carrosselFiles.map((f) => uploadFile(storage, avisoCarrosselPath(id!, f.name), f)),
        )
        return updateAviso(db, id!, {
          ...baseInput,
          banner_url: finalBannerUrl,
          imagens_carrossel: [...carrosselUrls, ...newCarrosselUrls],
        })
      }

      // For create: get the doc ID first, then upload under the real ID
      const created = await createAviso(db, baseInput)
      const finalBannerUrl = bannerFile
        ? await uploadFile(storage, avisoBannerPath(created.id, bannerFile.name), bannerFile)
        : bannerUrl
      const newCarrosselUrls = await Promise.all(
        carrosselFiles.map((f) => uploadFile(storage, avisoCarrosselPath(created.id, f.name), f)),
      )
      if (bannerFile || carrosselFiles.length > 0) {
        return updateAviso(db, created.id, {
          ...baseInput,
          banner_url: finalBannerUrl,
          imagens_carrossel: [...carrosselUrls, ...newCarrosselUrls],
        })
      }
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos'] })
      navigate('/avisos')
    },
    onError: (err: Error) => setError(err.message),
  })

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerUrl('')
    setBannerPreview(URL.createObjectURL(file))
  }

  function handleCarrosselChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (carrosselUrls.length + carrosselFiles.length + files.length > 5) {
      setError('Máximo 5 imagens no carrossel')
      return
    }
    setCarrosselFiles((prev) => [...prev, ...files])
    setCarrosselPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  function removeCarrosselExisting(idx: number) {
    setCarrosselUrls((prev) => prev.filter((_, i) => i !== idx))
    setCarrosselPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  function removeCarrosselNew(idx: number) {
    setCarrosselFiles((prev) => prev.filter((_, i) => i !== idx))
    setCarrosselPreviews((prev) => {
      const next = [...prev]
      next.splice(carrosselUrls.length + idx, 1)
      return next
    })
  }

  function toggleTipoProcesso(nome: string) {
    setTiposProcesso((prev) =>
      prev.includes(nome) ? prev.filter((t) => t !== nome) : [...prev, nome],
    )
  }

  function handleConteudoTipoChange(next: ConteudoAvisoTipo) {
    setConteudoTipo(next)
    setImagensLayout(next === 'imagens' ? 'lista' : 'carrossel')
  }

  if (isEdit && isLoadingAviso) return <Spinner className="m-auto mt-20" />
  if (isEdit && aviso === null) return <p className="m-auto mt-20 text-muted-foreground">Aviso não encontrado.</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Editar Aviso' : 'Novo Aviso'}
        subtitle={
          <button
            type="button"
            onClick={() => navigate('/avisos')}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Avisos
          </button>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/avisos')}>
              Cancelar
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar alterações' : 'Criar aviso'}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mx-8 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="px-8 grid grid-cols-[1fr_300px] gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Informações */}
          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</h3>
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Feriado Nacional — Dia da Constituição"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo *</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoAviso)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {TIPO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Formato do conteúdo *</Label>
              <div className="mt-1 flex gap-3">
                <label className="flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="conteudo_tipo"
                    checked={conteudoTipo === 'texto'}
                    onChange={() => handleConteudoTipoChange('texto')}
                  />
                  <span>Texto</span>
                </label>
                <label className="flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="conteudo_tipo"
                    checked={conteudoTipo === 'imagens'}
                    onChange={() => handleConteudoTipoChange('imagens')}
                  />
                  <span>Imagens</span>
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="descricao">{conteudoTipo === 'texto' ? 'Descrição *' : 'Resumo / observação opcional'}</Label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={conteudoTipo === 'texto' ? 'Texto completo do aviso...' : 'Resumo breve ou observação opcional...'}
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Imagens */}
          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Imagens</h3>
            <div>
              <Label>Banner principal *</Label>
              {bannerPreview ? (
                <div className="mt-1 relative w-full h-40 rounded-md overflow-hidden bg-muted">
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setBannerFile(null); setBannerUrl(''); setBannerPreview('') }}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Clique para enviar imagem de capa</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                </label>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Recomendado: 1200 x 900 px, proporcao 4:3.
              </p>
            </div>
            {conteudoTipo === 'texto' ? (
              <div className="space-y-3">
                <div>
                  <Label>Layout das imagens</Label>
                  <div className="mt-1 flex gap-3">
                    <label className="flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="imagens_layout"
                        checked={imagensLayout === 'carrossel'}
                        onChange={() => setImagensLayout('carrossel')}
                      />
                      <span>Carrossel</span>
                    </label>
                    <label className="flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="imagens_layout"
                        checked={imagensLayout === 'lista'}
                        onChange={() => setImagensLayout('lista')}
                      />
                      <span>Lista vertical</span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  O tipo texto pode exibir as imagens como carrossel ou uma abaixo da outra.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                O tipo imagens sempre será exibido em lista vertical no app.
              </p>
            )}
            <div>
              <Label>{conteudoTipo === 'texto' ? 'Imagens do aviso (opcional, máx. 5)' : 'Imagens do aviso (mínimo 1 recomendado, máx. 5)'}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {carrosselPreviews.map((src, i) => {
                  const isExisting = i < carrosselUrls.length
                  return (
                    <div key={i} className="relative w-20 h-16 rounded overflow-hidden bg-muted">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          isExisting
                            ? removeCarrosselExisting(i)
                            : removeCarrosselNew(i - carrosselUrls.length)
                        }
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
                {carrosselUrls.length + carrosselFiles.length < 5 && (
                  <label className="flex w-20 h-16 items-center justify-center border-2 border-dashed rounded cursor-pointer hover:bg-muted/30">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleCarrosselChange} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Publicação */}
          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Publicação</h3>
            <div>
              <Label htmlFor="data-pub">Data de publicação *</Label>
              <Input
                id="data-pub"
                type="date"
                value={dataPublicacao}
                onChange={(e) => setDataPublicacao(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="data-enc">Data de encerramento *</Label>
              <Input
                id="data-enc"
                type="date"
                value={dataEncerramento}
                min={dataPublicacao}
                onChange={(e) => setDataEncerramento(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Segmentação */}
          <div className="rounded-lg border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Segmentação</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={broadcast}
                onChange={(e) => setBroadcast(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm font-medium">Broadcast — todos os clientes</span>
            </label>
            {!broadcast && (
              <div className="space-y-2 pt-1 border-t">
                <p className="text-xs text-muted-foreground">Tipos de processo:</p>
                {servicos.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tiposProcesso.includes(s.nome)}
                      onChange={() => toggleTipoProcesso(s.nome)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{s.nome}</span>
                  </label>
                ))}
                {servicos.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum serviço cadastrado</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
