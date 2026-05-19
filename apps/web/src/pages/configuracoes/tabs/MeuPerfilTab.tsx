import { useRef, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { db, storage } from '@/lib/firebase'
import { uploadFile, avatarPath } from '@ueno/firebase/storage'
import { getProfile, updateProfile } from '@ueno/firebase/queries/perfis'
import { profileUpdateSchema, type ProfileUpdateInput } from '@ueno/utils/validators'
import { useAuthStore } from '@/stores/auth.store'

export function MeuPerfilTab() {
  const { session, setSession } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', session?.userId],
    queryFn: () => getProfile(db, session!.userId),
    enabled: !!session?.userId,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      whatsapp: '',
      preferred_lang: 'pt-BR',
      endereco_jp: '',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone ?? '',
        whatsapp: profile.whatsapp ?? '',
        preferred_lang: profile.preferred_lang as 'pt-BR' | 'en',
        endereco_jp: profile.endereco_jp ?? '',
      })
    }
  }, [profile, reset])

  const currentAvatar = avatarPreview ?? profile?.avatar_url

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return

    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)

    try {
      const ext = file.name.split('.').pop()
      const path = avatarPath(session.userId, `avatar.${ext}`)

      const publicUrl = await uploadFile(storage, path, file)

      await updateProfile(db, session.userId, { avatar_url: publicUrl })
      setSession({ ...session, avatarUrl: publicUrl })
      queryClient.invalidateQueries({ queryKey: ['profile', session.userId] })
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err)
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: ProfileUpdateInput) => {
      if (!session) throw new Error('Sessão inválida')
      const updatePayload = {
        full_name: data.full_name,
        preferred_lang: data.preferred_lang,
        phone: data.phone?.trim() ? data.phone : null,
        whatsapp: data.whatsapp?.trim() ? data.whatsapp : null,
        endereco_jp: data.endereco_jp?.trim() ? data.endereco_jp : null,
      }
      return updateProfile(db, session.userId, updatePayload)
    },
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile', session?.userId] })
      if (session) {
        setSession({ ...session, fullName: updatedProfile.full_name })
      }
      setSuccessMsg('Perfil atualizado com sucesso.')
      setTimeout(() => setSuccessMsg(null), 3000)
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  const preferredLang = watch('preferred_lang')

  return (
    <div className="max-w-2xl space-y-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto de Perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 transition-colors"
            >
              {uploadingAvatar ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium">Clique no ícone para alterar a foto</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WebP · Máx. 2 MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Dados */}
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register('email')} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input id="full_name" {...register('full_name')} />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...register('phone')} placeholder="+81 XX XXXX-XXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" {...register('whatsapp')} placeholder="+55 XX XXXXX-XXXX" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endereco_jp">Endereço no Japão</Label>
              <Input id="endereco_jp" {...register('endereco_jp')} />
            </div>
            <div className="space-y-1.5">
              <Label>Idioma do Perfil</Label>
              <Select
                value={preferredLang}
                onValueChange={(val: string) => setValue('preferred_lang', val as 'pt-BR' | 'en', { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center gap-4">
          <Button type="submit" isLoading={isSubmitting || mutation.isPending} disabled={!isDirty}>
            Salvar Alterações
          </Button>
          {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : 'Erro ao salvar'}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
