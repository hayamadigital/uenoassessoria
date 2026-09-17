const { test, before, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing')
const { doc, getDoc, setDoc, Timestamp } = require('firebase/firestore')
const { ref, uploadBytes, getBytes } = require('firebase/storage')
let env
before(async () => {
  // Must match the emulator's real project id (firebase.json has singleProjectMode: true):
  // storage.rules' firestore.get()/exists() cross-service bridge only resolves data written
  // under this exact project — a made-up projectId here silently breaks that bridge only,
  // even though pure-Firestore rule checks work fine with any projectId under this mode.
  env = await initializeTestEnvironment({ projectId: 'ueno-assessoria-475b9',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') },
  })
})
const future = () => Timestamp.fromDate(new Date(Date.now() + 86_400_000))
const past = () => Timestamp.fromDate(new Date(Date.now() - 86_400_000))
async function seed(overrides = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    for (const [path, data] of Object.entries({
      'users/owner': { full_name: 'Owner', role: 'cliente' },
      'users/admin': { full_name: 'Admin', role: 'admin' },
      'users/teacher': { full_name: 'Teacher', role: 'instrutor' },
      'clientes/client': { profile_id: 'owner' },
      'materiais/mat-1': { titulo: 'Material', is_public: true, is_active: true },
      'categorias_material/cat-1': { nome: 'Categoria', ordem: 1 },
      'simulado_config/mat-1': { total_questoes: 1 },
      'questoes/q-1': { enunciado: 'Pergunta?' },
      'servicos/serv-1': { nome: 'Serviço', is_active: true },
      'servico_variacoes/var-1': { servico_id: 'serv-1', ativo: true },
      ...overrides,
    })) await setDoc(doc(db, path), data)
    await uploadBytes(ref(ctx.storage(), 'materiais/public/thumb.png'), new Uint8Array([1]), { contentType: 'image/png' })
  })
}
beforeEach(async () => { await env.clearFirestore(); await env.clearStorage(); await seed() })
after(async () => { await env?.cleanup() })
const owner = () => env.authenticatedContext('owner', { role: 'cliente', email_verified: true })
const admin = () => env.authenticatedContext('admin', { role: 'admin' })
const teacher = () => env.authenticatedContext('teacher', { role: 'instrutor' })

async function grantEstudos(habilitado, expira_em = null) {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'acessos_clientes/owner'), {
      cliente_id: 'client',
      estudos: { habilitado, expira_em },
      catalogo: { habilitado: false, expira_em: null },
      revision: 1,
    }))
}
async function grantCatalogo(habilitado, expira_em = null) {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'acessos_clientes/owner'), {
      cliente_id: 'client',
      estudos: { habilitado: false, expira_em: null },
      catalogo: { habilitado, expira_em },
      revision: 1,
    }))
}
async function setGlobal(estudos_disponivel, catalogo_disponivel) {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'app_config/acessos'), { estudos_disponivel, catalogo_disponivel, revision: 1 }))
}

test('a client without any grant cannot read Estudos or Catálogo content; staff always can', async () => {
  await assertFails(getDoc(doc(owner().firestore(), 'materiais/mat-1')))
  await assertFails(getDoc(doc(owner().firestore(), 'categorias_material/cat-1')))
  await assertFails(getDoc(doc(owner().firestore(), 'simulado_config/mat-1')))
  await assertFails(getDoc(doc(owner().firestore(), 'questoes/q-1')))
  await assertFails(getDoc(doc(owner().firestore(), 'servicos/serv-1')))
  await assertFails(getDoc(doc(owner().firestore(), 'servico_variacoes/var-1')))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'materiais/mat-1')))
  await assertSucceeds(getDoc(doc(teacher().firestore(), 'materiais/mat-1')))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'servicos/serv-1')))
  await assertSucceeds(getDoc(doc(teacher().firestore(), 'servicos/serv-1')))
})
test('is_public no longer bypasses the Estudos grant', async () => {
  await assertFails(getDoc(doc(owner().firestore(), 'materiais/mat-1')))
})
test('a granted client reads Estudos content only when the module is also available globally', async () => {
  await grantEstudos(true)
  await assertFails(getDoc(doc(owner().firestore(), 'materiais/mat-1')))
  await setGlobal(true, false)
  await assertSucceeds(getDoc(doc(owner().firestore(), 'materiais/mat-1')))
  await assertSucceeds(getDoc(doc(owner().firestore(), 'categorias_material/cat-1')))
  await assertSucceeds(getDoc(doc(owner().firestore(), 'simulado_config/mat-1')))
  await assertSucceeds(getDoc(doc(owner().firestore(), 'questoes/q-1')))
  await assertFails(getDoc(doc(owner().firestore(), 'servicos/serv-1')))
})
test('a granted client reads Catálogo content only when the module is also available globally', async () => {
  await grantCatalogo(true)
  await assertFails(getDoc(doc(owner().firestore(), 'servicos/serv-1')))
  await setGlobal(false, true)
  await assertSucceeds(getDoc(doc(owner().firestore(), 'servicos/serv-1')))
  await assertSucceeds(getDoc(doc(owner().firestore(), 'servico_variacoes/var-1')))
  await assertFails(getDoc(doc(owner().firestore(), 'materiais/mat-1')))
})
test('an expired grant denies access even with the module available globally', async () => {
  await grantEstudos(true, past())
  await setGlobal(true, true)
  await assertFails(getDoc(doc(owner().firestore(), 'materiais/mat-1')))
})
test('a grant with a future expiration still grants access', async () => {
  await grantEstudos(true, future())
  await setGlobal(true, true)
  await assertSucceeds(getDoc(doc(owner().firestore(), 'materiais/mat-1')))
})
test('writes to gated content stay admin-only regardless of grant', async () => {
  await grantEstudos(true)
  await grantCatalogo(true)
  await setGlobal(true, true)
  await assertFails(setDoc(doc(owner().firestore(), 'materiais/mat-1'), { titulo: 'x' }, { merge: true }))
  await assertFails(setDoc(doc(owner().firestore(), 'servicos/serv-1'), { nome: 'x' }, { merge: true }))
  await assertSucceeds(setDoc(doc(admin().firestore(), 'materiais/mat-1'), { titulo: 'x' }, { merge: true }))
})

test('materiais Storage now requires the Estudos grant, including the former public/ path', async () => {
  await assertFails(getBytes(ref(owner().storage(), 'materiais/public/thumb.png')))
  await assertSucceeds(getBytes(ref(admin().storage(), 'materiais/public/thumb.png')))
  await assertSucceeds(getBytes(ref(teacher().storage(), 'materiais/public/thumb.png')))
  await grantEstudos(true)
  await setGlobal(true, false)
  await assertSucceeds(getBytes(ref(owner().storage(), 'materiais/public/thumb.png')))
})

const clienteProcessoPayload = (overrides = {}) => ({
  cliente_id: 'client',
  servico_id: 'serv-1',
  variacao_id: null,
  data_inicio: null,
  valor_acordado_jpy: null,
  status: 'analise',
  notas: null,
  servico_snapshot: {
    nome: 'Habilitação', descricao: null, duracao_min: 60, duracao_texto: null,
    preco_jpy: 50000, preco_variavel: false, preco_min_jpy: null, preco_max_jpy: null,
    usa_variacoes: false, imagem_url: null, is_active: true, ordem: 1,
    created_at: 'x', updated_at: 'x',
  },
  variacao_snapshot: null,
  created_at: 'x',
  updated_at: 'x',
  ...overrides,
})

test('a client can create their own cliente_processos with the full servico_snapshot, but not with extra fields', async () => {
  await assertSucceeds(setDoc(doc(owner().firestore(), 'cliente_processos/proc-1'), clienteProcessoPayload()))
  await assertFails(setDoc(
    doc(owner().firestore(), 'cliente_processos/proc-2'),
    clienteProcessoPayload({ campo_nao_permitido: true }),
  ))
})
test('a client keeps reading their own cliente_processos (with its embedded snapshot) without any Catálogo grant', async () => {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'cliente_processos/proc-1'), clienteProcessoPayload()))
  const snap = await assertSucceeds(getDoc(doc(owner().firestore(), 'cliente_processos/proc-1')))
  assert.equal(snap.data().servico_snapshot.nome, 'Habilitação')
})
