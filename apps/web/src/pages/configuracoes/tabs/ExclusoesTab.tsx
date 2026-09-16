import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'

type Request = { id: string; name: string; email: string; requested_at: string; status: string }
function DeletionRow({ item, onComplete }: { item: Request; onComplete: () => Promise<unknown> }) {
  const [retain, setRetain] = useState(false)
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function complete() {
    if (busy || confirmation !== 'EXCLUIR') return
    setBusy(true); setError('')
    try {
      await httpsCallable(functions, 'completeAccountDeletion', { timeout: 540000 })({
        uid: item.id, confirmation, retain_business_records: retain,
        retention_reason: reason, retention_until: until ? new Date(`${until}T23:59:59+09:00`).toISOString() : null,
      })
      await onComplete()
    } catch (e) {
      const code = (e as { code?: string }).code
      setError(code === 'functions.aborted' ? 'A exclusão já está em andamento. Aguarde antes de tentar novamente.' : 'Não foi possível concluir. Confira a retenção e tente novamente. Falhas parciais podem ser retomadas com segurança.')
    } finally { setBusy(false) }
  }
  const overdue = Date.now() - new Date(item.requested_at).getTime() > 30 * 86400000
  return <section className="rounded-xl border bg-white p-5 space-y-3">
    <h3 className="font-semibold">{item.name || 'Conta'} — {item.email}</h3>
    <p className={overdue ? 'text-red-700' : 'text-sm text-muted-foreground'}>Solicitada em {new Date(item.requested_at).toLocaleDateString('pt-BR')} · {item.status === 'processing' ? 'Processamento iniciado' : 'Pendente'}{overdue ? ' · Prazo vencido' : ''}</p>
    {item.status === 'processing' ? <p className="text-sm">A retenção já foi definida no início. Retomar mantém a decisão registrada.</p> : <>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={retain} onChange={e => setRetain(e.target.checked)} />Há obrigação de preservar contratos assinados e registros financeiros</label>
      {retain ? <div className="space-y-2">
        <label className="block">Obrigação e justificativa<textarea className="block border rounded p-2 w-full" value={reason} onChange={e => setReason(e.target.value)} minLength={20} maxLength={2000} /></label>
        <label className="block">Data limite de retenção<input type="date" className="block border rounded p-2" value={until} onChange={e => setUntil(e.target.value)} /></label>
        <p className="text-sm">Os registros serão movidos para um arquivo restrito e descartados automaticamente após essa data. Informe somente retenções obrigatórias, pois a justificativa será apresentada ao titular.</p>
      </div> : <p className="text-sm">Sem retenção, contratos, pagamentos e comprovantes também serão apagados definitivamente.</p>}
    </>}
    <label className="block">Digite EXCLUIR para confirmar<input className="block border rounded p-2" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" /></label>
    {error ? <p role="alert" className="text-red-700">{error}</p> : null}
    <button className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy || confirmation !== 'EXCLUIR' || (item.status !== 'processing' && retain && (!until || reason.trim().length < 20))} onClick={() => { void complete() }}>{busy ? 'Excluindo… aguarde' : item.status === 'processing' ? 'Retomar exclusão' : 'Excluir conta e dados'}</button>
  </section>
}
export function ExclusoesTab() {
  const cache = useQueryClient()
  const result = useQuery({ queryKey: ['account-deletions'], queryFn: async () => {
    const snap = await getDocs(query(collection(db, 'account_deletions'), where('status', 'in', ['pending', 'processing']), orderBy('requested_at')))
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Request)
  } })
  return <div className="space-y-5 max-w-3xl"><h2 className="text-xl font-semibold">Exclusões de conta</h2>
    <p>Conclua as solicitações em até 30 dias. O titular acompanha o resultado pelo app. Verifique a obrigação e o prazo de retenção antes de excluir dados.</p>
    <button className="underline" onClick={() => { void result.refetch() }}>Atualizar solicitações</button>
    {result.isLoading ? <p>Carregando…</p> : result.isError ? <p role="alert">Não foi possível carregar as solicitações.</p> : result.data?.length === 0 ? <p>Nenhuma solicitação pendente.</p> : result.data?.map(item => <DeletionRow key={item.id} item={item} onComplete={() => cache.invalidateQueries({ queryKey: ['account-deletions'] })} />)}
  </div>
}
