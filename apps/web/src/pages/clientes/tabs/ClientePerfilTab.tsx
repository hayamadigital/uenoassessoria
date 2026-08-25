import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db } from '@/lib/firebase'
import { updateCliente } from '@ueno/firebase/queries/clientes'
import { clienteSchema, type ClienteInput } from '@ueno/utils/validators'
import { formatCPF } from '@ueno/utils/cpf'
import type { ClienteWithProfile } from '@ueno/firebase'

interface Context {
  cliente: ClienteWithProfile
}

export function ClientePerfilTab() {
  const { cliente } = useOutletContext<Context>()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      full_name: cliente.profile.full_name,
      email: cliente.profile.email,
      phone: cliente.profile.phone ?? '',
      cpf: cliente.cpf ?? '',
      data_nascimento: cliente.data_nascimento ?? '',
      endereco_jp: cliente.endereco_jp ?? '',
      cidade_jp: cliente.cidade_jp ?? '',
      cep_jp: cliente.cep_jp ?? '',
      cnh_numero: cliente.cnh_numero ?? '',
      cnh_categoria: cliente.cnh_categoria ?? '',
      cnh_validade: cliente.cnh_validade ?? '',
      cnh_estado_emissor: cliente.cnh_estado_emissor ?? '',
      data_entrada_japao: cliente.data_entrada_japao ?? '',
      visto_tipo: cliente.visto_tipo ?? '',
      observacoes: cliente.observacoes ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ClienteInput) =>
      updateCliente(db, cliente.id, {
        cpf: data.cpf || null,
        data_nascimento: data.data_nascimento || null,
        endereco_jp: data.endereco_jp || null,
        cidade_jp: data.cidade_jp || null,
        cep_jp: data.cep_jp || null,
        cnh_numero: data.cnh_numero || null,
        cnh_categoria: data.cnh_categoria || null,
        cnh_validade: data.cnh_validade || null,
        cnh_estado_emissor: data.cnh_estado_emissor || null,
        data_entrada_japao: data.data_entrada_japao || null,
        visto_tipo: data.visto_tipo || null,
        observacoes: data.observacoes || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes', cliente.id] }),
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input {...register('full_name')} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...register('email')} disabled />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input {...register('phone')} placeholder="+81 90 0000 0000" />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input {...register('cpf')} placeholder="000.000.000-00" />
            {errors.cpf ? <p className="text-xs text-destructive">{errors.cpf.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Data de Nascimento</Label>
            <Input type="date" {...register('data_nascimento')} />
          </div>
          <div className="space-y-2">
            <Label>Data de Entrada no Japão</Label>
            <Input type="date" {...register('data_entrada_japao')} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Visto</Label>
            <Input {...register('visto_tipo')} placeholder="Ex: Cônjuge, Trabalho..." />
          </div>
        </CardContent>
      </Card>

      {/* Japanese Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço no Japão</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Endereço completo em japonês</Label>
            <textarea
              {...register('endereco_jp')}
              className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ex: 愛知県名古屋市中区栄1丁目2-3 ○○マンション101"
            />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input {...register('cidade_jp')} />
          </div>
          <div className="space-y-2">
            <Label>CEP (〒)</Label>
            <Input {...register('cep_jp')} placeholder="000-0000" />
          </div>
        </CardContent>
      </Card>

      {/* CNH Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da CNH Brasileira</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Número da CNH</Label>
            <Input {...register('cnh_numero')} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input {...register('cnh_categoria')} placeholder="Ex: B, AB..." />
          </div>
          <div className="space-y-2">
            <Label>Validade</Label>
            <Input type="date" {...register('cnh_validade')} />
          </div>
          <div className="space-y-2">
            <Label>Estado Emissor</Label>
            <Input {...register('cnh_estado_emissor')} placeholder="Ex: SP, RJ..." />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            {...register('observacoes')}
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Observações internas sobre este cliente..."
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
