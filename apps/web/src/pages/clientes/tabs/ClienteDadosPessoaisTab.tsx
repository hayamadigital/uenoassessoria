import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, storage } from '@/lib/firebase'
import { uploadFile, avatarPath } from '@ueno/firebase/storage'
import { updateCliente } from '@ueno/firebase/queries/clientes'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { dadosPessoaisSchema, type DadosPessoaisInput } from '@ueno/utils/validators'
import { PAISES } from '@/lib/paises'
import type { ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

const profissaoOpcoes = [
  { value: 'autonomo', label: 'Autônomo' },
  { value: 'nao_trabalha', label: 'Não trabalha' },
  { value: 'empreiteira', label: 'Trabalha para empreiteira' },
  { value: 'fabrica', label: 'Trabalha para fábrica' },
  { value: 'outros', label: 'Outros' },
]

export function ClienteDadosPessoaisTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const currentAvatar = avatarPreview ?? cliente.profile.avatar_url

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)

    try {
      const ext = file.name.split('.').pop()
      const path = avatarPath(cliente.profile_id, `avatar.${ext}`)

      const publicUrl = await uploadFile(storage, path, file)

      await updateProfile(db, cliente.profile_id, { avatar_url: publicUrl })
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id] })
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err)
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DadosPessoaisInput>({
    resolver: zodResolver(dadosPessoaisSchema),
    defaultValues: {
      full_name: cliente.profile.full_name,
      nome_japones: cliente.nome_japones ?? '',
      data_nascimento: cliente.data_nascimento ?? '',
      nacionalidade: cliente.nacionalidade ?? '',
      cpf: cliente.cpf ?? '',
      zairyu_card: cliente.zairyu_card ?? '',
      visto_tipo: cliente.visto_tipo ?? '',
      visto_validade: cliente.visto_validade ?? '',
      profissao_tipo: cliente.profissao_tipo ?? undefined,
      profissao_empresa: cliente.profissao_empresa ?? '',
    },
  })

  const profissaoTipo = watch('profissao_tipo')

  const mutation = useMutation({
    mutationFn: async (data: DadosPessoaisInput) => {
      await Promise.all([
        updateCliente(db, cliente.id, {
          nome_japones: data.nome_japones || null,
          nacionalidade: data.nacionalidade || null,
          cpf: data.cpf || null,
          data_nascimento: data.data_nascimento || null,
          zairyu_card: data.zairyu_card || null,
          visto_tipo: data.visto_tipo || null,
          visto_validade: data.visto_validade || null,
          profissao_tipo: data.profissao_tipo ?? null,
          profissao_empresa: data.profissao_empresa || null,
        }),
        updateProfile(db, cliente.profile_id, { full_name: data.full_name }),
      ])
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id] }),
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      {/* Foto de perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto de Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{uploadingAvatar ? 'Enviando...' : 'Clique no ícone para alterar a foto'}</p>
              <p className="text-xs">JPG, PNG ou WebP · Máx. 2 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bloco 1: Dados pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input {...register('full_name')} />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Nome em Japonês (フリガナ)</Label>
            <Input {...register('nome_japones')} placeholder="カタカナ ou Kanji" />
          </div>
          <div className="space-y-2">
            <Label>Data de Nascimento</Label>
            <Input type="date" {...register('data_nascimento')} />
          </div>
          <div className="space-y-2">
            <Label>Nacionalidade</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register('nacionalidade')}
            >
              <option value="">Selecionar</option>
              {PAISES.map((p) => (
                <option key={p.code} value={p.nome}>
                  {p.flag} {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input {...register('cpf')} placeholder="000.000.000-00" />
            {errors.cpf && (
              <p className="text-xs text-destructive">{errors.cpf.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={cliente.profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Zairyu Card / Japanese ID</Label>
            <Input {...register('zairyu_card')} placeholder="Número do cartão" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Visto</Label>
            <Input {...register('visto_tipo')} placeholder="Ex: Cônjuge, Trabalho, Estudante..." />
          </div>
          <div className="space-y-2">
            <Label>Validade do Visto / Documento</Label>
            <Input type="date" {...register('visto_validade')} />
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Profissão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profissão / Trabalho</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de Trabalho</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register('profissao_tipo')}
            >
              <option value="">Selecionar</option>
              {profissaoOpcoes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {profissaoTipo && profissaoTipo !== 'nao_trabalha' && (
            <div className="space-y-2">
              <Label>Empreiteira / Fábrica / Empresa</Label>
              <Input
                {...register('profissao_empresa')}
                placeholder="Nome da empresa"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
          Salvar Alterações
        </Button>
      </div>
    </form>
  )
}
