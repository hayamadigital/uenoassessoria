const { test, before, beforeEach, after } = require('node:test')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing')
const { doc, setDoc, getDoc, getDocs, collection } = require('firebase/firestore')
let env
before(async () => {
  // Real project id (see acessos-content-rules.integration.cjs for why); `test:rules` runs
  // integration files with --test-concurrency=1 so sharing it across files is safe.
  env = await initializeTestEnvironment({ projectId: 'ueno-assessoria-475b9',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  })
})
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    for (const [path, data] of Object.entries({
      'users/owner': { full_name: 'Owner', role: 'cliente' },
      'users/other': { full_name: 'Other', role: 'cliente' },
      'users/admin': { full_name: 'Admin', role: 'admin' },
      'users/teacher': { full_name: 'Teacher', role: 'instrutor' },
      'clientes/client': { profile_id: 'owner' },
      'acessos_clientes/owner': { cliente_id: 'client', estudos: { habilitado: true, expira_em: null }, revision: 1 },
      'acessos_clientes/owner/historico/op-1': { modulo: 'estudos', motivo: 'Motivo interno não visível ao cliente' },
      'acessos_clientes/other': { cliente_id: 'other-client', estudos: { habilitado: false, expira_em: null }, revision: 0 },
      'app_config/acessos': { estudos_disponivel: true, catalogo_disponivel: false, revision: 1 },
      'app_config/acessos/historico/op-1': { modulo: 'estudos', motivo: 'Ligado para validar o fluxo' },
    })) await setDoc(doc(db, path), data)
  })
})
after(async () => { await env?.cleanup() })
const owner = () => env.authenticatedContext('owner', { role: 'cliente', email_verified: true })
const unverifiedOwner = () => env.authenticatedContext('owner', { role: 'cliente', email_verified: false })
const other = () => env.authenticatedContext('other', { role: 'cliente', email_verified: true })
const teacher = () => env.authenticatedContext('teacher', { role: 'instrutor' })
const admin = () => env.authenticatedContext('admin', { role: 'admin' })

test('a verified client reads only their own grant document, never another client\'s', async () => {
  await assertSucceeds(getDoc(doc(owner().firestore(), 'acessos_clientes/owner')))
  await assertFails(getDoc(doc(owner().firestore(), 'acessos_clientes/other')))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'acessos_clientes/other')))
})
test('nobody can write acessos_clientes directly through the client SDK, including admins', async () => {
  await assertFails(setDoc(doc(owner().firestore(), 'acessos_clientes/owner'), { estudos: { habilitado: true } }, { merge: true }))
  await assertFails(setDoc(doc(admin().firestore(), 'acessos_clientes/owner'), { estudos: { habilitado: true } }, { merge: true }))
})
test('only admins read the per-client audit trail; the client cannot see their own motivo', async () => {
  await assertFails(getDoc(doc(owner().firestore(), 'acessos_clientes/owner/historico/op-1')))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'acessos_clientes/owner/historico/op-1')))
})
test('a verified client cannot list other clients\' grants', async () => {
  await assertFails(getDocs(collection(owner().firestore(), 'acessos_clientes')))
  await assertSucceeds(getDocs(collection(admin().firestore(), 'acessos_clientes')))
})

test('app_config/acessos is readable by verified clients and staff, not by an unverified client', async () => {
  await assertSucceeds(getDoc(doc(owner().firestore(), 'app_config/acessos')))
  await assertSucceeds(getDoc(doc(teacher().firestore(), 'app_config/acessos')))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'app_config/acessos')))
  await assertFails(getDoc(doc(unverifiedOwner().firestore(), 'app_config/acessos')))
})
test('app_config/acessos cannot be written directly, even by an admin: only the callable can', async () => {
  await assertFails(setDoc(doc(admin().firestore(), 'app_config/acessos'), { estudos_disponivel: false }, { merge: true }))
})
test('only admins read the global-availability audit trail', async () => {
  await assertFails(getDoc(doc(owner().firestore(), 'app_config/acessos/historico/op-1')))
  await assertFails(getDoc(doc(teacher().firestore(), 'app_config/acessos/historico/op-1')))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'app_config/acessos/historico/op-1')))
})
test('app_config/public keeps its existing public read and admin-only write behavior', async () => {
  await assertSucceeds(getDoc(doc(other().firestore(), 'app_config/public')))
  await assertFails(setDoc(doc(other().firestore(), 'app_config/public'), { support_whatsapp: '123' }, { merge: true }))
  await assertSucceeds(setDoc(doc(admin().firestore(), 'app_config/public'), { support_whatsapp: '123' }, { merge: true }))
})
