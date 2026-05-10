import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PAISES } from '@/lib/paises'
import { novoClienteSchema, type NovoClienteInput } from '@ueno/utils/validators'

export function NovoClientePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NovoClienteInput>({
    resolver: zodResolver(novoClienteSchema),
    defaultValues: {
      whatsapp_ddi: '+55',
    },
  })

  const ddiValue = watch('whatsapp_ddi')

  async function onSubmit(data: NovoClienteInput) {
    setServerError(null)
    try {
      const whatsapp =
        data.whatsapp_numero
          ? `${data.whatsapp_ddi ?? '+55'} ${data.whatsapp_numero}`
          : undefined

      const createCliente = httpsCallable<
        { full_name: string; email: string; whatsapp?: string; nacionalidade?: string },
        { clienteId: string; whatsapp_url?: string }
      >(getFunctions(), 'createCliente')

      const { data: respData } = await createCliente({
        full_name: data.full_name,
        email: data.email,
        whatsapp,
        nacionalidade: data.nacionalidade,
      })

      if (respData.whatsapp_url) {
        window.open(respData.whatsapp_url, '_blank', 'noopener,noreferrer')
      }

      await queryClient.invalidateQueries({ queryKey: ['clientes'] })
      navigate(`/clientes/${respData.clienteId}/processo`)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar cliente')
    }
  }

  return (
    <div>
      <PageHeader title="Novo Cliente" subtitle="Preencha os dados básicos para cadastrar o cliente" />

      <div className="px-8 pt-4">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar para Clientes
        </Link>
      </div>

      <div className="p-8 max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nome Completo */}
              <div className="space-y-2">
                <Label>
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input {...register('full_name')} placeholder="Nome e sobrenome" />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <div className="flex gap-2">
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={ddiValue}
                    onChange={(e) => setValue('whatsapp_ddi', e.target.value)}
                  >
                    {PAISES.map((p) => (
                      <option key={p.code} value={p.ddi}>
                        {p.flag} {p.ddi}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="flex-1"
                    {...register('whatsapp_numero')}
                    placeholder="90 0000-0000"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Se informado, as credenciais serão enviadas via WhatsApp ao cadastrar.
                </p>
              </div>

              {/* Nacionalidade */}
              <div className="space-y-2">
                <Label>Nacionalidade</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('nacionalidade')}
                >
                  <option value="">Selecionar país</option>
                  {PAISES.map((p) => (
                    <option key={p.code} value={p.nome}>
                      {p.flag} {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Server Error */}
              {serverError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 mt-4">
            <Link to="/clientes">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>
              Cadastrar Cliente
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
