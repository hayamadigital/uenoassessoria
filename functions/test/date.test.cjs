const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseDateInput } = require('../lib/date')

// Espelha packages/utils/src/date.test.ts — as duas cópias de parseDateInput
// (app e functions) precisam se comportar igual; ver comentário em functions/src/date.ts.

test('parseDateInput normaliza DD/MM/AAAA para ISO', () => {
  assert.equal(parseDateInput('25/02/1981'), '1981-02-25')
  assert.equal(parseDateInput('01/01/2000'), '2000-01-01')
  assert.equal(parseDateInput('29/02/2020'), '2020-02-29')
  assert.equal(parseDateInput('  25/02/1981  '), '1981-02-25')
})

test('parseDateInput aceita ISO e devolve como está', () => {
  assert.equal(parseDateInput('1981-02-25'), '1981-02-25')
  assert.equal(parseDateInput('2020-02-29'), '2020-02-29')
})

test('parseDateInput rejeita datas que não existem no calendário', () => {
  assert.equal(parseDateInput('31/02/2020'), null)
  assert.equal(parseDateInput('29/02/2021'), null)
  assert.equal(parseDateInput('01/13/2020'), null)
  assert.equal(parseDateInput('2020-02-31'), null)
})

test('parseDateInput devolve null para vazio, lixo e tipo errado', () => {
  assert.equal(parseDateInput(''), null)
  assert.equal(parseDateInput('25/02/81'), null)
  assert.equal(parseDateInput('abc'), null)
  assert.equal(parseDateInput(null), null)
  assert.equal(parseDateInput(42), null)
  assert.equal(parseDateInput('1981-02-25T00:00:00Z'), null)
})
