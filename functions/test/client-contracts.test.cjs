const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function loadQuery(records) {
  let captured
  const sdk = {
    collection: (_, name) => name,
    where: (field, op, value) => ({ field, op, value }),
    orderBy: (field) => ({ orderBy: field }),
    query: (collection, ...constraints) => ({ collection, constraints }),
    getDocs: async (query) => {
      captured = query
      return { docs: records.map((record) => ({ id: record.id, data: () => record })) }
    },
  }
  const source = readFileSync(resolve(__dirname, '../../packages/firebase/src/queries/contratos.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const context = { exports: {}, require: (name) => name === 'firebase/firestore' ? sdk : {} }
  vm.runInNewContext(compiled.outputText, context)
  return { query: context.exports.listContratosByProcesso, captured: () => captured }
}

test('consulta de cliente restringe a leitura ao proprietário antes de filtrar o processo', async () => {
  const harness = loadQuery([
    { id: 'new', processo_id: 'process', aditivo_de: null, created_at: '2026-09-02' },
    { id: 'other-process', processo_id: 'other', aditivo_de: null, created_at: '2026-09-01' },
    { id: 'addendum', processo_id: 'process', aditivo_de: 'old', created_at: '2026-09-03' },
    { id: 'old', processo_id: 'process', aditivo_de: null, created_at: '2026-09-01' },
  ])
  const result = await harness.query({}, 'process', 'owner')
  const constraints = JSON.parse(JSON.stringify(harness.captured().constraints))
  assert.deepEqual(constraints, [{ field: 'cliente_id', op: '==', value: 'owner' }])
  assert.equal(Array.from(result, (x) => x.id).join(','), 'old,new')
})

test('consulta administrativa existente continua filtrando por processo', async () => {
  const harness = loadQuery([])
  await harness.query({}, 'process')
  const constraints = JSON.parse(JSON.stringify(harness.captured().constraints))
  assert.deepEqual(constraints, [
    { field: 'processo_id', op: '==', value: 'process' },
    { field: 'aditivo_de', op: '==', value: null },
    { orderBy: 'created_at' },
  ])
})
