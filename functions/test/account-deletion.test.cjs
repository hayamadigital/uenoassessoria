const { test } = require('node:test')
const assert = require('node:assert/strict')
const { requireRecentLogin, retentionInput, validReceipt, hashReceipt, requestDeletion, processDeletion } = require('../lib/account-deletion')
const { enforceRateLimit } = require('../lib/rate-limit')
const req = (data = {}, age = 0) => ({ auth: { uid: 'owner', token: { email: 'owner@example.test', auth_time: Math.floor(Date.now() / 1000) - age } }, data: { confirmation: 'EXCLUIR', ...data } })

test('deletion requires authenticated recent login and explicit confirmation', () => {
  assert.throws(() => requireRecentLogin({}), { code: 'unauthenticated' })
  assert.throws(() => requireRecentLogin(req({}, 301)), { code: 'failed-precondition' })
  assert.throws(() => requireRecentLogin(req({ confirmation: 'yes' })), { code: 'invalid-argument' })
  assert.equal(requireRecentLogin(req({ uid: 'someone-else' })), 'owner')
})
test('receipt secrets are validated without exposing another account status', () => {
  const token = 'a'.repeat(64)
  assert.equal(validReceipt(token, hashReceipt(token)), true)
  assert.equal(validReceipt('b'.repeat(64), hashReceipt(token)), false)
  assert.equal(validReceipt(null, null), false)
  assert.equal(validReceipt('short', hashReceipt(token)), false)
})
test('retention requires an explicit obligation and future disposal date', () => {
  assert.equal(retentionInput({}), null)
  assert.throws(() => retentionInput({ retain_business_records: true }), { code: 'invalid-argument' })
  assert.throws(() => retentionInput({ retain_business_records: true, retention_reason: 'Documentos fiscais obrigatórios', retention_until: '2000-01-01' }), { code: 'invalid-argument' })
})

function store(seed) {
  const values = new Map(Object.entries(seed))
  function ref(path) {
    return { path, id: path.split('/').at(-1), parent: { id: path.split('/').at(-2) },
      get: async () => snapshot(path),
      set: async (v, options) => { values.set(path, options?.merge ? { ...values.get(path), ...v } : v) },
      update: async v => { if (!values.has(path)) throw new Error('missing ' + path); values.set(path, { ...values.get(path), ...v }) },
      delete: async () => { values.delete(path) },
      collection: name => query(path + '/' + name),
      listCollections: async () => [...new Set([...values.keys()].filter(k => k.startsWith(path + '/')).map(k => k.slice(path.length + 1).split('/')[0]))].map(n => query(path + '/' + n)),
    }
  }
  function snapshot(path) { return { exists: values.has(path), id: path.split('/').at(-1), data: () => values.get(path), ref: ref(path) } }
  function query(path, filters = [], max = Infinity, group = false) {
    return {
      doc: id => ref(path + '/' + id),
      where: (field, op, value) => { assert.equal(op, '=='); return query(path, [...filters, [field, value]], max, group) },
      limit: n => query(path, filters, n, group),
      get: async () => {
        const docs = [...values.keys()].filter(k => (group ? k.split('/').at(-2) === path : k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1) && filters.every(([f, v]) => values.get(k)[f] === v)).slice(0, max).map(snapshot)
        return { docs, empty: !docs.length }
      },
    }
  }
  const db = { doc: ref, collection: name => query(name), collectionGroup: name => query(name, [], Infinity, true),
    recursiveDelete: async r => { for (const k of values.keys()) if (k === r.path || k.startsWith(r.path + '/')) values.delete(k) },
    runTransaction: async fn => fn({ get: r => r.get(), set: (r, v) => r.set(v), update: (r, v) => r.update(v) }),
  }
  return { db, values }
}
function seed() {
  return {
    'account_deletions/owner': { status: 'pending', name: 'Owner', email: 'owner@example.test', receipt_hash: hashReceipt('a'.repeat(64)) },
    'users/owner': { full_name: 'Owner' }, 'users/other': { full_name: 'Other' },
    'clientes/client': { profile_id: 'owner', cpf: '123' },
    'clientes/other-client': { profile_id: 'other' },
    'clientes/client/contatos/contact': { phone: '123' },
    'contratos/signed': { cliente_id: 'client', status: 'assinado' },
    'contratos/draft': { cliente_id: 'client', status: 'rascunho' },
    'pagamentos/payment': { cliente_id: 'client' }, 'pagamentos/payment/parcelas/one': { value: 12 },
    'cliente_processos/process': { cliente_id: 'client' }, 'processo_etapas/step': { processo_id: 'process' },
    'simulado_resultados/legacy': { cliente_id: 'owner' }, 'simulado_resultados/current': { cliente_id: 'client' },
    'rotas_dia/shared/paradas/stop': { cliente_id: 'client' },
    'notificacoes/notification': { destinatario_id: 'owner' }, 'push_tokens/token': { profile_id: 'owner' },
  }
}
function services(failOnce = false) {
  const files = new Set(['avatares/owner/photo.jpg', 'documentos/client/passport.pdf', 'comprovantes/payment/file.pdf', 'contratos/client/signed/file.pdf', 'contratos/client/draft/file.pdf', 'avatares/other/photo.jpg'])
  const deletedUsers = [], metadata = []
  const file = name => ({ name,
    copy: async (target, options) => { if (failOnce) { failOnce = false; throw new Error('copy failed') }; metadata.push([target.name, options]); files.add(target.name) },
    setMetadata: async data => { metadata.push([name, data]) },
    delete: async () => { files.delete(name) },
  })
  return { files, deletedUsers, metadata,
    auth: { updateUser: async () => {}, revokeRefreshTokens: async () => {}, deleteUser: async uid => { deletedUsers.push(uid) } },
    storage: { bucket: () => ({ file, getFilesStream: ({ prefix }) => (async function* () { for (const name of [...files].filter(n => n.startsWith(prefix))) yield file(name) })() }) },
  }
}
test('request ignores a supplied target uid and preserves the original deadline on retry', async () => {
  const { db, values } = store({ 'users/owner': { full_name: 'Owner' } })
  const first = await requestDeletion(db, req({ uid: 'other' }))
  const when = values.get('account_deletions/owner').requested_at
  const second = await requestDeletion(db, req())
  assert.equal(first.id, 'owner'); assert.equal(second.id, 'owner')
  assert.equal(values.get('account_deletions/owner').requested_at, when)
  assert.equal(validReceipt(second.receipt, values.get('account_deletions/owner').receipt_hash), true)
  values.get('account_deletions/owner').status = 'processing'
  await assert.rejects(requestDeletion(db, req()), { code: 'failed-precondition' })
})
test('full deletion removes children, legacy results and files without touching another account', async () => {
  const { db, values } = store(seed()), svc = services()
  await processDeletion(db, svc.auth, svc.storage, 'owner', null)
  assert.deepEqual([...values.keys()].sort(), ['account_deletions/owner', 'clientes/other-client', 'users/other'].sort())
  assert.deepEqual([...svc.files], ['avatares/other/photo.jpg'])
  assert.deepEqual(svc.deletedUsers, ['owner'])
  const receipt = values.get('account_deletions/owner')
  assert.equal(receipt.status, 'completed'); assert.equal(receipt.name, undefined); assert.equal(receipt.email, undefined)
  await processDeletion(db, svc.auth, svc.storage, 'owner', null)
  assert.deepEqual(svc.deletedUsers, ['owner'])
})
test('full deletion also removes the client\'s module-access grant and its audit trail', async () => {
  const { db, values } = store({
    ...seed(),
    'acessos_clientes/owner': { cliente_id: 'client', estudos: { habilitado: true, expira_em: null }, revision: 1 },
    'acessos_clientes/owner/historico/op-1': { modulo: 'estudos', motivo: 'Teste' },
    'acessos_clientes/other': { cliente_id: 'other-client', estudos: { habilitado: true, expira_em: null }, revision: 1 },
  })
  const svc = services()
  await processDeletion(db, svc.auth, svc.storage, 'owner', null)
  assert.equal(values.has('acessos_clientes/owner'), false)
  assert.equal(values.has('acessos_clientes/owner/historico/op-1'), false)
  assert.equal(values.has('acessos_clientes/other'), true)
})
test('retention archives only signed contracts and finance and resumes after storage failure', async () => {
  const { db, values } = store(seed()), svc = services(true)
  const policy = { reason: 'Obrigação fiscal documentada', until: '2030-01-01T00:00:00.000Z' }
  await assert.rejects(processDeletion(db, svc.auth, svc.storage, 'owner', policy), /copy failed/)
  assert.equal(values.get('account_deletions/owner').status, 'processing')
  assert.equal(values.has('users/owner'), true)
  await processDeletion(db, svc.auth, svc.storage, 'owner', null)
  assert.equal(values.get('account_deletions/owner').retention.reason, policy.reason)
  const archived = [...values].filter(([k]) => k.includes('/records/')).map(([,v]) => v.original_path).filter(Boolean)
  assert.ok(archived.includes('contratos/signed')); assert.ok(archived.includes('pagamentos/payment/parcelas/one'))
  assert.ok(!archived.includes('contratos/draft'))
  assert.ok(svc.files.has('retained-accounts/owner/contratos/client/signed/file.pdf'))
  assert.ok(!svc.files.has('retained-accounts/owner/contratos/client/draft/file.pdf'))
  assert.ok(svc.metadata.every(([, data]) => data.metadata.firebaseStorageDownloadTokens === null))
})
test('a stale authenticated token cannot call functions while deletion is processing', async () => {
  const { db } = store(seed())
  await db.doc('account_deletions/owner').update({ status: 'processing' })
  await assert.rejects(enforceRateLimit(db, req(), 'createCliente', 20), { code: 'permission-denied' })
})

test('only an administrator can complete a deletion request', async () => {
  const api = require('../lib/index')
  await assert.rejects(api.completeAccountDeletion.run({ data: { uid: 'owner', confirmation: 'EXCLUIR' } }), { code: 'unauthenticated' })
  await assert.rejects(api.completeAccountDeletion.run(req({ uid: 'other' })), { code: 'permission-denied' })
})
