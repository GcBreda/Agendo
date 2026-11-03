// backend/test/infra.test.js
// Confere a base dos testes: o app sobe sem abrir a porta fixa e a trava do banco de teste funciona.

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const app = require('../src/app')
const { exigirBancoDeTeste, subirApp, encerrarConexoes } = require('./helpers/ambiente')

describe('app', () => {
  let servidor

  before(async () => { servidor = await subirApp(app) })
  after(async () => {
    await servidor.fechar()
    await encerrarConexoes()
  })

  test('GET /api/health responde ok', async () => {
    const res = await fetch(`${servidor.url}/api/health`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { status: 'ok' })
  })

  test('rota protegida sem token responde 401', async () => {
    const res = await fetch(`${servidor.url}/api/agendamentos`)
    assert.equal(res.status, 401)
  })
})

describe('exigirBancoDeTeste', () => {
  test('aceita banco terminado em _test', () => {
    assert.doesNotThrow(() => exigirBancoDeTeste('postgresql://u:p@localhost:5432/agendo_test'))
  })

  test('recusa o banco de desenvolvimento', () => {
    assert.throws(() => exigirBancoDeTeste('postgresql://u:p@localhost:5432/agendo_db'), /_test/)
  })

  test('recusa URL ausente', () => {
    assert.throws(() => exigirBancoDeTeste(undefined), /_test/)
  })

  test('a mensagem de erro não mostra a senha', () => {
    assert.throws(
      () => exigirBancoDeTeste('postgresql://u:SENHA_SECRETA@localhost:5432/agendo_db'),
      err => !err.message.includes('SENHA_SECRETA')
    )
  })
})
