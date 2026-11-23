// backend/test/pagamentos.test.js
// GET /api/pagamentos: só o paciente logado, e só os pagamentos dele.
// Antes, para quem não era paciente, o filtro virava undefined e a rota devolvia os pagamentos de todos.
//
// Roda sem PostgreSQL: usa o banco falso em memória (helpers/banco-falso.js), que ignora filtro
// undefined do mesmo jeito que o Prisma. Dados fictícios.

process.env.JWT_SECRET ||= 'segredo-ficticio-so-para-teste'

const { criarBancoFalso } = require('./helpers/banco-falso')

const pagamento = (id, pacienteId, dia) => ({
  id, pacienteId, valor: 180, metodo: 'PIX', status: 'APROVADO', criadoEm: new Date(`2026-${dia}T12:00:00Z`)
})
const banco = criarBancoFalso({
  usuarios: [
    { id: 'u-pac', perfil: 'PACIENTE', nome: 'Paciente Um', email: 'um@pagamentos.test' },
    { id: 'u-pac2', perfil: 'PACIENTE', nome: 'Paciente Dois', email: 'dois@pagamentos.test' },
    { id: 'u-pro', perfil: 'PROFISSIONAL', nome: 'Profissional', email: 'pro@pagamentos.test' },
    { id: 'u-sem', perfil: 'PACIENTE', nome: 'Sem cadastro', email: 'sem@pagamentos.test' }
  ],
  pacientes: [{ id: 'pac-1', usuarioId: 'u-pac' }, { id: 'pac-2', usuarioId: 'u-pac2' }],
  pagamentos: [pagamento('pg-1', 'pac-1', '11-10'), pagamento('pg-2', 'pac-2', '11-05'), pagamento('pg-3', 'pac-1', '10-10')]
})
globalThis.prisma = banco // src/prisma/client.js usa este banco no lugar do PostgreSQL

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const { subirApp, encerrarConexoes } = require('./helpers/ambiente')

describe('GET /api/pagamentos', () => {
  let servidor
  const pedir = quem => fetch(`${servidor.url}/api/pagamentos`, {
    headers: quem ? { Authorization: `Bearer ${jwt.sign({ id: quem }, process.env.JWT_SECRET)}` } : {}
  })

  before(async () => { servidor = await subirApp(app) })
  after(async () => {
    await servidor.fechar()
    await encerrarConexoes()
  })

  test('sem login: 401', async () => {
    assert.equal((await pedir()).status, 401)
  })

  test('profissional: 403, sem pagamento de ninguém (antes recebia os de todos os pacientes)', async () => {
    const res = await pedir('u-pro')
    assert.equal(res.status, 403)
    assert.equal((await res.json()).pagamentos, undefined)
  })

  test('paciente vê só os próprios, do mais novo para o mais antigo', async () => {
    const res = await pedir('u-pac')
    assert.equal(res.status, 200)
    assert.deepEqual((await res.json()).pagamentos.map(p => p.id), ['pg-1', 'pg-3'])
    assert.deepEqual((await (await pedir('u-pac2')).json()).pagamentos.map(p => p.id), ['pg-2'])
  })

  test('usuário de perfil paciente sem cadastro de paciente: 404, e não a lista de todos', async () => {
    const res = await pedir('u-sem')
    assert.equal(res.status, 404)
    assert.equal((await res.json()).pagamentos, undefined)
  })
})
