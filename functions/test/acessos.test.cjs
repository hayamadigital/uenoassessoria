const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Timestamp } = require('firebase-admin/firestore')
const {
  validateSetAcessoInput,
  validateSetAvailabilityInput,
  applySetClienteModuleAccess,
  applySetClientModuleAvailability,
} = require('../lib/acessos')

function store(seed = {}) {
  const values = new Map(Object.entries(seed))
  function snapshot(path) {
    const data = values.get(path)
    return { exists: data !== undefined, id: path.split('/').at(-1), data: () => data, ref: makeRef(path) }
  }
  function makeRef(path) {
    return {
      path,
      id: path.split('/').at(-1),
      get: async () => snapshot(path),
      set: async (v, options) => {
        values.set(path, options?.merge ? { ...(values.get(path) ?? {}), ...v } : v)
      },
      collection: (name) => makeCollection(`${path}/${name}`),
    }
  }
  function makeCollection(path) {
    return { doc: (id) => makeRef(`${path}/${id}`) }
  }
  const db = {
    collection: (name) => makeCollection(name),
    runTransaction: async (fn) => fn({
      get: (r) => r.get(),
      set: (r, v, options) => r.set(v, options),
    }),
  }
  return { db, values }
}

const validGrant = (overrides = {}) => ({
  cliente_id: 'client-1',
  modulo: 'estudos',
  habilitado: true,
  expira_em: null,
  motivo: 'Liberado a pedido do atendimento',
  expected_revision: 0,
  operation_id: 'op-aaaaaaaa',
  ...overrides,
})

const validAvailability = (overrides = {}) => ({
  modulo: 'estudos',
  disponivel: true,
  motivo: 'Habilitado após validação do fluxo completo',
  expected_revision: 0,
  operation_id: 'op-bbbbbbbb',
  ...overrides,
})

test('validateSetAcessoInput rejects malformed payloads', () => {
  assert.throws(() => validateSetAcessoInput({}), { code: 'invalid-argument' })
  assert.throws(() => validateSetAcessoInput(validGrant({ modulo: 'invalido' })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAcessoInput(validGrant({ motivo: 'oi' })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAcessoInput(validGrant({ expira_em: '2000-01-01T00:00:00.000Z' })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAcessoInput(validGrant({ habilitado: 'sim' })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAcessoInput(validGrant({ operation_id: 'short' })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAcessoInput(validGrant({ extra_field: 1 })), { code: 'invalid-argument' })
})
test('validateSetAcessoInput accepts a well-formed grant and trims strings', () => {
  const input = validateSetAcessoInput(validGrant({ motivo: '  Liberado a pedido do atendimento  ' }))
  assert.equal(input.modulo, 'estudos')
  assert.equal(input.expira_em, null)
  assert.equal(input.motivo, 'Liberado a pedido do atendimento')
})

test('validateSetAvailabilityInput rejects malformed payloads', () => {
  assert.throws(() => validateSetAvailabilityInput({}), { code: 'invalid-argument' })
  assert.throws(() => validateSetAvailabilityInput(validAvailability({ modulo: 'invalido' })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAvailabilityInput(validAvailability({ disponivel: 'sim' })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAvailabilityInput(validAvailability({ expected_revision: -1 })), { code: 'invalid-argument' })
  assert.throws(() => validateSetAvailabilityInput(validAvailability({ extra_field: 1 })), { code: 'invalid-argument' })
})

test('applySetClienteModuleAccess grants a module, audits it, and rejects a stale revision', async () => {
  const { db, values } = store({ 'clientes/client-1': { profile_id: 'uid-1' } })
  const input = validGrant()
  const result = await applySetClienteModuleAccess(db, input, 'admin-1')
  assert.equal(result.revision, 1)
  const acesso = values.get('acessos_clientes/uid-1')
  assert.equal(acesso.estudos.habilitado, true)
  assert.equal(acesso.revision, 1)
  assert.equal(acesso.updated_by, 'admin-1')
  const historico = values.get('acessos_clientes/uid-1/historico/op-aaaaaaaa')
  assert.equal(historico.motivo, input.motivo)
  assert.equal(historico.valores_anteriores, null)

  await assert.rejects(
    applySetClienteModuleAccess(db, validGrant({ operation_id: 'op-cccccccc' }), 'admin-1'),
    { code: 'aborted' },
  )
})
test('applySetClienteModuleAccess is idempotent for a repeated operation_id and rejects payload drift', async () => {
  const { db } = store({ 'clientes/client-1': { profile_id: 'uid-1' } })
  const input = validGrant()
  const first = await applySetClienteModuleAccess(db, input, 'admin-1')
  const second = await applySetClienteModuleAccess(db, input, 'admin-1')
  assert.equal(second.revision, first.revision)

  await assert.rejects(
    applySetClienteModuleAccess(db, { ...input, motivo: 'Motivo diferente do original' }, 'admin-1'),
    { code: 'already-exists' },
  )
})
test('applySetClienteModuleAccess rejects an unknown client', async () => {
  const { db } = store({})
  await assert.rejects(
    applySetClienteModuleAccess(db, validGrant({ cliente_id: 'nope' }), 'admin-1'),
    { code: 'not-found' },
  )
})
test('applySetClienteModuleAccess preserves the other module when granting one', async () => {
  const { db, values } = store({ 'clientes/client-1': { profile_id: 'uid-1' } })
  await applySetClienteModuleAccess(db, validGrant(), 'admin-1')
  await applySetClienteModuleAccess(
    db,
    validGrant({ modulo: 'catalogo', operation_id: 'op-dddddddd', expected_revision: 1 }),
    'admin-1',
  )
  const acesso = values.get('acessos_clientes/uid-1')
  assert.equal(acesso.estudos.habilitado, true)
  assert.equal(acesso.catalogo.habilitado, true)
})
test('applySetClienteModuleAccess initializes the sibling module on the very first grant', async () => {
  const { db, values } = store({ 'clientes/client-1': { profile_id: 'uid-1' } })
  await applySetClienteModuleAccess(db, validGrant(), 'admin-1')
  const acesso = values.get('acessos_clientes/uid-1')
  assert.deepEqual(acesso.catalogo, { habilitado: false, expira_em: null })
})
test('applySetClienteModuleAccess stores expira_em as a native Timestamp for rules to compare against request.time', async () => {
  const { db, values } = store({ 'clientes/client-1': { profile_id: 'uid-1' } })
  const futureIso = new Date(Date.now() + 86_400_000).toISOString()
  await applySetClienteModuleAccess(db, validGrant({ expira_em: futureIso }), 'admin-1')
  const acesso = values.get('acessos_clientes/uid-1')
  assert.ok(acesso.estudos.expira_em instanceof Timestamp)
  assert.equal(acesso.estudos.expira_em.toDate().toISOString(), futureIso)
})

test('applySetClientModuleAvailability toggles a module globally, audits it, and rejects a stale revision', async () => {
  const { db, values } = store({})
  const result = await applySetClientModuleAvailability(db, validAvailability(), 'admin-1')
  assert.equal(result.revision, 1)
  const config = values.get('app_config/acessos')
  assert.equal(config.estudos_disponivel, true)
  const historico = values.get('app_config/acessos/historico/op-bbbbbbbb')
  assert.equal(historico.valores_anteriores.disponivel, false)

  await assert.rejects(
    applySetClientModuleAvailability(db, validAvailability({ operation_id: 'op-eeeeeeee' }), 'admin-1'),
    { code: 'aborted' },
  )
})
test('applySetClientModuleAvailability is idempotent for a repeated operation_id and rejects payload drift', async () => {
  const { db } = store({})
  const input = validAvailability()
  const first = await applySetClientModuleAvailability(db, input, 'admin-1')
  const second = await applySetClientModuleAvailability(db, input, 'admin-1')
  assert.equal(second.revision, first.revision)

  await assert.rejects(
    applySetClientModuleAvailability(db, { ...input, disponivel: false }, 'admin-1'),
    { code: 'already-exists' },
  )
})
