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
import { auth, db, storage } from '@/lib/firebase'
import { uploadFile, avatarPath } from '@ueno/firebase/storage'
import { updateCliente } from '@ueno/firebase/queries/clientes'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { dadosPessoaisSchema, type DadosPessoaisInput } from '@ueno/utils/validators'
import { PAISES } from '@/lib/paises'
import type { ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

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
      // As regras do Storage só deixam gravar em avatares/{uid do próprio usuário}; por isso a
      // foto enviada pelo admin fica na pasta do admin (mesmo padrão do app admin).
      const ownerUid = auth.currentUser?.uid ?? cliente.profile_id
      const path = avatarPath(ownerUid, `cliente-${cliente.profile_id}-avatar-${Date.now()}.${ext}`)

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
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DadosPessoaisInput>({
    resolver: zodResolver(dadosPessoaisSchema),
    defaultValues: {
      full_name: cliente.profile.full_name,
      nome_japones: cliente.nome_japones ?? '',
      data_nascimento: cliente.data_nascimento ?? '',
      nacionalidade: cliente.nacionalidade ?? '',
      data_entrada_japao: cliente.data_entrada_japao ?? '',
      observacoes_internas: cliente.observacoes_internas ?? cliente.observacoes ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: DadosPessoaisInput) => {
      await Promise.all([
        updateCliente(db, cliente.id, {
          nome_japones: data.nome_japones || null,
          nacionalidade: data.nacionalidade || null,
          data_nascimento: data.data_nascimento || null,
          data_entrada_japao: data.data_entrada_japao || null,
          observacoes_internas: data.observacoes_internas || null,
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
                <option key={p.code} value={p.code}>
                  {p.flag} {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={cliente.profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Data de Entrada no Japão</Label>
            <Input type="date" {...register('data_entrada_japao')} />
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Observações internas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações Internas</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            {...register('observacoes_internas')}
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Notas da assessoria sobre este cliente (não visíveis para o cliente)..."
          />
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
