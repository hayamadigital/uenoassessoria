const { test } = require('node:test')
const assert = require('node:assert/strict')
const { enforceRateLimit } = require('../lib/rate-limit')
const api = require('../lib/index')
const { getFirestore } = require('firebase-admin/firestore')

// Transaction double serializes commits; emulator integration is separate.
function counterStore() {
  const values = new Map()
  let queue = Promise.resolve()
  return {
    collection: () => ({ doc: (id) => id }),
    runTransaction(fn) {
      const run = queue.then(() => fn({
        get: async (key) => ({ data: () => values.get(key) }),
        set: (key, value) => values.set(key, value),
      }))
      queue = run.catch(() => {})
      return run
    },
  }
}
const request = (uid) => ({ auth: { uid, token: { role: 'cliente' } }, data: {} })

test('unauthenticated calls never access the counter', async () => {
  await assert.rejects(enforceRateLimit({}, {}, 'pdf', 5), { code: 'unauthenticated' })
})
test('parallel requests stop at the configured limit', async () => {
  const db = counterStore()
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => enforceRateLimit(db, request('a'), 'pdf', 5)))
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 5)
  for (const result of results.filter((r) => r.status === 'rejected')) {
    assert.equal(result.reason.code, 'resource-exhausted')
    assert.ok(result.reason.details.retryAfterSeconds > 0)
  }
})
test('users and operations have independent limits', async () => {
  const db = counterStore()
  await enforceRateLimit(db, request('a'), 'pdf', 1)
  await enforceRateLimit(db, request('b'), 'pdf', 1)
  await enforceRateLimit(db, request('a'), 'route', 1)
  await assert.rejects(enforceRateLimit(db, request('a'), 'pdf', 1), { code: 'resource-exhausted' })
})
test('expired windows accept new requests', async (t) => {
  let now = 1000
  t.mock.method(Date, 'now', () => now)
  const db = counterStore()
  await enforceRateLimit(db, request('a'), 'pdf', 1)
  now += 60_000
  await enforceRateLimit(db, request('a'), 'pdf', 1)
})
test('counter storage errors fail closed', async () => {
  const db = counterStore()
  db.runTransaction = async () => { throw new Error('offline') }
  await assert.rejects(enforceRateLimit(db, request('a'), 'pdf', 5), /offline/)
})

function mockDocuments(t, contract, assignedTo = 'teacher') {
  const db = getFirestore()
  t.mock.method(db, 'runTransaction', async () => {})
  t.mock.method(db, 'collection', (name) => ({
    doc: () => ({ get: async () => ({
      exists: name === 'contratos' ? !!contract : true,
      id: 'profile',
      data: () => name === 'contratos' ? contract : name === 'clientes' ? { profile_id: 'owner' } : { role: 'cliente', full_name: 'Cliente' },
    }) }),
    where: () => ({ get: async () => ({ docs: [{ data: () => ({ assigned_instrutor_id: assignedTo }) }] }) }),
  }))
}
test('missing and unauthorized contracts return the same error before exposing status', async (t) => {
  for (const contract of [null, { cliente_id: 'client', status: 'enviado' }, { cliente_id: 'client', status: 'assinado' }]) {
    mockDocuments(t, contract)
    await assert.rejects(api.generateContractPdf.run({ ...request('stranger'), data: { contrato_id: 'contract' } }), {
      code: 'permission-denied', message: 'Contrato indisponível',
    })
    t.mock.restoreAll()
  }
})
test('contract owner can receive the unsigned status', async (t) => {
  mockDocuments(t, { cliente_id: 'client', status: 'enviado' })
  await assert.rejects(api.generateContractPdf.run({ ...request('owner'), data: { contrato_id: 'contract' } }), { code: 'failed-precondition' })
})
test('instructors can resolve only assigned profiles', async (t) => {
  mockDocuments(t, null)
  const teacher = { auth: { uid: 'teacher', token: { role: 'instrutor' } }, data: { uid: 'profile' } }
  assert.equal((await api.getAssignedClientProfile.run(teacher)).full_name, 'Cliente')
  await assert.rejects(api.getAssignedClientProfile.run({ ...teacher, auth: { uid: 'other', token: { role: 'instrutor' } } }), { code: 'permission-denied' })
  await assert.rejects(api.getAssignedClientProfile.run({ ...request('owner'), data: { uid: 'profile' } }), { code: 'permission-denied' })
})

test('web errors retain actionable codes without exposing backend messages', () => {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  const ts = require('typescript')
  const vm = require('node:vm')
  const source = readFileSync(resolve(__dirname, '../../apps/web/src/lib/error-message.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const context = { exports: {} }
  vm.runInNewContext(compiled.outputText, context)
  const { safeErrorMessage } = context.exports
  assert.match(safeErrorMessage({ code: 'functions/resource-exhausted', message: 'secret' }), /Muitas solicitações/)
  assert.equal(safeErrorMessage({ code: 'internal', message: 'private-key index-url' }, 'Falha'), 'Falha')
  assert.equal(safeErrorMessage(new Error('secret'), 'Falha'), 'Falha')
  assert.equal(safeErrorMessage(null, 'Falha'), 'Falha')
})
